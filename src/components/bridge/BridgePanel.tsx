import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Briefcase,
  Clock,
  MapPin,
  X,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Eye,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import { isAdmin as checkIsAdmin } from '../../lib/roles';
import type { BridgeApplication, BridgeOpportunity } from '../../lib/bridge-types';
import BridgeAdminSection, { type BridgeAdminActions, type BridgeAdminStudent } from './BridgeAdminSection';

export type { BridgeOpportunity, BridgeApplication };
import {
  filterBridgeOpportunities,
  type BridgeDurationFilter,
  type BridgeHoursFilter,
  type BridgeTypeFilter,
} from '../../lib/bridge-filters';
import {
  parseRequisitos,
  parseCarreras,
  tipoLabel,
  tipoBadgeClass,
  estadoLabel,
  formatFecha,
  type ApplicationEstado,
} from '../../lib/bridge';

interface BridgePanelProps {
  userCarrera: string;
  userRole: string;
  hasCv: boolean;
  opportunities: BridgeOpportunity[];
  applications: BridgeApplication[];
  initialAdminApplications?: BridgeApplication[];
  applicationsByOpp?: Record<string, BridgeApplication[]>;
  initialStudents?: BridgeAdminStudent[];
  stats: {
    totalOpportunities: number;
    myApplications: number;
    hoursAccumulated: number;
  };
}

