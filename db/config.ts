import { defineDb, defineTable, column } from 'astro:db';

export const User = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    email: column.text({ unique: true }),
    nombre: column.text(),
    carrera: column.text(),
    ciclo: column.text({ optional: true }),
    telefono: column.text({ optional: true }),
    perfilCompleto: column.boolean({ optional: true }),
    avatarUrl: column.text({ optional: true }),
    hashedPassword: column.text(),
    role: column.text({ defaults: 'alumno' }),
    cvText: column.text({ defaults: '' }),
    cvData: column.text({ defaults: '' }),
    cvUpdatedAt: column.date({ optional: true }),
    createdAt: column.date({ defaults: new Date() }),
  },
});

export const Session = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    expiresAt: column.date(),
  },
});

export const Subject = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    codigo: column.text(),
    nombre: column.text(),
    carrera: column.text(),
    semestre: column.text(),
    creditos: column.number(),
    profesor: column.text(),
    horario: column.text(),
    aula: column.text(),
    cupo: column.number({ defaults: 35 }),
  },
});

export const Enrollment = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    subjectId: column.text({ references: () => Subject.columns.id }),
    estado: column.text({ optional: true }), // 'pending' | 'approved' | 'rejected'
    createdAt: column.date({ defaults: new Date() }),
  },
});

export const Opportunity = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    titulo: column.text(),
    empresa: column.text(),
    companyId: column.text({ optional: true, references: () => User.columns.id }),
    tipo: column.text(),
    horasSemanales: column.number(),
    duracionSemanas: column.number(),
    duracionLabel: column.text(),
    ubicacion: column.text(),
    descripcion: column.text(),
    requisitos: column.text(),
    carreras: column.text({ defaults: '' }),
    activo: column.boolean({ defaults: true }),
    createdAt: column.date({ defaults: new Date() }),
  },
});

export const Application = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    opportunityId: column.text({ references: () => Opportunity.columns.id }),
    estado: column.text({ defaults: 'pending' }),
    mensaje: column.text({ defaults: '' }),
    cvText: column.text({ defaults: '' }),
    createdAt: column.date({ defaults: new Date() }),
    updatedAt: column.date({ defaults: new Date() }),
  },
});

export const ApplicationHistory = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    applicationId: column.text({ references: () => Application.columns.id }),
    estado: column.text(),
    comentario: column.text(),
    createdAt: column.date({ defaults: new Date() }),
  },
});

export const Attendance = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    subjectId: column.text({ references: () => Subject.columns.id }),
    fecha: column.text(), // ISO date "2026-05-25"
    presente: column.boolean({ defaults: false }),
    nota: column.text({ optional: true }),
    createdAt: column.date({ defaults: new Date() }),
  },
});

export const Notice = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    subjectId: column.text({ references: () => Subject.columns.id }),
    titulo: column.text(),
    contenido: column.text(),
    urgente: column.boolean({ defaults: false }),
    createdAt: column.date({ defaults: new Date() }),
  },
});

export const Evaluation = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    subjectId: column.text({ references: () => Subject.columns.id }),
    userId: column.text({ references: () => User.columns.id }),
    titulo: column.text(),
    nota: column.number(),
    comentario: column.text({ optional: true }),
    createdAt: column.date({ defaults: new Date() }),
  },
});

export const Tramite = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    tipo: column.text(),
    estado: column.text({ defaults: 'pendiente' }),
    folio: column.text({ defaults: '' }),
    materiasCount: column.number({ defaults: 0 }),
    createdAt: column.date({ defaults: new Date() }),
    updatedAt: column.date({ defaults: new Date() }),
  },
});

export default defineDb({
  tables: { User, Session, Subject, Enrollment, Opportunity, Application, ApplicationHistory, Tramite, Attendance, Notice, Evaluation },
});
