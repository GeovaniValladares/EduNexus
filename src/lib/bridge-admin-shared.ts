import { CARRERAS, isCarreraValida } from './carreras';
import { BRIDGE_TIPOS, type BridgeOpportunity } from './bridge-types';
import type { OpportunityTipo } from './bridge';

export { CARRERAS, BRIDGE_TIPOS };

export type OpportunityPayload = {
  titulo: string;
  empresa: string;
  tipo: OpportunityTipo;
  horasSemanales: number;
  duracionSemanas: number;
  duracionLabel: string;
  ubicacion: string;
  descripcion: string;
  requisitos: string[];
  carreras: string[];
  activo: boolean;
};

export function serializeRequisitos(list: string[]): string {
  return JSON.stringify(list.filter((r) => r.trim()));
}

export function serializeCarreras(list: string[]): string {
  return JSON.stringify(list.filter((r) => r.trim()));
}

export function parseRequisitosInput(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function opportunityToForm(opp: BridgeOpportunity) {
  return {
    titulo: opp.titulo,
    empresa: opp.empresa,
    tipo: opp.tipo as OpportunityTipo,
    horasSemanales: String(opp.horasSemanales),
    duracionSemanas: String(opp.duracionSemanas),
    duracionLabel: opp.duracionLabel,
    ubicacion: opp.ubicacion,
    descripcion: opp.descripcion,
    requisitosText: opp.requisitos.join(', '),
    carreras: opp.carreras.length > 0 ? opp.carreras : [],
    activo: opp.activo,
  };
}

export function parseOpportunityPayload(body: Record<string, unknown>): {
  data?: OpportunityPayload;
  error?: string;
} {
  const titulo = body.titulo?.toString().trim();
  const empresa = body.empresa?.toString().trim();
  const tipo = body.tipo?.toString().trim() as OpportunityTipo;
  const ubicacion = body.ubicacion?.toString().trim();
  const descripcion = body.descripcion?.toString().trim();
  const duracionLabel = body.duracionLabel?.toString().trim();
  const horasSemanales = Number(body.horasSemanales);
  const duracionSemanas = Number(body.duracionSemanas);
  const activo = body.activo !== false && body.activo !== 'false';

  let requisitos: string[] = [];
  if (Array.isArray(body.requisitos)) {
    requisitos = body.requisitos.map(String).filter(Boolean);
  } else if (body.requisitosText) {
    requisitos = parseRequisitosInput(body.requisitosText.toString());
  } else if (body.requisitos) {
    requisitos = parseRequisitosInput(body.requisitos.toString());
  }

  let carreras: string[] = [];
  if (Array.isArray(body.carreras)) {
    carreras = body.carreras.map(String).filter(Boolean);
  }

  if (!titulo || !empresa || !tipo || !ubicacion || !descripcion || !duracionLabel) {
    return { error: 'Completa título, empresa, tipo, ubicación, descripción y duración' };
  }

  if (!BRIDGE_TIPOS.some((t) => t.value === tipo)) {
    return { error: 'Tipo de oportunidad no válido' };
  }

  if (!Number.isFinite(horasSemanales) || horasSemanales < 1 || horasSemanales > 60) {
    return { error: 'Horas semanales debe ser entre 1 y 60' };
  }

  if (!Number.isFinite(duracionSemanas) || duracionSemanas < 1 || duracionSemanas > 52) {
    return { error: 'Duración en semanas debe ser entre 1 y 52' };
  }

  for (const c of carreras) {
    if (!isCarreraValida(c)) {
      return { error: `Carrera no válida: ${c}` };
    }
  }

  return {
    data: {
      titulo,
      empresa,
      tipo,
      horasSemanales,
      duracionSemanas,
      duracionLabel,
      ubicacion,
      descripcion,
      requisitos,
      carreras,
      activo,
    },
  };
}
