/**
 * Carreras oficiales de la Universidad Luterana Salvadoreña (ULS).
 * Coinciden exactamente con los nombres en el catálogo de materias.
 */
export const CARRERAS = [
  // Facultad de Ciencias del Hombre y la Naturaleza
  'Ingeniería Agroecológica',
  'Licenciatura en Administración de Empresas',
  'Licenciatura en Ciencias de la Computación',
  'Licenciatura en Ciencias Jurídicas',
  'Licenciatura en Contaduría Pública',
  'Técnico en Desarrollo de Aplicaciones Informáticas',
  'Técnico en Ingeniería Agroecológica',
  // Facultad de Teología y Humanidades
  'Licenciatura en Idioma Inglés',
  'Licenciatura en Psicología',
  'Licenciatura en Teología',
  'Licenciatura en Trabajo Social',
] as const;

export type Carrera = (typeof CARRERAS)[number];

export function isCarreraValida(carrera: string): boolean {
  return CARRERAS.includes(carrera as Carrera);
}

/** Label corto para mostrar en UI (sin "Licenciatura en" ni "Ingeniería") */
export function carreraLabel(carrera: string): string {
  return carrera
    .replace(/^Licenciatura en /, '')
    .replace(/^Técnico en /, 'Téc. ')
    .replace(/^Ingeniería /, 'Ing. ');
}

/** Número máximo de ciclos por carrera */
export const CICLOS_POR_CARRERA: Record<string, number> = {
  'Ingeniería Agroecológica': 10,
  'Licenciatura en Administración de Empresas': 10,
  'Licenciatura en Ciencias de la Computación': 10,
  'Licenciatura en Ciencias Jurídicas': 10,
  'Licenciatura en Contaduría Pública': 10,
  'Técnico en Desarrollo de Aplicaciones Informáticas': 4,
  'Técnico en Ingeniería Agroecológica': 4,
  'Licenciatura en Idioma Inglés': 10,
  'Licenciatura en Psicología': 10,
  'Licenciatura en Teología': 10,
  'Licenciatura en Trabajo Social': 10,
};
