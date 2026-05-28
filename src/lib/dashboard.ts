import { parseCarreras, formatFecha } from './bridge';

type Opp = {
  id: string;
  titulo: string;
  carreras: string;
  activo: boolean;
};

type App = {
  opportunityId: string;
  estado: string;
  createdAt: Date;
};

type Subject = {
  id: string;
  nombre: string;
  codigo: string;
  horario: string;
  carrera: string;
};

export type DashboardEvent = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  href: string;
  color: 'red' | 'blue' | 'orange' | 'green' | 'purple';
};

export type DashboardAlert = {
  id: string;
  texto: string;
  href: string;
  accion: string;
};

export type DashboardTramite = {
  id: string;
  titulo: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  href: string;
};

function oppMatchesCarrera(opp: Opp, carrera: string): boolean {
  const carreras = parseCarreras(opp.carreras);
  return carreras.length === 0 || carreras.includes(carrera);
}

export function buildDashboardData(opts: {
  userCarrera: string;
  enrolledSubjects: Subject[];
  applications: App[];
  opportunities: Opp[];
  oppMap: Record<string, Opp>;
}) {
  const { userCarrera, enrolledSubjects, applications, opportunities, oppMap } = opts;

  const activeApps = applications.filter((a) => a.estado !== 'withdrawn');
  const appliedIds = new Set(activeApps.map((a) => a.opportunityId));
  const activeOpps = opportunities.filter((o) => o.activo);

  const events: DashboardEvent[] = [];

  for (const s of enrolledSubjects.slice(0, 4)) {
    events.push({
      id: `class-${s.id}`,
      titulo: s.nombre,
      tipo: 'Clase inscrita',
      fecha: s.horario,
      href: '/wiki',
      color: 'blue',
    });
  }

  for (const app of activeApps.filter((a) => a.estado === 'pending').slice(0, 3)) {
    const opp = oppMap[app.opportunityId];
    if (!opp) continue;
    events.push({
      id: `app-${app.opportunityId}`,
      titulo: opp.titulo,
      tipo: 'Aplicación pendiente',
      fecha: formatFecha(app.createdAt),
      href: '/bridge',
      color: 'orange',
    });
  }

  for (const app of activeApps.filter((a) => a.estado === 'accepted').slice(0, 2)) {
    const opp = oppMap[app.opportunityId];
    if (!opp) continue;
    events.push({
      id: `acc-${app.opportunityId}`,
      titulo: opp.titulo,
      tipo: 'Pasantía aceptada',
      fecha: formatFecha(app.createdAt),
      href: '/bridge',
      color: 'green',
    });
  }

  const alerts: DashboardAlert[] = [];

  if (!userCarrera) {
    alerts.push({
      id: 'no-carrera',
      texto: 'Configura tu carrera en el perfil',
      href: '/dashboard#mi-perfil',
      accion: 'Completar',
    });
  }

  if (enrolledSubjects.length === 0) {
    alerts.push({
      id: 'no-materias',
      texto: 'Inscríbete en materias del periodo',
      href: '/wiki',
      accion: 'Ir a Wiki',
    });
  }

  const oppsParaCarrera = userCarrera
    ? activeOpps.filter((o) => oppMatchesCarrera(o, userCarrera) && !appliedIds.has(o.id))
    : activeOpps.filter((o) => !appliedIds.has(o.id));

  if (oppsParaCarrera.length > 0) {
    alerts.push({
      id: 'nueva-opp',
      texto: `${oppsParaCarrera.length} pasantía(s) disponible(s) para ti`,
      href: '/bridge',
      accion: 'Ver y aplicar',
    });
  }

  const pendientes = activeApps.filter((a) => a.estado === 'pending').length;
  if (pendientes > 0) {
    alerts.push({
      id: 'apps-pendientes',
      texto: `Tienes ${pendientes} aplicación(es) en revisión`,
      href: '/bridge',
      accion: 'Ver estado',
    });
  }

  const rechazadas = activeApps.filter((a) => a.estado === 'rejected').length;
  if (rechazadas > 0) {
    alerts.push({
      id: 'apps-rechazadas',
      texto: `${rechazadas} aplicación(es) no fueron aceptadas`,
      href: '/bridge',
      accion: 'Revisar',
    });
  }

  if (activeApps.some((a) => a.estado === 'accepted')) {
    alerts.push({
      id: 'pasantia-ok',
      texto: '¡Felicidades! Tienes una pasantía aceptada',
      href: '/bridge',
      accion: 'Ver detalle',
    });
  }

  const tramites: DashboardTramite[] = [];

  if (!userCarrera) {
    tramites.push({
      id: 'tram-perfil',
      titulo: 'Completar datos de perfil',
      estado: 'pendiente',
      href: '/dashboard#mi-perfil',
    });
  } else {
    tramites.push({
      id: 'tram-perfil-ok',
      titulo: 'Datos de perfil',
      estado: 'completado',
      href: '/dashboard#mi-perfil',
    });
  }

  if (enrolledSubjects.length === 0) {
    tramites.push({
      id: 'tram-inscripcion',
      titulo: 'Inscripción de materias',
      estado: 'pendiente',
      href: '/wiki',
    });
  } else {
    tramites.push({
      id: 'tram-inscripcion-ok',
      titulo: `Inscripción de materias (${enrolledSubjects.length})`,
      estado: 'completado',
      href: '/wiki',
    });
  }

  if (userCarrera && activeApps.length === 0) {
    tramites.push({
      id: 'tram-pasantia',
      titulo: 'Solicitar pasantía o micro-proyecto',
      estado: 'pendiente',
      href: '/bridge',
    });
  } else if (activeApps.some((a) => a.estado === 'pending')) {
    tramites.push({
      id: 'tram-pasantia-proc',
      titulo: 'Solicitud de pasantía',
      estado: 'en_proceso',
      href: '/bridge',
    });
  } else if (activeApps.some((a) => a.estado === 'accepted')) {
    tramites.push({
      id: 'tram-pasantia-ok',
      titulo: 'Pasantía aprobada',
      estado: 'completado',
      href: '/bridge',
    });
  }

  return {
    events: events.slice(0, 6),
    alerts: alerts.slice(0, 5),
    tramites,
    pendingTramitesCount: tramites.filter(
      (t) => t.estado === 'pendiente' || t.estado === 'en_proceso'
    ).length,
  };
}
