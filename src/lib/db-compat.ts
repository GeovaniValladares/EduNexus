/**
 * db-compat.ts — drop-in replacement for `astro:db` when deploying to Netlify with Turso.
 *
 * @astrojs/db v0.13 routes its "remote" mode through Astro Studio (which is shut down).
 * This module bypasses that proxy and connects directly to the Turso libSQL database
 * using the standard @libsql/client driver + Drizzle ORM.
 *
 * Activated via a Vite alias in astro.config.mjs when ASTRO_DB_REMOTE_URL is set.
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import {
  sqliteTable,
  text,
  integer,
  customType,
} from 'drizzle-orm/sqlite-core';

// ── Re-export all Drizzle operators used across the codebase ──────────────────
export {
  sql,
  eq,
  gt,
  gte,
  lt,
  lte,
  ne,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  exists,
  notExists,
  between,
  notBetween,
  like,
  notIlike,
  not,
  asc,
  desc,
  and,
  or,
  count,
  avg,
  sum,
  max,
  min,
} from 'drizzle-orm';

// ── No-op exports so db/config.ts can still import defineTable etc. ───────────
export const column = {
  text: (_opts?: unknown) => ({}),
  number: (_opts?: unknown) => ({}),
  boolean: (_opts?: unknown) => ({}),
  date: (_opts?: unknown) => ({}),
  json: (_opts?: unknown) => ({}),
};
export const defineTable = (config: unknown) => config;
export const defineDb = (config: unknown) => config;

// ── Custom date type: ISO strings on disk, Date objects in JS ─────────────────
// Mirrors @astrojs/db's internal dateType so existing Drizzle queries work.
const dateType = customType<{ data: Date; driverData: string }>({
  dataType() {
    return 'text';
  },
  toDriver(value) {
    return value instanceof Date ? value.toISOString() : String(value);
  },
  fromDriver(value) {
    if (!value) return new Date(0);
    // Handle both ISO ("2026-05-27T03:49:47.000Z") and SQLite ("2026-05-27 03:49:47")
    const s = String(value).includes('T') ? value : String(value).replace(' ', 'T') + '.000Z';
    return new Date(s.endsWith('Z') ? s : s + 'Z');
  },
});

// ── Database client ───────────────────────────────────────────────────────────
const dbUrl =
  process.env.ASTRO_DB_REMOTE_URL ??
  `file:${process.env.ASTRO_DATABASE_FILE ?? '.astro/content.db'}`;

const client = createClient({
  url: dbUrl,
  authToken: process.env.ASTRO_DB_APP_TOKEN,
});

export const db = drizzle(client);

// ── Table schemas (mirror db/config.ts but in Drizzle SQLite format) ─────────

export const User = sqliteTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull(),
  carrera: text('carrera').notNull().default(''),
  ciclo: text('ciclo'),
  telefono: text('telefono'),
  perfilCompleto: integer('perfilCompleto', { mode: 'boolean' }),
  avatarUrl: text('avatarUrl'),
  hashedPassword: text('hashedPassword').notNull(),
  role: text('role').notNull().default('alumno'),
  cvText: text('cvText').notNull().default(''),
  cvData: text('cvData').notNull().default(''),
  cvUpdatedAt: dateType('cvUpdatedAt'),
  createdAt: dateType('createdAt').notNull(),
});

export const Session = sqliteTable('Session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => User.id),
  expiresAt: dateType('expiresAt').notNull(),
});

export const Subject = sqliteTable('Subject', {
  id: text('id').primaryKey(),
  codigo: text('codigo').notNull(),
  nombre: text('nombre').notNull(),
  carrera: text('carrera').notNull(),
  semestre: text('semestre').notNull(),
  creditos: integer('creditos').notNull(),
  profesor: text('profesor').notNull().default(''),
  horario: text('horario').notNull().default(''),
  aula: text('aula').notNull().default(''),
  cupo: integer('cupo').notNull().default(35),
});

export const Enrollment = sqliteTable('Enrollment', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => User.id),
  subjectId: text('subjectId')
    .notNull()
    .references(() => Subject.id),
  estado: text('estado'),
  createdAt: dateType('createdAt').notNull(),
});

export const Opportunity = sqliteTable('Opportunity', {
  id: text('id').primaryKey(),
  titulo: text('titulo').notNull(),
  empresa: text('empresa').notNull(),
  companyId: text('companyId').references(() => User.id),
  tipo: text('tipo').notNull(),
  horasSemanales: integer('horasSemanales').notNull(),
  duracionSemanas: integer('duracionSemanas').notNull(),
  duracionLabel: text('duracionLabel').notNull(),
  ubicacion: text('ubicacion').notNull(),
  descripcion: text('descripcion').notNull(),
  requisitos: text('requisitos').notNull(),
  carreras: text('carreras').notNull().default(''),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  createdAt: dateType('createdAt').notNull(),
});

export const Application = sqliteTable('Application', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => User.id),
  opportunityId: text('opportunityId')
    .notNull()
    .references(() => Opportunity.id),
  estado: text('estado').notNull().default('pending'),
  mensaje: text('mensaje').notNull().default(''),
  cvText: text('cvText').notNull().default(''),
  createdAt: dateType('createdAt').notNull(),
  updatedAt: dateType('updatedAt').notNull(),
});

export const ApplicationHistory = sqliteTable('ApplicationHistory', {
  id: text('id').primaryKey(),
  applicationId: text('applicationId')
    .notNull()
    .references(() => Application.id),
  estado: text('estado').notNull(),
  comentario: text('comentario').notNull(),
  createdAt: dateType('createdAt').notNull(),
});

export const Tramite = sqliteTable('Tramite', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => User.id),
  tipo: text('tipo').notNull(),
  estado: text('estado').notNull().default('pendiente'),
  folio: text('folio').notNull().default(''),
  materiasCount: integer('materiasCount').notNull().default(0),
  createdAt: dateType('createdAt').notNull(),
  updatedAt: dateType('updatedAt').notNull(),
});

export const Attendance = sqliteTable('Attendance', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => User.id),
  subjectId: text('subjectId')
    .notNull()
    .references(() => Subject.id),
  fecha: text('fecha').notNull(),
  presente: integer('presente', { mode: 'boolean' }).notNull().default(false),
  nota: text('nota'),
  createdAt: dateType('createdAt').notNull(),
});

export const Notice = sqliteTable('Notice', {
  id: text('id').primaryKey(),
  subjectId: text('subjectId')
    .notNull()
    .references(() => Subject.id),
  titulo: text('titulo').notNull(),
  contenido: text('contenido').notNull(),
  urgente: integer('urgente', { mode: 'boolean' }).notNull().default(false),
  createdAt: dateType('createdAt').notNull(),
});

export const Evaluation = sqliteTable('Evaluation', {
  id: text('id').primaryKey(),
  subjectId: text('subjectId')
    .notNull()
    .references(() => Subject.id),
  userId: text('userId')
    .notNull()
    .references(() => User.id),
  titulo: text('titulo').notNull(),
  nota: integer('nota').notNull(),
  comentario: text('comentario'),
  createdAt: dateType('createdAt').notNull(),
});
