export type SolvenciaEstado = 'pendiente' | 'en_proceso' | 'completado' | 'rechazado';

export type SolvenciaRecord = {
  id: string;
  folio: string;
  estado: SolvenciaEstado;
  materiasCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function generarFolio(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(10000 + Math.random() * 89999);
  return `CIS-${year}-${seq}`;
}

export const TITULO_CONSTANCIA = 'Constancia de inscripción y solvencia académica';

export function puedeSolicitarSolvencia(opts: {
  carrera: string;
  materiasInscritas: number;
  materiasAprobadas?: number;
}): { ok: boolean; mensaje: string } {
  if (!opts.carrera?.trim()) {
    return {
      ok: false,
      mensaje: 'Completa tu carrera en el perfil antes de solicitar la solvencia.',
    };
  }
  if (opts.materiasInscritas < 1) {
    return {
      ok: false,
      mensaje: 'Debes tener al menos una materia inscrita en Wiki para solicitar la constancia.',
    };
  }
  const aprobadas = opts.materiasAprobadas ?? 0;
  if (aprobadas < 1) {
    return {
      ok: false,
      mensaje:
        'El docente aún no ha aprobado ninguna de tus inscripciones. ' +
        'La constancia solo puede emitirse cuando al menos una materia esté aprobada.',
    };
  }
  return { ok: true, mensaje: '' };
}

export function estadoSolvenciaLabel(estado: SolvenciaEstado): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'en_proceso':
      return 'En proceso';
    case 'completado':
      return 'Disponible';
    case 'rechazado':
      return 'Rechazada';
    default:
      return estado;
  }
}
