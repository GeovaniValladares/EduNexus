export type OpportunityTipo = 'micro-pasantia' | 'pasantia' | 'empleo' | 'proyecto';

export type ApplicationEstado = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export function parseRequisitos(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw ? raw.split(',').map((s) => s.trim()) : [];
  }
}

export function parseCarreras(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function tipoLabel(tipo: string): string {
  switch (tipo) {
    case 'micro-pasantia':
      return 'Micro-Pasantía';
    case 'pasantia':
      return 'Pasantía';
    case 'empleo':
      return 'Empleo';
    case 'proyecto':
      return 'Proyecto';
    default:
      return tipo;
  }
}

export function tipoBadgeClass(tipo: string): string {
  switch (tipo) {
    case 'micro-pasantia':
      return 'bg-blue-100 text-blue-700';
    case 'pasantia':
      return 'bg-green-100 text-green-700';
    case 'empleo':
      return 'bg-purple-100 text-purple-700';
    case 'proyecto':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function estadoLabel(estado: string): string {
  switch (estado) {
    case 'pending':
      return 'Pendiente';
    case 'accepted':
      return 'Aceptado';
    case 'rejected':
      return 'Rechazado';
    case 'withdrawn':
      return 'Retirada';
    default:
      return estado;
  }
}

export function formatFecha(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-SV', { day: 'numeric', month: 'short', year: 'numeric' });
}
