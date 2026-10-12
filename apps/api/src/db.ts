import initSqlJs, { type Database as SqlDatabase, type SqlJsStatic } from 'sql.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.resolve(process.env.DATABASE_PATH ?? './data/vms.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const SQL: SqlJsStatic = await initSqlJs({
  locateFile: (file) => path.resolve(sourceDir, '../../../node_modules/sql.js/dist', file),
});
const fileDb: SqlDatabase = fs.existsSync(databasePath)
  ? new SQL.Database(new Uint8Array(fs.readFileSync(databasePath)))
  : new SQL.Database();
let transactionDepth = 0;

function persist() {
  if (transactionDepth === 0) fs.writeFileSync(databasePath, Buffer.from(fileDb.export()));
}

export const db = {
  exec(sql: string) {
    fileDb.exec(sql);
    persist();
  },
  // sql.js runs SQLite in memory and checkpoints the database file after each write.
  pragma(_sql: string) {},
  prepare(sql: string) {
    return {
      get(...params: unknown[]) {
        const statement = fileDb.prepare(sql);
        try {
          statement.bind(params as never[]);
          return statement.step() ? statement.getAsObject() as Record<string, unknown> : undefined;
        } finally { statement.free(); }
      },
      all(...params: unknown[]) {
        const statement = fileDb.prepare(sql);
        const rows: Record<string, unknown>[] = [];
        try {
          statement.bind(params as never[]);
          while (statement.step()) rows.push(statement.getAsObject() as Record<string, unknown>);
          return rows;
        } finally { statement.free(); }
      },
      run(...params: unknown[]) {
        const statement = fileDb.prepare(sql);
        try {
          statement.bind(params as never[]);
          statement.step();
          const changes = fileDb.getRowsModified();
          persist();
          return { changes };
        } finally { statement.free(); }
      },
    };
  },
  transaction<T>(callback: () => T) {
    return () => {
      fileDb.exec('BEGIN');
      transactionDepth += 1;
      try {
        const result = callback();
        fileDb.exec('COMMIT');
        transactionDepth -= 1;
        persist();
        return result;
      } catch (error) {
        fileDb.exec('ROLLBACK');
        transactionDepth -= 1;
        throw error;
      }
    };
  },
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'client'))
  );
  CREATE TABLE IF NOT EXISTS vms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cores INTEGER NOT NULL CHECK(cores > 0),
    ram INTEGER NOT NULL CHECK(ram > 0),
    disk INTEGER NOT NULL CHECK(disk > 0),
    os TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running', 'stopped', 'paused')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const userCount = (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
  const seedUsers = db.transaction(() => {
    insertUser.run('usr-admin', 'Alex Morgan', 'admin@ifx.test', bcrypt.hashSync('Admin123!', 10), 'admin');
    insertUser.run('usr-client', 'Jordan Lee', 'client@ifx.test', bcrypt.hashSync('Client123!', 10), 'client');
  });
  seedUsers();
}

const vmCount = (db.prepare('SELECT COUNT(*) AS count FROM vms').get() as { count: number }).count;
if (vmCount === 0) {
  const insertVm = db.prepare('INSERT INTO vms (id, name, cores, ram, disk, os, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const seedVms = db.transaction(() => {
    insertVm.run('vm-prod-01', 'Production API', 8, 32, 480, 'Ubuntu 24.04 LTS', 'running');
    insertVm.run('vm-db-02', 'Primary Database', 12, 64, 960, 'Ubuntu 22.04 LTS', 'running');
    insertVm.run('vm-stage-03', 'Staging Environment', 4, 16, 240, 'Debian 12', 'running');
    insertVm.run('vm-legacy-04', 'Legacy Archive', 4, 16, 500, 'Windows Server 2022', 'stopped');
    insertVm.run('vm-dev-05', 'Development Sandbox', 2, 8, 120, 'Rocky Linux 9', 'paused');
  });
  seedVms();
}
