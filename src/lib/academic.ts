/** CUM estimado estable por usuario (demo hasta integrar notas reales). */
export function estimateCum(userId: string, materiasInscritas: number): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const base = 7.2 + (Math.abs(hash) % 25) / 10;
  const bonus = Math.min(0.6, materiasInscritas * 0.08);
  return Math.min(10, Math.round((base + bonus) * 10) / 10);
}

export function cumLabel(cum: number): string {
  if (cum >= 9) return 'excelente';
  if (cum >= 8) return 'muy bueno';
  if (cum >= 7) return 'bueno';
  if (cum >= 6) return 'regular';
  return 'en riesgo';
}

export function studyTipsForSubject(nombre: string, carrera: string): string[] {
  const n = nombre.toLowerCase();
  const tips: string[] = [
    `Organiza sesiones de 45 min para ${nombre} con descansos de 10 min.`,
    'Repasa apuntes el mismo día de clase y formula dudas para la siguiente sesión.',
  ];

  if (n.includes('program') || n.includes('datos') || n.includes('software')) {
    tips.push('Practica con ejercicios en un editor; la programación mejora con código diario.');
    tips.push('Usa Git para versionar tus tareas y pedir revisión a compañeros.');
  } else if (n.includes('matem') || n.includes('cálculo') || n.includes('estad')) {
    tips.push('Resuelve problemas tipo examen cada semana; no solo leas teoría.');
  } else if (n.includes('derecho') || n.includes('legal')) {
    tips.push('Elabora fichas de jurisprudencia y mapas conceptuales por unidad.');
  } else if (n.includes('contab') || n.includes('auditor') || n.includes('fiscal')) {
    tips.push('Practica ejercicios contables cronometrados para el parcial.');
  } else if (n.includes('psico') || n.includes('clínica')) {
    tips.push('Registra reflexiones de casos (sin datos personales) para reforzar teoría.');
  } else if (n.includes('estructura') || n.includes('obra') || n.includes('hidrául')) {
    tips.push('Revisa planos y normativa junto con ejemplos numéricos resueltos.');
  } else if (n.includes('mercad') || n.includes('finanz') || n.includes('admin')) {
    tips.push('Analiza casos reales de empresas locales y presenta conclusiones breves.');
  }

  tips.push(`Relaciona ${nombre} con objetivos de tu carrera en ${carrera}.`);
  return tips.slice(0, 4);
}
