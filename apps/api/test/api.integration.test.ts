import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { after, before, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io, type Socket } from 'socket.io-client';

const apiDirectory = fileURLToPath(new URL('..', import.meta.url));
const testSecret = 'api-integration-test-secret-with-sufficient-length';
const allowedOrigin = 'http://localhost:5180';
let baseUrl = '';
let child: ChildProcess | undefined;
let databaseDirectory = '';
let eventSocket: Socket | undefined;
let childOutput = '';

async function getAvailablePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('No se pudo reservar un puerto.');
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function waitForApi(process: ChildProcess, url: string): Promise<void> {
  const deadline = Date.now() + 12_000;
  let lastError = '';
  while (Date.now() < deadline) {
    if (process.exitCode !== null)
      throw new Error(`La API terminó al iniciar (código ${process.exitCode}). ${childOutput}`);
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError =
        error instanceof Error
          ? `${error.message} (${JSON.stringify((error as Error & { cause?: unknown }).cause)})`
          : String(error);
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.kill();
  throw new Error(`La API de integración no respondió a tiempo: ${lastError}. ${childOutput}`);
}

function waitForSocketEvent<T = unknown>(socket: Socket, eventName: string, timeoutMs = 5_000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handleEvent);
      reject(new Error(`Socket.IO no emitió ${eventName} dentro del tiempo esperado.`));
    }, timeoutMs);
    const handleEvent = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(eventName, handleEvent);
  });
}

async function openSocket(cookie?: string): Promise<Socket> {
  const socket = io(baseUrl, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: cookie ? { Cookie: cookie } : undefined,
  });
  const connected = waitForSocketEvent(socket, 'connect');
  socket.connect();
  await connected;
  return socket;
}

before(async () => {
  databaseDirectory = await mkdtemp(path.join(os.tmpdir(), 'ifx-vm-api-test-'));
  const port = await getAvailablePort();
  baseUrl = `http://localhost:${port}`;
  child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    cwd: apiDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      JWT_SECRET: testSecret,
      COOKIE_SECURE: 'false',
      WEB_ORIGIN: allowedOrigin,
      DATABASE_PATH: path.join(databaseDirectory, 'integration.sqlite'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => (childOutput += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (childOutput += chunk.toString()));
  await waitForApi(child, baseUrl);
});

after(async () => {
  eventSocket?.close();
  if (child && child.exitCode === null) {
    child.kill();
    await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 3_000))]);
  }
  if (databaseDirectory) await rm(databaseDirectory, { recursive: true, force: true });
});

