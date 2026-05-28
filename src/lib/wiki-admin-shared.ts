import { CARRERAS, isCarreraValida } from './carreras';

export { CARRERAS };

export const WIKI_SEMESTRES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

export type SubjectPayload = {
  codigo: string;
  nombre: string;
  carrera: string;
  semestre: string;
  creditos: number;
  profesor: string;
  horario: string;
  aula: string;
  cupo: number;
};

export function parseSubjectPayload(body: Record<string, unknown>): {
  data?: SubjectPayload;
  error?: string;
} {
  const codigo = body.codigo?.toString().trim();
  const nombre = body.nombre?.toString().trim();
  const carrera = body.carrera?.toString().trim();
  const semestre = body.semestre?.toString().trim();
  const profesor = body.profesor?.toString().trim();
  const horario = body.horario?.toString().trim();
  const aula = body.aula?.toString().trim();
  const creditos = Number(body.creditos);
  const cupo = Number(body.cupo ?? 35);

  if (!codigo || !nombre || !carrera || !semestre || !profesor || !horario || !aula) {
    return { error: 'Completa código, nombre, carrera, semestre, docente, horario y aula' };
  }
  if (!isCarreraValida(carrera)) {
    return { error: 'Carrera no válida' };
  }
  if (!(WIKI_SEMESTRES as readonly string[]).includes(semestre)) {
    return { error: 'Semestre no válido' };
  }
  if (!Number.isFinite(creditos) || creditos < 1 || creditos > 12) {
    return { error: 'Créditos debe ser entre 1 y 12' };
  }
  if (!Number.isFinite(cupo) || cupo < 1 || cupo > 500) {
    return { error: 'Cupo debe ser entre 1 y 500' };
  }

  return {
    data: { codigo, nombre, carrera, semestre, creditos, profesor, horario, aula, cupo },
  };
}

export function parseStudentPayload(body: Record<string, unknown>): {
  data?: { nombre: string; email: string; carrera: string; password?: string };
  error?: string;
} {
  const nombre = body.nombre?.toString().trim();
  const email = body.email?.toString().trim().toLowerCase();
  const carrera = body.carrera?.toString().trim();
  const password = body.password?.toString();

  if (!nombre || !email || !carrera) {
    return { error: 'Nombre, correo y carrera son obligatorios' };
  }
  if (!isCarreraValida(carrera)) {
    return { error: 'Carrera no válida' };
  }
  if (password !== undefined && password.length > 0 && password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  return { data: { nombre, email, carrera, password: password || undefined } };
}
