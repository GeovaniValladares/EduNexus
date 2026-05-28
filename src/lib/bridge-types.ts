import type { ApplicationEstado, OpportunityTipo } from './bridge';

export type BridgeOpportunity = {
  id: string;
  titulo: string;
  empresa: string;
  tipo: string;
  horasSemanales: number;
  duracionSemanas: number;
  duracionLabel: string;
  ubicacion: string;
  descripcion: string;
  requisitos: string[];
  carreras: string[];
  activo: boolean;
  postulaciones: number;
  aplicado: boolean;
  applicationId?: string;
};

export type BridgeApplication = {
  id: string;
  opportunityId: string;
  userId?: string;
  titulo: string;
  empresa: string;
  estudianteNombre?: string;
  estudianteEmail?: string;
  estudianteCarrera?: string;
  estado: ApplicationEstado;
  mensaje: string;
  fecha: string;
  horasSemanales: number;
};

export type BridgeAdminStudent = {
  id: string;
  nombre: string;
  email: string;
  carrera: string;
};

export const BRIDGE_TIPOS: { value: OpportunityTipo; label: string }[] = [
  { value: 'micro-pasantia', label: 'Micro-pasantía' },
  { value: 'pasantia', label: 'Pasantía' },
  { value: 'empleo', label: 'Empleo' },
  { value: 'proyecto', label: 'Proyecto' },
];

export const APPLICATION_ESTADOS: { value: ApplicationEstado; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'accepted', label: 'Aceptada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'withdrawn', label: 'Retirada' },
];