test('API, autorización, validación y Socket.IO', async (suite) => {
  let adminCookie = '';
  let clientCookie = '';
  let createdVmId = '';
  let adminSocket: Socket | undefined;

  await suite.test(
    'health es público y las rutas privadas rechazan sesiones ausentes o inválidas',
    async () => {
      const health = await fetch(`${baseUrl}/api/health`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { status: 'ok' });

      const anonymous = await fetch(`${baseUrl}/api/vms`);
      assert.equal(anonymous.status, 401);

      const invalidSession = await fetch(`${baseUrl}/api/me`, {
        headers: { Cookie: 'ifx_session=invalid-token' },
      });
      assert.equal(invalidSession.status, 401);
      assert.match(invalidSession.headers.get('set-cookie') ?? '', /ifx_session=;/);
    },
  );

  await suite.test('login valida entradas, protege la cookie y nunca devuelve el JWT', async () => {
    const malformed = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '' }),
    });
    assert.equal(malformed.status, 400);

    const rejected = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ifx.test', password: 'incorrecta' }),
    });
    assert.equal(rejected.status, 401);

    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ifx.test', password: 'Admin123!' }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.role, 'admin');
    assert.equal('token' in body, false);
    const setCookie = response.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.doesNotMatch(setCookie, /; Secure/i);
    adminCookie = setCookie.split(';')[0];
    assert.ok(adminCookie.startsWith('ifx_session='));

    const me = await fetch(`${baseUrl}/api/me`, { headers: { Cookie: adminCookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.email, 'admin@ifx.test');
  });

  await suite.test(
    'validación de esquema rechaza datos fuera de rango y payloads de inyección',
    async () => {
      const invalidVm = await fetch(`${baseUrl}/api/vms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          name: 'VM válida',
          cores: 0,
          ram: 8,
          disk: 50,
          os: 'Ubuntu 24.04',
          status: 'running',
        }),
      });
      assert.equal(invalidVm.status, 400);

      const injectionLikeName = await fetch(`${baseUrl}/api/vms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          name: "' OR 1=1 --",
          cores: 2,
          ram: 4,
          disk: 50,
          os: 'Ubuntu 24.04',
          status: 'running',
        }),
      });
      assert.equal(injectionLikeName.status, 400);
    },
  );

  await suite.test('Cliente consulta, pero la API bloquea todas sus mutaciones', async () => {
    const login = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client@ifx.test', password: 'Client123!' }),
    });
    assert.equal(login.status, 200);
    clientCookie = (login.headers.get('set-cookie') ?? '').split(';')[0];

    const list = await fetch(`${baseUrl}/api/vms`, { headers: { Cookie: clientCookie } });
    assert.equal(list.status, 200);
    assert.equal(Array.isArray((await list.json()).vms), true);

    const payload = JSON.stringify({
      name: 'Role Test VM',
      cores: 2,
      ram: 4,
      disk: 50,
      os: 'Debian 12',
      status: 'running',
    });
    const headers = { 'Content-Type': 'application/json', Cookie: clientCookie };
    const create = await fetch(`${baseUrl}/api/vms`, { method: 'POST', headers, body: payload });
    const update = await fetch(`${baseUrl}/api/vms/vm-prod-01`, {
      method: 'PUT',
      headers,
      body: payload,
    });
    const remove = await fetch(`${baseUrl}/api/vms/vm-prod-01`, { method: 'DELETE', headers });
    assert.equal(create.status, 403);
    assert.equal(update.status, 403);
    assert.equal(remove.status, 403);
  });

  await suite.test('Socket.IO exige sesión válida y propaga los tres eventos CRUD', async () => {
    const anonymousSocket = io(baseUrl, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: false,
    });
    const rejected = waitForSocketEvent<{ message: string }>(anonymousSocket, 'connect_error');
    anonymousSocket.connect();
    assert.match((await rejected).message, /unauthorized/i);
    anonymousSocket.close();

    adminSocket = await openSocket(adminCookie);
    eventSocket = adminSocket;

    const vmInput = {
      name: 'Integration Socket VM',
      cores: 2,
      ram: 4,
      disk: 80,
      os: 'Ubuntu 24.04 LTS',
      status: 'running',
    };
    const createdEvent = waitForSocketEvent<{ id: string }>(adminSocket, 'vm:created');
    const createResponse = await fetch(`${baseUrl}/api/vms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify(vmInput),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    const createdSocketVm = await createdEvent;
    createdVmId = created.vm.id;
    assert.equal(createdSocketVm.id, createdVmId);

    const updatedEvent = waitForSocketEvent<{ id: string; ram: number }>(adminSocket, 'vm:updated');
    const updateResponse = await fetch(`${baseUrl}/api/vms/${createdVmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ ...vmInput, ram: 8 }),
    });
    assert.equal(updateResponse.status, 200);
    const updatedBody = await updateResponse.json();
    assert.deepEqual(await updatedEvent, updatedBody.vm);

    const deletedEvent = waitForSocketEvent<{ id: string }>(adminSocket, 'vm:deleted');
    const deleteResponse = await fetch(`${baseUrl}/api/vms/${createdVmId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    });
    assert.equal(deleteResponse.status, 204);
    assert.deepEqual(await deletedEvent, { id: createdVmId });

    const missing = await fetch(`${baseUrl}/api/vms/${createdVmId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    });
    assert.equal(missing.status, 404);
  });

  await suite.test(
    'CORS no autoriza al origen externo y la API bloquea sus escrituras',
    async () => {
      const crossOriginRead = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://attacker.example' },
      });
      // cors emits the configured allow-origin value; the browser rejects it because it
      // does not match the requesting origin. The API also blocks unsafe requests server-side.
      assert.equal(crossOriginRead.headers.get('access-control-allow-origin'), allowedOrigin);

      const crossOriginMutation = await fetch(`${baseUrl}/api/vms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
          Origin: 'https://attacker.example',
        },
        body: JSON.stringify({
          name: 'Cross Origin VM',
          cores: 2,
          ram: 4,
          disk: 80,
          os: 'Ubuntu 24.04',
          status: 'running',
        }),
      });
      assert.equal(crossOriginMutation.status, 403);
    },
  );

  await suite.test(
    'payloads demasiado grandes reciben 413 sin filtrar errores internos',
    async () => {
      const response = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `${'a'.repeat(40_000)}@example.test`, password: 'x' }),
      });
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), {
        message: 'La solicitud excede el tamaño permitido.',
      });
    },
  );

  await suite.test('login limita intentos repetidos desde el mismo cliente', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unknown@ifx.test', password: 'wrong' }),
      });
      statuses.push(response.status);
    }
    assert.ok(statuses.includes(429), `Se esperó un 429, se recibieron: ${statuses.join(', ')}`);
    assert.equal(statuses.at(-1), 429);
  });

  await suite.test(
    'API mantiene respuestas correctas durante una ráfaga de lecturas concurrentes',
    async () => {
      const responses = await Promise.all(
        Array.from({ length: 25 }, () => fetch(`${baseUrl}/api/health`)),
      );
      assert.equal(
        responses.every((response) => response.status === 200),
        true,
      );
      const payloads = await Promise.all(responses.map((response) => response.json()));
      assert.equal(
        payloads.every((payload) => payload.status === 'ok'),
        true,
      );
    },
  );
});
