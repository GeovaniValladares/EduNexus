import { db, User, Subject, Enrollment, Opportunity, Application, Evaluation, eq } from 'astro:db';
import { parseCarreras } from './bridge';
import { estimateCum, cumLabel, studyTipsForSubject } from './academic';

export type ConciergeSubject = {
  id: string;
  codigo: string;
  nombre: string;
  semestre: string;
  profesor: string;
  horario: string;
};

export type ConciergeOpportunity = {
  id: string;
  titulo: string;
  empresa: string;
  tipo: string;
  ubicacion: string;
  horasSemanales: number;
};

export type PlanItem = {
  title: string;
  deadline: string;
  priority: 'high' | 'medium';
};

export type ConciergeContext = {
  userId: string;
  nombre: string;
  email: string;
  carrera: string;
  cum: number;
  cumLabel: string;
  materias: ConciergeSubject[];
  oportunidades: ConciergeOpportunity[];
  aplicacionesPendientes: number;
  cvGuardado: boolean;
  cvPreview: string;
  plan: PlanItem[];
  tips: string[];
  alerts: string[];
};

function matchesCarrera(oppCarreras: string[], userCarrera: string): boolean {
  if (oppCarreras.length === 0) return true;
  return userCarrera ? oppCarreras.includes(userCarrera) : true;
}

export async function buildConciergeContext(userId: string): Promise<ConciergeContext | null> {
  const user = await db.select().from(User).where(eq(User.id, userId)).get();
  if (!user) return null;

  const enrollments = await db
    .select()
    .from(Enrollment)
    .where(eq(Enrollment.userId, userId))
    .all();

  const allSubjects = await db.select().from(Subject).all();
  const subjectMap = Object.fromEntries(allSubjects.map((s) => [s.id, s]));

  const materias: ConciergeSubject[] = enrollments
    .map((e) => subjectMap[e.subjectId])
    .filter(Boolean)
    .map((s) => ({
      id: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      semestre: s.semestre,
      profesor: s.profesor,
      horario: s.horario,
    }));

  // Use real grades from Evaluation table when available, else fall back to estimate
  const realEvals = await db
    .select()
    .from(Evaluation)
    .where(eq(Evaluation.userId, userId))
    .all();

  let cum: number;
  let cumText: string;
  if (realEvals.length >= 2) {
    const avg = realEvals.reduce((sum, e) => sum + e.nota, 0) / realEvals.length;
    cum = Math.round(avg * 100) / 100;
    cumText = cumLabel(cum);
  } else {
    cum = estimateCum(userId, materias.length);
    cumText = cumLabel(cum) + ' (estimado)';
  }

  const allOpps = await db.select().from(Opportunity).all();
  const oportunidades: ConciergeOpportunity[] = allOpps
    .filter((o) => o.activo)
    .filter((o) => matchesCarrera(parseCarreras(o.carreras), user.carrera ?? ''))
    .slice(0, 12)
    .map((o) => ({
      id: o.id,
      titulo: o.titulo,
      empresa: o.empresa,
      tipo: o.tipo,
      ubicacion: o.ubicacion,
      horasSemanales: o.horasSemanales,
    }));

  const apps = await db
    .select()
    .from(Application)
    .where(eq(Application.userId, userId))
    .all();

  const aplicacionesPendientes = apps.filter((a) => a.estado === 'pending').length;

  const cvText = user.cvText?.trim() ?? '';
  const plan: PlanItem[] = [];
  const tips: string[] = [];
  const alerts: string[] = [];

  if (materias.length === 0) {
    plan.push({
      title: 'Inscribir materias en Wiki',
      deadline: 'Esta semana',
      priority: 'high',
    });
    tips.push('Ve a Wiki e inscríbete en al menos 3 materias de tu semestre actual.');
  } else {
    const m = materias[0];
    plan.push({
      title: `Refuerzo: ${m.nombre}`,
      deadline: 'Próximos 7 días',
      priority: cum < 7.5 ? 'high' : 'medium',
    });
    studyTipsForSubject(m.nombre, user.carrera ?? '').forEach((t) => tips.push(t));
  }

  if (cum < 7.5) {
    plan.push({
      title: 'Plan de recuperación de CUM',
      deadline: 'Este mes',
      priority: 'high',
    });
    tips.push(
      'Prioriza materias con mayor peso en créditos; asiste a todas las clases y pide tutorías.'
    );
  } else if (cum >= 8.5) {
    tips.push(
      `Tu CUM estimado es ${cum} (${cumText}). Aprovecha para postular a pasantías exigentes en Bridge.`
    );
  }

  if (!cvText) {
    plan.push({
      title: 'Crear curriculum vitae con Lía',
      deadline: 'Antes de aplicar en Bridge',
      priority: 'high',
    });
    tips.push('Pídeme "ayúdame con mi CV" y guárdalo para adjuntarlo al aplicar.');
  } else {
    plan.push({
      title: 'Actualizar CV y aplicar en Bridge',
      deadline: 'Flexible',
      priority: 'medium',
    });
  }

  if (oportunidades.length > 0) {
    const top = oportunidades[0];
    plan.push({
      title: `Aplicar: ${top.titulo}`,
      deadline: 'Próximas 2 semanas',
      priority: 'medium',
    });
    tips.push(
      `Oportunidad recomendada para ${user.carrera}: "${top.titulo}" en ${top.empresa} (${top.tipo}).`
    );
  }

  if (aplicacionesPendientes > 0) {
    alerts.push(`Tienes ${aplicacionesPendientes} aplicación(es) en revisión en Bridge.`);
  }

  if (materias.length > 0 && cum < 8) {
    alerts.push('Refuerza estudio en materias inscritas para subir tu CUM este periodo.');
  }

  return {
    userId: user.id,
    nombre: user.nombre,
    email: user.email,
    carrera: user.carrera ?? '',
    cum,
    cumLabel: cumText,
    materias,
    oportunidades,
    aplicacionesPendientes,
    cvGuardado: cvText.length > 80,
    cvPreview: cvText.slice(0, 200),
    plan: plan.slice(0, 5),
    tips: [...new Set(tips)].slice(0, 5),
    alerts: alerts.slice(0, 4),
  };
}

export function contextToSystemPrompt(ctx: ConciergeContext): string {
  const materiasTxt =
    ctx.materias.length > 0
      ? ctx.materias
          .map((m) => `- ${m.codigo} ${m.nombre} (Sem. ${m.semestre}, ${m.profesor})`)
          .join('\n')
      : 'Sin materias inscritas aún.';

  const oppsTxt =
    ctx.oportunidades.length > 0
      ? ctx.oportunidades
          .map((o) => `- [${o.id}] ${o.titulo} — ${o.empresa} (${o.tipo}, ${o.ubicacion})`)
          .join('\n')
      : 'Sin oportunidades cargadas para su carrera.';

  return `DATOS DEL ESTUDIANTE (usa siempre esta información, no inventes otros datos):
- Nombre: ${ctx.nombre}
- Carrera: ${ctx.carrera}
- CUM estimado: ${ctx.cum} (${ctx.cumLabel})
- Materias inscritas:
${materiasTxt}
- Oportunidades Bridge para su carrera:
${oppsTxt}
- CV guardado en plataforma: ${ctx.cvGuardado ? 'Sí' : 'No'}
- Aplicaciones pendientes: ${ctx.aplicacionesPendientes}

Instrucciones: responde en español, concreto y motivador. Para mejorar CUM da consejos por materia inscrita. Para pasantías menciona oportunidades de la lista y sugiere ir a Bridge. Para CV ofrece estructura profesional y recuerda guardarlo en la sección CV de Lía.`;
}
