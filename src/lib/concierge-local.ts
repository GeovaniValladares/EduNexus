import type { ConciergeContext } from './concierge-context';
import { studyTipsForSubject } from './academic';
import { BRAND } from './branding';

type ChatMsg = { role: string; content: string };

function lastUserMessage(messages: ChatMsg[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content.trim();
  }
  return '';
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function generateLocalChatReply(
  messages: ChatMsg[],
  ctx: ConciergeContext
): string {
  const q = lastUserMessage(messages).toLowerCase();
  const nombre = ctx.nombre.split(/\s+/)[0];

  if (!q) {
    return `Hola ${nombre}, soy ${BRAND.assistant.name}. Puedo ayudarte con tus materias de ${ctx.carrera}, mejorar tu CUM (${ctx.cum}), crear tu CV o aplicar a pasantías en Bridge. ¿Qué necesitas?`;
  }

  if (includesAny(q, ['hola', 'buenas', 'hey', 'saludos'])) {
    return `Hola ${nombre}. Veo que estudias **${ctx.carrera}** con un CUM estimado de **${ctx.cum}** (${ctx.cumLabel}). ${
      ctx.materias.length > 0
        ? `Tienes ${ctx.materias.length} materia(s) inscrita(s).`
        : 'Aún no tienes materias inscritas en Wiki.'
    } ¿Quieres ayuda con alguna materia, tu CV o pasantías?`;
  }

  if (includesAny(q, ['cv', 'curriculum', 'currículum', 'curriculo', 'hoja de vida'])) {
    return (
      `**Curriculum vitae**\n\n` +
      `Puedo ayudarte a redactarlo para ${ctx.carrera}. Usa el panel **"Mi CV"** en esta página: botón **Generar con Lía** y luego **Guardar**.\n\n` +
      `Al aplicar en **Bridge**, marca **"Adjuntar mi CV"** y tu CV se enviará con la solicitud.\n\n` +
      (ctx.cvGuardado
        ? 'Ya tienes un CV guardado. Puedes editarlo antes de cada aplicación.'
        : 'Aún no tienes CV guardado. Genera uno ahora para postular con ventaja.')
    );
  }

  if (includesAny(q, ['cum', 'promedio', 'nota', 'calificacion', 'calificación', 'rendimiento'])) {
    let body = `Tu **CUM estimado** es **${ctx.cum}** (${ctx.cumLabel}).\n\n`;
    if (ctx.cum < 7.5) {
      body +=
        '**Plan de mejora:**\n1. Asistencia puntual y participación activa.\n2. Tutorías con profesor en materias clave.\n3. Grupos de estudio 2 veces por semana.\n4. Adelanta tareas grandes con 1 semana de margen.\n\n';
    } else {
      body += 'Vas bien. Para subir más, refuerza evaluaciones parciales y proyectos integradores.\n\n';
    }
    if (ctx.materias.length > 0) {
      body += `**Por materia inscrita:**\n`;
      ctx.materias.forEach((m) => {
        const tips = studyTipsForSubject(m.nombre, ctx.carrera);
        body += `\n• **${m.nombre}** (${m.codigo}): ${tips[0]}\n`;
      });
    } else {
      body += 'Inscríbete en Wiki para recibir consejos por materia.';
    }
    return body;
  }

  if (
    includesAny(q, [
      'pasant',
      'bridge',
      'empleo',
      'trabajo',
      'oportunidad',
      'proyecto',
      'aplicar',
      'postular',
    ])
  ) {
    if (ctx.oportunidades.length === 0) {
      return `No hay oportunidades cargadas para ${ctx.carrera} en este momento. Revisa **Bridge** más tarde o consulta oportunidades abiertas a todas las carreras.`;
    }
    let body = `**Oportunidades para ${ctx.carrera}:**\n\n`;
    ctx.oportunidades.slice(0, 5).forEach((o, i) => {
      body += `${i + 1}. **${o.titulo}** — ${o.empresa}\n   ${o.tipo} · ${o.ubicacion} · ${o.horasSemanales} h/sem\n`;
    });
    body += `\nEntra a **Bridge** para ver detalles y aplicar.`;
    if (!ctx.cvGuardado) {
      body += '\n\nCrea y guarda tu CV aquí en Lía antes de aplicar.';
    }
    if (ctx.aplicacionesPendientes > 0) {
      body += `\n\nTienes **${ctx.aplicacionesPendientes}** solicitud(es) en revisión.`;
    }
    return body;
  }

  const materiaMatch = ctx.materias.find(
    (m) =>
      q.includes(m.nombre.toLowerCase()) ||
      q.includes(m.codigo.toLowerCase()) ||
      m.nombre.toLowerCase().split(' ').some((w) => w.length > 4 && q.includes(w))
  );

  if (
    materiaMatch ||
    includesAny(q, ['materia', 'clase', 'examen', 'parcial', 'tarea', 'estudiar'])
  ) {
    const m = materiaMatch ?? ctx.materias[0];
    if (!m) {
      return 'Primero inscríbete en materias en **Wiki**; así podré darte consejos personalizados por asignatura.';
    }
    const tips = studyTipsForSubject(m.nombre, ctx.carrera);
    return (
      `**${m.nombre}** (${m.codigo})\n` +
      `Profesor: ${m.profesor} · Horario: ${m.horario}\n\n` +
      `**Consejos:**\n` +
      tips.map((t, i) => `${i + 1}. ${t}`).join('\n')
    );
  }

  if (includesAny(q, ['ingles', 'inglés', 'idioma', 'certificacion', 'certificación'])) {
    return `Para ${ctx.carrera}, el inglés técnico abre mejores pasantías. Practica 20 min diarios con vocabulario de tu área y simula entrevistas en Bridge.`;
  }

  return (
    `${nombre}, entiendo tu consulta sobre "${lastUserMessage(messages)}".\n\n` +
    `Como estudiante de **${ctx.carrera}** (CUM **${ctx.cum}**), te recomiendo:\n` +
    `• **Materias:** pídeme ayuda con una asignatura inscrita.\n` +
    `• **CUM:** escribe "¿cómo mejorar mi CUM?"\n` +
    `• **CV:** escribe "ayúdame con mi CV"\n` +
    `• **Pasantías:** escribe "oportunidades en Bridge"\n\n` +
    `Configura una API key de OpenAI en \`.env.local\` para respuestas aún más detalladas; mientras tanto sigo ayudándote con tus datos reales de la plataforma.`
  );
}

export function generateLocalCv(ctx: ConciergeContext): string {
  const skillsByCareer: Record<string, string[]> = {
    'Ingeniería Informática': ['JavaScript/TypeScript', 'Bases de datos', 'Git', 'Trabajo en equipo'],
    'Ingeniería Civil': ['AutoCAD', 'Topografía', 'Control de obra', 'Normativa'],
    'Administración de Empresas': ['Excel', 'Marketing', 'Finanzas básicas', 'Comunicación'],
    Contabilidad: ['Contabilidad general', 'Excel avanzado', 'Auditoría', 'Atención al detalle'],
    Derecho: ['Investigación jurídica', 'Redacción legal', 'Office', 'Análisis de casos'],
    Psicología: ['Evaluación psicológica', 'Comunicación empática', 'Estadística', 'Informes'],
  };

  const skills = skillsByCareer[ctx.carrera] ?? ['Trabajo en equipo', 'Comunicación', 'Office'];

  const materiasBlock =
    ctx.materias.length > 0
      ? ctx.materias.map((m) => `• ${m.nombre} (${m.codigo}) — Semestre ${m.semestre}`).join('\n')
      : '• (Inscribe materias en Wiki para completar esta sección)';

  const oppsBlock =
    ctx.oportunidades.length > 0
      ? `Interés en: ${ctx.oportunidades
          .slice(0, 2)
          .map((o) => o.titulo)
          .join(', ')}.`
      : '';

  return `# ${ctx.nombre.toUpperCase()}
${ctx.carrera} · Universidad Luterana Salvadoreña (ULS)
${ctx.email}

## Perfil profesional
Estudiante de ${ctx.carrera} con CUM estimado de ${ctx.cum}. Motivación por aprendizaje práctico, responsabilidad y trabajo colaborativo. ${oppsBlock}

## Formación académica
Universidad Luterana Salvadoreña (ULS)
${ctx.carrera} — en curso

### Materias cursadas / inscritas
${materiasBlock}

## Habilidades
${skills.map((s) => `• ${s}`).join('\n')}

## Experiencia y proyectos
• Proyectos académicos integradores en ${ctx.carrera}.
• Participación en actividades universitarias y trabajo en equipo.

## Idiomas
• Español — nativo
• Inglés — en formación (recomendado reforzar para pasantías)

---
Documento generado por ${BRAND.assistant.name} — Plataforma ULS. Edita y guarda antes de aplicar en Bridge.`;
}
