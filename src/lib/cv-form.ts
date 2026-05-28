import type { ConciergeContext } from './concierge-context';

export type CvFormData = {
  nombreCompleto: string;
  email: string;
  telefono: string;
  ciudad: string;
  linkedin: string;
  carrera: string;
  perfil: string;
  formacion: string;
  materias: string;
  habilidades: string;
  experiencia: string;
  proyectos: string;
  idiomas: string;
};

export function defaultCvForm(
  ctx: Pick<ConciergeContext, 'nombre' | 'email' | 'carrera' | 'cum' | 'materias'>
): CvFormData {
  const materiasTxt =
    ctx.materias.length > 0
      ? ctx.materias.map((m) => `• ${m.nombre} (${m.codigo}) — Sem. ${m.semestre}`).join('\n')
      : '';

  return {
    nombreCompleto: ctx.nombre,
    email: ctx.email,
    telefono: '',
    ciudad: 'El Salvador',
    linkedin: '',
    carrera: ctx.carrera,
    perfil: `Estudiante de ${ctx.carrera} en la Universidad Luterana Salvadoreña (ULS), con CUM estimado de ${ctx.cum}. Busco oportunidades de pasantía y proyectos para aplicar conocimientos en entorno profesional.`,
    formacion: `Universidad Luterana Salvadoreña (ULS)\n${ctx.carrera} — en curso`,
    materias: materiasTxt,
    habilidades: '',
    experiencia: '',
    proyectos: 'Proyectos académicos y trabajos en equipo durante la carrera universitaria.',
    idiomas: 'Español — nativo\nInglés — en formación',
  };
}

export function parseCvDataJson(raw: string | null | undefined): Partial<CvFormData> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CvFormData>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function mergeCvForm(base: CvFormData, partial: Partial<CvFormData> | null): CvFormData {
  if (!partial) return base;
  return { ...base, ...partial };
}

/** Safely coerce a potentially null/undefined value to a trimmed string */
function str(v: unknown): string {
  return (v == null ? '' : String(v)).trim();
}

export function formToMarkdown(form: CvFormData): string {
  const lines: string[] = [
    `# ${str(form.nombreCompleto)}`,
    `${str(form.carrera)} · ${str(form.ciudad)}`,
    `${str(form.email)}${str(form.telefono) ? ` · ${str(form.telefono)}` : ''}`,
  ];
  if (str(form.linkedin)) lines.push(str(form.linkedin));
  lines.push('', '## Perfil profesional', str(form.perfil), '', '## Formación académica', str(form.formacion));

  if (str(form.materias)) {
    lines.push('', '## Materias inscritas / cursadas', str(form.materias));
  }
  if (str(form.habilidades)) {
    lines.push('', '## Habilidades', str(form.habilidades));
  }
  if (str(form.experiencia)) {
    lines.push('', '## Experiencia', str(form.experiencia));
  }
  if (str(form.proyectos)) {
    lines.push('', '## Proyectos', str(form.proyectos));
  }
  if (str(form.idiomas)) {
    lines.push('', '## Idiomas', str(form.idiomas));
  }

  lines.push('', '---', 'CV — Plataforma ULS / Lía');
  return lines.join('\n');
}

/** Mínimo para permitir guardar en la base de datos. */
export function canSaveCv(form: CvFormData): boolean {
  return str(form.nombreCompleto).length > 2 && str(form.email).includes('@');
}

export function isCvFormComplete(form: CvFormData): boolean {
  return (
    canSaveCv(form) &&
    str(form.perfil).length >= 15 &&
    str(form.formacion).length >= 5
  );
}

const SKILLS_BY_CAREER: Record<string, string> = {
  'Ingeniería Informática': 'JavaScript · Git · Bases de datos · Trabajo en equipo',
  'Ingeniería Civil': 'AutoCAD · Topografía · Control de obra · Excel',
  'Administración de Empresas': 'Excel · Marketing · Finanzas · Comunicación',
  Contabilidad: 'Contabilidad · Excel · Análisis financiero',
  Derecho: 'Investigación jurídica · Redacción legal · Office',
  Psicología: 'Evaluación · Comunicación · Estadística',
};

/** Rellena el formulario sin llamar a OpenAI. */
export function enhanceCvFormLocal(
  form: CvFormData,
  ctx: { nombre: string; carrera: string; cum: number; materias: { nombre: string; codigo: string; semestre: string }[] }
): CvFormData {
  const materiasTxt =
    ctx.materias.length > 0
      ? ctx.materias.map((m) => `• ${m.nombre} (${m.codigo}) — Sem. ${m.semestre}`).join('\n')
      : form.materias;

  return {
    ...form,
    nombreCompleto: str(form.nombreCompleto) || ctx.nombre,
    carrera: str(form.carrera) || ctx.carrera,
    perfil:
      str(form.perfil) ||
      `Estudiante de ${ctx.carrera} en la ULS (CUM ${ctx.cum}). Busco pasantía o proyecto para aplicar conocimientos con responsabilidad y trabajo en equipo.`,
    formacion:
      str(form.formacion) ||
      `Universidad Luterana Salvadoreña (ULS)\n${ctx.carrera} — en curso`,
    materias: str(form.materias) || materiasTxt,
    habilidades: str(form.habilidades) || SKILLS_BY_CAREER[ctx.carrera] || 'Comunicación · Office · Trabajo en equipo',
    proyectos:
      str(form.proyectos) ||
      `Proyectos académicos en ${ctx.carrera} y actividades universitarias.`,
    idiomas: str(form.idiomas) || 'Español — nativo\nInglés — en formación',
  };
}
