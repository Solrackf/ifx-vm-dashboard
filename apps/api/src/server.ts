import dotenv from 'dotenv';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server as SocketServer } from 'socket.io';
import { z } from 'zod';
import { db } from './db.js';

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env'),
});

type Role = 'admin' | 'client';
type AuthUser = { id: string; name: string; email: string; role: Role };
type AuthedRequest = Request & { user?: AuthUser };

const app = express();
const server = http.createServer(app);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
const jwtSecret = process.env.JWT_SECRET ?? 'local-development-secret-change-before-deploy';
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const cookieName = 'ifx_session';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET debe configurarse antes de iniciar en producción.');
}
if (process.env.NODE_ENV === 'production' && !cookieSecure) {
  throw new Error('COOKIE_SECURE=true es obligatorio en producción.');
}

const io = new SocketServer(server, {
  cors: { origin: webOrigin, credentials: true },
});

app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== webOrigin) {
    return res.status(403).json({ message: 'Origen no autorizado.' });
  }
  next();
});

const userPublic = (row: { id: string; name: string; email: string; role: Role }): AuthUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies[cookieName] as string | undefined;
  if (!token) return res.status(401).json({ message: 'Inicia sesión para continuar.' });
  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload & { sub: string };
    const row = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(payload.sub) as AuthUser | undefined;
    if (!row) return res.status(401).json({ message: 'La sesión ya no es válida.' });
    req.user = userPublic(row);
    next();
  } catch {
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
    return res.status(401).json({ message: 'La sesión ha expirado. Inicia sesión de nuevo.' });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Esta acción requiere permisos de Administrador.' });
  next();
}

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de acceso. Intenta de nuevo más tarde.' },
});
const vmSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(
      /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u,
      'Usa letras, números, espacios, puntos, guiones o guiones bajos.',
    ),
  cores: z.number().int().min(1).max(128),
  ram: z.number().int().min(1).max(2048),
  disk: z.number().int().min(1).max(10000),
  os: z.string().trim().min(2).max(80),
  status: z.enum(['running', 'stopped', 'paused']),
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/login', loginRateLimit, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: 'Revisa el correo y la contraseña.' });
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(parsed.data.email.toLowerCase()) as
    { id: string; name: string; email: string; password_hash: string; role: Role } | undefined;
  if (!row || !bcrypt.compareSync(parsed.data.password, row.password_hash)) {
    return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
  }
  const token = jwt.sign({}, jwtSecret, {
    subject: row.id,
    expiresIn: '8h',
    issuer: 'ifx-vm-dashboard',
  });
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
  return res.json({ user: userPublic(row) });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie(cookieName, { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/' });
  res.status(204).end();
});

app.get('/api/me', requireAuth, (req: AuthedRequest, res) => res.json({ user: req.user }));

app.get('/api/vms', requireAuth, (_req, res) => {
  const rows = db
    .prepare(
      'SELECT id, name, cores, ram, disk, os, status, created_at AS createdAt, updated_at AS updatedAt FROM vms ORDER BY created_at DESC',
    )
    .all();
  res.json({ vms: rows });
});

app.post('/api/vms', requireAuth, requireAdmin, (req: AuthedRequest, res) => {
  const parsed = vmSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ message: 'Hay datos inválidos en el formulario.', issues: parsed.error.issues });
  const vm = { id: randomUUID(), ...parsed.data };
  db.prepare(
    'INSERT INTO vms (id, name, cores, ram, disk, os, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(vm.id, vm.name, vm.cores, vm.ram, vm.disk, vm.os, vm.status);
  const saved = db
    .prepare(
      'SELECT id, name, cores, ram, disk, os, status, created_at AS createdAt, updated_at AS updatedAt FROM vms WHERE id = ?',
    )
    .get(vm.id);
  io.emit('vm:created', saved);
  res.status(201).json({ vm: saved });
});

app.put('/api/vms/:id', requireAuth, requireAdmin, (req: AuthedRequest, res) => {
  const parsed = vmSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ message: 'Hay datos inválidos en el formulario.', issues: parsed.error.issues });
  const existing = db.prepare('SELECT id FROM vms WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'No encontramos esa máquina virtual.' });
  db.prepare(
    'UPDATE vms SET name = ?, cores = ?, ram = ?, disk = ?, os = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  ).run(
    parsed.data.name,
    parsed.data.cores,
    parsed.data.ram,
    parsed.data.disk,
    parsed.data.os,
    parsed.data.status,
    req.params.id,
  );
  const saved = db
    .prepare(
      'SELECT id, name, cores, ram, disk, os, status, created_at AS createdAt, updated_at AS updatedAt FROM vms WHERE id = ?',
    )
    .get(req.params.id);
  io.emit('vm:updated', saved);
  res.json({ vm: saved });
});

app.delete('/api/vms/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM vms WHERE id = ?').run(req.params.id);
  if (!result.changes)
    return res.status(404).json({ message: 'No encontramos esa máquina virtual.' });
  io.emit('vm:deleted', { id: req.params.id });
  res.status(204).end();
});

// Authenticate Socket.IO connections with the same HttpOnly cookie used by the REST API.
io.use((socket, next) => {
  try {
    const cookies = Object.fromEntries(
      (socket.handshake.headers.cookie ?? '')
        .split(';')
        .map((part) => {
          const [key, ...value] = part.trim().split('=');
          return [key, decodeURIComponent(value.join('='))];
        })
        .filter(([key]) => key),
    );
    const token = cookies[cookieName];
    if (!token) return next(new Error('unauthorized'));
    const payload = jwt.verify(token, jwtSecret) as JwtPayload & { sub: string };
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(payload.sub))
      return next(new Error('unauthorized'));
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const requestError = err as { status?: number; type?: string };
  const status =
    requestError.status && requestError.status >= 400 && requestError.status < 500
      ? requestError.status
      : 500;

  if (status === 500) console.error(err);
  const message =
    status === 413
      ? 'La solicitud excede el tamaño permitido.'
      : status === 400
        ? 'La solicitud no tiene un formato válido.'
        : 'Ocurrió un error inesperado.';
  res.status(status).json({ message });
});

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => console.log(`IFX VM API escuchando en http://localhost:${port}`));