export default function BridgePanel({
  userCarrera,
  userRole,
  hasCv: initialHasCv,
  opportunities: initialOpportunities,
  applications: initialApplications,
  initialAdminApplications = [],
  applicationsByOpp: initialApplicationsByOpp = {},
  initialStudents = [],
  stats: initialStats,
}: BridgePanelProps) {
  const isAdmin = checkIsAdmin(userRole);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [applications, setApplications] = useState(initialApplications);
  const [adminApplications, setAdminApplications] = useState(initialAdminApplications);
  const [applicationsByOpp, setApplicationsByOpp] = useState(initialApplicationsByOpp);
  const [adminTab, setAdminTab] = useState<'oportunidades' | 'aplicaciones'>('oportunidades');
  const adminActionsRef = useRef<BridgeAdminActions | null>(null);
  const [stats, setStats] = useState(initialStats);

  const [typeFilter, setTypeFilter] = useState<BridgeTypeFilter>('all');
  const [hoursFilter, setHoursFilter] = useState<BridgeHoursFilter>('all');
  const [durationFilter, setDurationFilter] = useState<BridgeDurationFilter>('all');
  const [busqueda, setBusqueda] = useState('');
  const [ubicacionFiltro, setUbicacionFiltro] = useState('todas');
  const [soloMiCarrera, setSoloMiCarrera] = useState(Boolean(userCarrera?.trim()));

  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [detalleOpp, setDetalleOpp] = useState<BridgeOpportunity | null>(null);
  const [aplicarOpp, setAplicarOpp] = useState<BridgeOpportunity | null>(null);
  const [notaAplicacion, setNotaAplicacion] = useState('');
  const [adjuntarCv, setAdjuntarCv] = useState(initialHasCv);
  const [hasCv, setHasCv] = useState(initialHasCv);

  const [editarApp, setEditarApp] = useState<BridgeApplication | null>(null);
  const [notaEditar, setNotaEditar] = useState('');

  const ubicacionesDisponibles = useMemo(
    () => [...new Set(opportunities.map((o) => o.ubicacion))].sort(),
    [opportunities]
  );

  const filtradas = useMemo(
    () =>
      filterBridgeOpportunities(opportunities, {
        typeFilter,
        hoursFilter,
        durationFilter,
        busqueda,
        ubicacion: ubicacionFiltro,
        soloMiCarrera: isAdmin ? false : soloMiCarrera,
        userCarrera: isAdmin ? '' : userCarrera,
        soloActivas: !isAdmin,
      }),
    [
      opportunities,
      typeFilter,
      hoursFilter,
      durationFilter,
      busqueda,
      ubicacionFiltro,
      soloMiCarrera,
      userCarrera,
      isAdmin,
    ]
  );

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    typeFilter !== 'all' ||
    hoursFilter !== 'all' ||
    durationFilter !== 'all' ||
    ubicacionFiltro !== 'todas' ||
    (userCarrera?.trim() ? !soloMiCarrera : false);

  const limpiarFiltros = () => {
    setBusqueda('');
    setTypeFilter('all');
    setHoursFilter('all');
    setDurationFilter('all');
    setUbicacionFiltro('todas');
    setSoloMiCarrera(Boolean(userCarrera?.trim()));
  };

  const aplicacionesActivas = applications.filter((a) => a.estado !== 'withdrawn');

  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(() => setMensaje(null), 5000);
    return () => window.clearTimeout(t);
  }, [mensaje]);

  const handleAplicar = async () => {
    if (!aplicarOpp) return;
    setLoadingId(aplicarOpp.id);
    setMensaje(null);
    try {
      const res = await fetch('/api/bridge/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: aplicarOpp.id,
          mensaje: notaAplicacion,
          adjuntarCv,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo aplicar');

      const appId = data.application.id as string;
      const nuevaApp: BridgeApplication = {
        id: appId,
        opportunityId: aplicarOpp.id,
        titulo: aplicarOpp.titulo,
        empresa: aplicarOpp.empresa,
        estado: 'pending',
        mensaje: notaAplicacion,
        fecha: formatFecha(new Date()),
        horasSemanales: aplicarOpp.horasSemanales,
      };

      setApplications((prev) => [nuevaApp, ...prev]);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === aplicarOpp.id ? { ...o, aplicado: true, applicationId: appId } : o
        )
      );
      setStats((s) => ({ ...s, myApplications: s.myApplications + 1 }));
      setAplicarOpp(null);
      setNotaAplicacion('');
      setMensaje({ tipo: 'ok', texto: '¡Aplicación enviada correctamente!' });
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleRetirar = async (app: BridgeApplication) => {
    if (!confirm('¿Retirar esta aplicación?')) return;
    setLoadingId(app.id);
    setMensaje(null);
    try {
      const res = await fetch('/api/bridge/apply', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo retirar');

      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === app.opportunityId ? { ...o, aplicado: false, applicationId: undefined } : o
        )
      );
      setStats((s) => ({ ...s, myApplications: Math.max(0, s.myApplications - 1) }));
      setMensaje({ tipo: 'ok', texto: 'Aplicación retirada' });
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!editarApp) return;
    setLoadingId(editarApp.id);
    setMensaje(null);
    try {
      const res = await fetch('/api/bridge/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: editarApp.id, mensaje: notaEditar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo guardar');

      setApplications((prev) =>
        prev.map((a) => (a.id === editarApp.id ? { ...a, mensaje: notaEditar } : a))
      );
      setEditarApp(null);
      setMensaje({ tipo: 'ok', texto: 'Mensaje de aplicación actualizado' });
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const puedeAplicar = (opp: BridgeOpportunity) => {
    if (opp.aplicado) return false;
    if (opp.carreras.length === 0) return true;
    if (!userCarrera) return true;
    return opp.carreras.includes(userCarrera);
  };

  const renderModal = () => {
    if (detalleOpp) {
      return (
        <Modal onClose={() => setDetalleOpp(null)} title={detalleOpp.titulo}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded ${tipoBadgeClass(detalleOpp.tipo)}`}>
                {tipoLabel(detalleOpp.tipo)}
              </span>
              {detalleOpp.aplicado && (
                <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                  ✓ Ya aplicaste
                </span>
              )}
            </div>
            <p className="text-gray-600 font-medium">{detalleOpp.empresa}</p>
            <p className="text-gray-700 text-sm leading-relaxed">{detalleOpp.descripcion}</p>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                {detalleOpp.horasSemanales}h/semana · {detalleOpp.duracionLabel}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                {detalleOpp.ubicacion}
              </div>
            </div>
            {detalleOpp.carreras.length > 0 && (
              <p className="text-xs text-gray-500">
                Carreras: {detalleOpp.carreras.join(', ')}
              </p>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Requisitos</p>
              <div className="flex flex-wrap gap-2">
                {detalleOpp.requisitos.map((r) => (
                  <span key={r} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDetalleOpp(null);
                  if (puedeAplicar(detalleOpp)) {
                    setAplicarOpp(detalleOpp);
                    setNotaAplicacion('');
                  }
                }}
                disabled={!puedeAplicar(detalleOpp)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
              >
                {detalleOpp.aplicado ? 'Ya aplicaste' : 'Aplicar ahora'}
              </button>
              <button
                type="button"
                onClick={() => setDetalleOpp(null)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      );
    }

    if (aplicarOpp) {
      return (
        <Modal onClose={() => setAplicarOpp(null)} title={`Aplicar: ${aplicarOpp.titulo}`}>
          <p className="text-sm text-gray-600 mb-4">{aplicarOpp.empresa}</p>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje para la empresa (opcional)
          </label>
          <textarea
            value={notaAplicacion}
            onChange={(e) => setNotaAplicacion(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Cuéntanos por qué te interesa esta oportunidad..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 mb-1"
          />
          <p className="text-xs text-gray-400 mb-3">{notaAplicacion.length}/2000</p>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adjuntarCv}
                onChange={(e) => setAdjuntarCv(e.target.checked)}
                disabled={!hasCv}
                className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium">Adjuntar mi CV</span>
                {hasCv
                  ? ' — se enviará el curriculum guardado en Lía'
                  : ' — guarda tu CV en Lía primero'}
              </span>
            </label>
            {!hasCv && (
              <a
                href="/concierge#mi-cv"
                className="text-xs text-indigo-600 font-medium hover:underline mt-2 inline-block"
              >
                Crear CV con Lía →
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAplicar}
              disabled={loadingId === aplicarOpp.id || (adjuntarCv && !hasCv)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
            >
              {loadingId === aplicarOpp.id ? 'Enviando...' : 'Confirmar aplicación'}
            </button>
            <button
              type="button"
              onClick={() => setAplicarOpp(null)}
              className="px-4 py-2 border rounded-lg text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      );
    }

    if (editarApp) {
      return (
        <Modal onClose={() => setEditarApp(null)} title="Editar aplicación">
          <p className="text-sm text-gray-600 mb-2">{editarApp.titulo}</p>
          <textarea
            value={notaEditar}
            onChange={(e) => setNotaEditar(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGuardarEdicion}
              disabled={loadingId === editarApp.id}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {loadingId === editarApp.id ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => setEditarApp(null)}
              className="px-4 py-2 border rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      );
    }

    return null;
  };

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-900 border border-red-200 flex items-center gap-2">
          <Shield size={18} className="shrink-0" />
          <span>
            <strong>Modo administrador:</strong> gestiona pasantías, proyectos, empleos y postulaciones
            (crear, editar, desactivar, aceptar o rechazar).
          </span>
        </div>
      )}

      {isAdmin && (
        <BridgeAdminSection
          adminTab={adminTab}
          onAdminTabChange={setAdminTab}
          opportunities={opportunities}
          onOpportunitiesChange={setOpportunities}
          applications={adminApplications}
          onApplicationsChange={setAdminApplications}
          applicationsByOpp={applicationsByOpp}
          onApplicationsByOppChange={setApplicationsByOpp}
          students={initialStudents}
          onMessage={setMensaje}
          onActionsReady={(actions) => {
            adminActionsRef.current = actions;
          }}
        />
      )}

      {!isAdmin && !userCarrera && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-amber-50 text-amber-900 border border-amber-200">
          Configura tu carrera en el{' '}
          <a href="/dashboard" className="font-semibold underline hover:text-amber-700">
            dashboard
          </a>{' '}
          para ver las pasantías disponibles para tu programa.
        </div>
      )}

      {mensaje && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Oportunidades Disponibles</p>
          <p className="text-2xl font-bold text-blue-900">{stats.totalOpportunities}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Mis Aplicaciones</p>
          <p className="text-2xl font-bold text-green-900">{stats.myApplications}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600 font-medium">Horas Acumuladas</p>
          <p className="text-2xl font-bold text-slate-900">{stats.hoursAccumulated}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-4">Filtros</h3>

            <div className="mb-4">
              <label htmlFor="bridge-buscar" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                <input
                  id="bridge-buscar"
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Título, empresa, ubicación..."
                  autoComplete="off"
                  className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-600"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {userCarrera?.trim() && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={soloMiCarrera}
                  onChange={(e) => setSoloMiCarrera(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Solo para mi carrera
              </label>
            )}

            <div className="mb-4">
              <label htmlFor="bridge-ubicacion" className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación
              </label>
              <select
                id="bridge-ubicacion"
                value={ubicacionFiltro}
                onChange={(e) => setUbicacionFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todas">Todas las ubicaciones</option>
                {ubicacionesDisponibles.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Tipo</label>
              <div className="space-y-2 text-sm">
                {(
                  [
                    ['all', 'Todas'],
                    ['micro', 'Micro-pasantías'],
                    ['pasantia', 'Pasantías'],
                    ['job', 'Empleos'],
                    ['project', 'Proyectos'],
                  ] as const
                ).map(([val, label]) => (
                  <label key={val} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={typeFilter === val}
                      onChange={() => setTypeFilter(val)}
                      className="rounded-full"
                    />
                    <span className="ml-2 text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Horas semanales</label>
              <select
                value={hoursFilter}
                onChange={(e) => setHoursFilter(e.target.value as BridgeHoursFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Todas</option>
                <option value="1-10">1-10 horas</option>
                <option value="10-20">10-20 horas</option>
                <option value="20-40">20+ horas</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Duración</label>
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value as BridgeDurationFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Todas</option>
                <option value="short">Hasta 4 semanas</option>
                <option value="medium">5-12 semanas</option>
                <option value="long">Más de 12 semanas</option>
              </select>
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1 mb-3"
              >
                Limpiar filtros
              </button>
            )}

            <p className="text-xs text-gray-500 pt-2 border-t">
              {filtradas.length} de {opportunities.length} oportunidad(es)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-4">Mi desempeño</h3>
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Horas de pasantía</span>
                <span className="font-medium">
                  {stats.hoursAccumulated}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.hoursAccumulated)}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-8">
          {(!isAdmin || adminTab === 'oportunidades') && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isAdmin ? 'Catálogo de oportunidades' : 'Oportunidades disponibles'}
            </h2>
            <div className="space-y-4">
              {filtradas.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  No hay oportunidades con los filtros seleccionados.
                </div>
              ) : (
                filtradas.map((opp) => (
                  <article
                    key={opp.id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{opp.titulo}</h3>
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${tipoBadgeClass(opp.tipo)}`}
                          >
                            {tipoLabel(opp.tipo)}
                          </span>
                          {isAdmin && !opp.activo && (
                            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">
                              Inactiva
                            </span>
                          )}
                          {isAdmin && (
                            <span className="text-xs text-gray-500">
                              {opp.postulaciones ?? 0} postulación(es)
                            </span>
                          )}
                          {!isAdmin && opp.aplicado && (
                            <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                              ✓ Aplicado
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 font-medium">{opp.empresa}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setDetalleOpp(opp)}
                          className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                        >
                          <Eye size={16} />
                          Detalles
                        </button>
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => adminActionsRef.current?.abrirPostulaciones(opp)}
                              className="flex items-center gap-1 px-3 py-2 text-sm text-indigo-700 bg-indigo-50 rounded-lg"
                            >
                              <Users size={16} />
                              Postulaciones
                            </button>
                            <button
                              type="button"
                              onClick={() => adminActionsRef.current?.abrirEditarOportunidad(opp)}
                              className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                            >
                              <Pencil size={16} />
                              Editar
                            </button>
                            {opp.activo ? (
                              <button
                                type="button"
                                onClick={() => adminActionsRef.current?.eliminarOportunidad(opp)}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                                Desactivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => adminActionsRef.current?.reactivarOportunidad(opp)}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-green-700 bg-green-50 rounded-lg"
                              >
                                Reactivar
                              </button>
                            )}
                          </>
                        ) : puedeAplicar(opp) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAplicarOpp(opp);
                              setNotaAplicacion('');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                          >
                            Aplicar
                          </button>
                        ) : opp.aplicado ? null : (
                          <span className="text-xs text-gray-500 py-2 max-w-[120px] text-right">
                            No disponible para tu carrera
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{opp.descripcion}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock size={16} className="text-gray-400" />
                        {opp.horasSemanales}h/semana
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={16} className="text-gray-400" />
                        {opp.duracionLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={16} className="text-gray-400" />
                        {opp.ubicacion}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opp.requisitos.slice(0, 4).map((r) => (
                        <span key={r} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {r}
                        </span>
                      ))}
                      {opp.requisitos.length > 4 && (
                        <span className="text-xs text-gray-500">+{opp.requisitos.length - 4}</span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
          )}

          {!isAdmin && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Mis aplicaciones ({aplicacionesActivas.length})
            </h2>
            {aplicacionesActivas.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Aún no has aplicado a ninguna oportunidad. ¡Explora las disponibles arriba!
              </div>
            ) : (
              <div className="space-y-3">
                {aplicacionesActivas.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    loading={loadingId === app.id}
                    onEdit={() => {
                      setEditarApp(app);
                      setNotaEditar(app.mensaje);
                    }}
                    onWithdraw={() => handleRetirar(app)}
                    onView={() => {
                      const opp = opportunities.find((o) => o.id === app.opportunityId);
                      if (opp) setDetalleOpp(opp);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          )}
        </div>
      </div>

      {renderModal()}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-gray-900 mb-4 pr-8">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ApplicationCard({
  app,
  loading,
  onEdit,
  onWithdraw,
  onView,
}: {
  app: BridgeApplication;
  loading: boolean;
  onEdit: () => void;
  onWithdraw: () => void;
  onView: () => void;
}) {
  const color =
    app.estado === 'pending'
      ? 'bg-yellow-50 border-yellow-200'
      : app.estado === 'accepted'
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200';

  const Icon =
    app.estado === 'pending' ? Clock : app.estado === 'accepted' ? CheckCircle : XCircle;

  const iconColor =
    app.estado === 'pending'
      ? 'text-yellow-500'
      : app.estado === 'accepted'
        ? 'text-green-500'
        : 'text-red-500';

  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900">{app.titulo}</h4>
          <p className="text-sm text-gray-600">{app.empresa}</p>
          <p className="text-xs text-gray-500 mt-1">Aplicado: {app.fecha}</p>
          {app.mensaje && (
            <p className="text-sm text-gray-700 mt-2 italic line-clamp-2">&quot;{app.mensaje}&quot;</p>
          )}
        </div>
        <div className="flex flex-col items-center shrink-0">
          <Icon size={20} className={iconColor} />
          <span className="text-xs font-medium text-gray-600 mt-1">{estadoLabel(app.estado)}</span>
        </div>
      </div>
      {app.estado === 'pending' && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-black/5">
          <button
            type="button"
            onClick={onView}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-white border hover:bg-gray-50"
          >
            <Eye size={14} /> Ver oportunidad
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-white border hover:bg-gray-50"
          >
            <Pencil size={14} /> Editar mensaje
          </button>
          <button
            type="button"
            onClick={onWithdraw}
            disabled={loading}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-white border text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} /> {loading ? '...' : 'Retirar'}
          </button>
        </div>
      )}
    </div>
  );
}
