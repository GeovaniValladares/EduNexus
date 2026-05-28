import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Briefcase, Users, X, Search, UserMinus, UserPlus } from 'lucide-react';
import { BRIDGE_TIPOS, CARRERAS, opportunityToForm } from '../../lib/bridge-admin-shared';
import { APPLICATION_ESTADOS, type BridgeAdminStudent, type BridgeApplication, type BridgeOpportunity } from '../../lib/bridge-types';
import type { ApplicationEstado } from '../../lib/bridge';
import { estadoLabel } from '../../lib/bridge';

export type BridgeAdminActions = {
  abrirPostulaciones: (opp: BridgeOpportunity) => void;
  abrirEditarOportunidad: (opp: BridgeOpportunity) => void;
  eliminarOportunidad: (opp: BridgeOpportunity) => void;
  reactivarOportunidad: (opp: BridgeOpportunity) => void;
};

type OppForm = ReturnType<typeof opportunityToForm>;

const emptyOppForm = (): OppForm => ({
  titulo: '',
  empresa: '',
  tipo: 'pasantia',
  horasSemanales: '15',
  duracionSemanas: '12',
  duracionLabel: '12 semanas',
  ubicacion: 'San Salvador',
  descripcion: '',
  requisitosText: '',
  carreras: [],
  activo: true,
});

interface BridgeAdminSectionProps {
  adminTab: 'oportunidades' | 'aplicaciones';
  onAdminTabChange: (tab: 'oportunidades' | 'aplicaciones') => void;
  opportunities: BridgeOpportunity[];
  onOpportunitiesChange: (list: BridgeOpportunity[]) => void;
  applications: BridgeApplication[];
  onApplicationsChange: (list: BridgeApplication[]) => void;
  applicationsByOpp: Record<string, BridgeApplication[]>;
  onApplicationsByOppChange: (map: Record<string, BridgeApplication[]>) => void;
  students: BridgeAdminStudent[];
  onMessage: (msg: { tipo: 'ok' | 'error'; texto: string }) => void;
  onActionsReady: (actions: BridgeAdminActions) => void;
}

export default function BridgeAdminSection({
  adminTab,
  onAdminTabChange,
  opportunities,
  onOpportunitiesChange,
  applications,
  onApplicationsChange,
  applicationsByOpp,
  onApplicationsByOppChange,
  students,
  onMessage,
  onActionsReady,
}: BridgeAdminSectionProps) {
  const [saving, setSaving] = useState(false);
  const [oppModal, setOppModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [oppForm, setOppForm] = useState<OppForm>(emptyOppForm);
  const [postModal, setPostModal] = useState<{ opp: BridgeOpportunity; apps: BridgeApplication[]; loading: boolean } | null>(null);
  const [alumnoPostular, setAlumnoPostular] = useState('');
  const [notaPostular, setNotaPostular] = useState('');
  const [busquedaApps, setBusquedaApps] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');

  const appsFiltradas = useMemo(() => {
    let list = applications;
    if (filtroEstado !== 'todas') list = list.filter((a) => a.estado === filtroEstado);
    const q = busquedaApps.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.titulo.toLowerCase().includes(q) ||
          a.empresa.toLowerCase().includes(q) ||
          (a.estudianteNombre ?? '').toLowerCase().includes(q) ||
          (a.estudianteEmail ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, busquedaApps, filtroEstado]);

  const alumnosParaPostular = useMemo(() => {
    if (!postModal) return [];
    const ids = new Set(postModal.apps.filter((a) => a.estado !== 'withdrawn').map((a) => a.userId));
    return students.filter((s) => !ids.has(s.id));
  }, [postModal, students]);

  const abrirCrear = () => {
    setOppForm(emptyOppForm());
    setOppModal({ mode: 'create' });
  };

  const abrirEditarOportunidad = (opp: BridgeOpportunity) => {
    setOppForm(opportunityToForm(opp));
    setOppModal({ mode: 'edit', id: opp.id });
  };

  const guardarOportunidad = async () => {
    setSaving(true);
    try {
      const isEdit = oppModal?.mode === 'edit';
      const body = {
        ...(isEdit ? { id: oppModal!.id } : {}),
        ...oppForm,
        horasSemanales: Number(oppForm.horasSemanales),
        duracionSemanas: Number(oppForm.duracionSemanas),
      };
      const res = await fetch('/api/bridge/admin/opportunities', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const saved = data.opportunity as BridgeOpportunity;
      if (isEdit) {
        onOpportunitiesChange(
          opportunities.map((o) =>
            o.id === saved.id
              ? { ...o, ...saved, postulaciones: o.postulaciones, aplicado: o.aplicado, applicationId: o.applicationId }
              : o
          )
        );
        onMessage({ tipo: 'ok', texto: 'Oportunidad actualizada' });
      } else {
        onOpportunitiesChange([...opportunities, { ...saved, postulaciones: 0, aplicado: false }]);
        onMessage({ tipo: 'ok', texto: 'Oportunidad creada' });
      }
      setOppModal(null);
    } catch (err) {
      onMessage({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const eliminarOportunidad = async (opp: BridgeOpportunity) => {
    if (!window.confirm(`¿Desactivar "${opp.titulo}"? Las aplicaciones existentes se conservan.`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bridge/admin/opportunities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opp.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      onOpportunitiesChange(
        opportunities.map((o) => (o.id === opp.id ? { ...o, activo: false } : o))
      );
      onMessage({ tipo: 'ok', texto: 'Oportunidad desactivada' });
    } catch (err) {
      onMessage({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const reactivarOportunidad = async (opp: BridgeOpportunity) => {
    setSaving(true);
    try {
      const res = await fetch('/api/bridge/admin/opportunities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...opportunityToForm(opp), id: opp.id, activo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onOpportunitiesChange(
        opportunities.map((o) => (o.id === opp.id ? { ...o, activo: true } : o))
      );
      onMessage({ tipo: 'ok', texto: 'Oportunidad reactivada' });
    } catch (err) {
      onMessage({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const abrirPostulaciones = async (opp: BridgeOpportunity) => {
    const cached = applicationsByOpp[opp.id];
    setPostModal({ opp, apps: cached ?? [], loading: !cached });
    setAlumnoPostular('');
    setNotaPostular('');

    if (cached) return;

    try {
      const res = await fetch(
        `/api/bridge/admin/applications?opportunityId=${encodeURIComponent(opp.id)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const apps = data.applications as BridgeApplication[];
      setPostModal({ opp, apps, loading: false });
      onApplicationsByOppChange({ ...applicationsByOpp, [opp.id]: apps });
    } catch {
      setPostModal({ opp, apps: [], loading: false });
      onMessage({ tipo: 'error', texto: 'No se pudieron cargar postulaciones' });
    }
  };

  const registrarPostulacion = async () => {
    if (!postModal || !alumnoPostular) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bridge/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: alumnoPostular,
          opportunityId: postModal.opp.id,
          mensaje: notaPostular,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const app = data.application as BridgeApplication;
      const updated = [...postModal.apps, app];
      setPostModal({ ...postModal, apps: updated });
      onApplicationsByOppChange({ ...applicationsByOpp, [postModal.opp.id]: updated });
      onApplicationsChange([app, ...applications]);
      onOpportunitiesChange(
        opportunities.map((o) =>
          o.id === postModal.opp.id ? { ...o, postulaciones: (o.postulaciones ?? 0) + 1 } : o
        )
      );
      setAlumnoPostular('');
      setNotaPostular('');
      onMessage({ tipo: 'ok', texto: 'Postulación registrada' });
    } catch (err) {
      onMessage({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (app: BridgeApplication, estado: ApplicationEstado) => {
    setSaving(true);
    try {
      const res = await fetch('/api/bridge/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const updated = data.application as BridgeApplication;
      const patch = (list: BridgeApplication[]) =>
        list.map((a) => (a.id === app.id ? { ...a, ...updated } : a));

      if (postModal) {
        setPostModal({ ...postModal, apps: patch(postModal.apps) });
        onApplicationsByOppChange({ ...applicationsByOpp, [postModal.opp.id]: patch(postModal.apps) });
      }
      onApplicationsChange(patch(applications));
      onMessage({ tipo: 'ok', texto: `Estado: ${estadoLabel(estado)}` });
    } catch (err) {
      onMessage({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const darDeBajaApp = async (app: BridgeApplication) => {
    if (!window.confirm(`¿Dar de baja a ${app.estudianteNombre}?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bridge/admin/applications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const remove = (list: BridgeApplication[]) => list.filter((a) => a.id !== app.id);
      if (postModal) {
        const next = remove(postModal.apps);
        setPostModal({ ...postModal, apps: next });
        onApplicationsByOppChange({ ...applicationsByOpp, [postModal.opp.id]: next });
        onOpportunitiesChange(
          opportunities.map((o) =>
            o.id === postModal.opp.id
              ? { ...o, postulaciones: Math.max(0, (o.postulaciones ?? 1) - 1) }
              : o
          )
        );
      }
      onApplicationsChange(remove(applications));
      onMessage({ tipo: 'ok', texto: 'Postulación dada de baja' });
    } catch (err) {
      onMessage({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    onActionsReady({
      abrirPostulaciones,
      abrirEditarOportunidad,
      eliminarOportunidad,
      reactivarOportunidad,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';

  const toggleCarrera = (c: string) => {
    setOppForm((f) => ({
      ...f,
      carreras: f.carreras.includes(c) ? f.carreras.filter((x) => x !== c) : [...f.carreras, c],
    }));
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => onAdminTabChange('oportunidades')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            adminTab === 'oportunidades' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          <Briefcase size={16} className="inline mr-1" />
          Oportunidades ({opportunities.length})
        </button>
        <button
          type="button"
          onClick={() => onAdminTabChange('aplicaciones')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            adminTab === 'aplicaciones' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          <Users size={16} className="inline mr-1" />
          Postulaciones ({applications.length})
        </button>
        <div className="flex-1" />
        {adminTab === 'oportunidades' ? (
          <button
            type="button"
            onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Plus size={18} />
            Nueva oportunidad
          </button>
        ) : null}
      </div>

      {adminTab === 'aplicaciones' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="search"
                value={busquedaApps}
                onChange={(e) => setBusquedaApps(e.target.value)}
                placeholder="Buscar por título, alumno..."
                className="w-full pl-9 py-2 border rounded-lg text-sm"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
              aria-label="Filtrar por estado"
            >
              <option value="todas">Todos los estados</option>
              {APPLICATION_ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Oportunidad</th>
                  <th className="px-4 py-3 text-left">Estudiante</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appsFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No hay postulaciones con esos filtros.
                    </td>
                  </tr>
                ) : (
                  appsFiltradas.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{app.titulo}</p>
                        <p className="text-xs text-gray-500">{app.empresa}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{app.estudianteNombre}</p>
                        <p className="text-xs text-gray-500">{app.estudianteEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={app.estado}
                          onChange={(e) => cambiarEstado(app, e.target.value as ApplicationEstado)}
                          disabled={saving}
                          className="text-xs border rounded px-2 py-1"
                          aria-label="Cambiar estado"
                        >
                          {APPLICATION_ESTADOS.map((e) => (
                            <option key={e.value} value={e.value}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{app.fecha}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => darDeBajaApp(app)}
                          className="text-red-600 text-xs font-medium hover:underline"
                        >
                          Dar de baja
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {oppModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold">
                {oppModal.mode === 'create' ? 'Nueva oportunidad' : 'Editar oportunidad'}
              </h3>
              <button type="button" onClick={() => setOppModal(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Título</label>
                <input className={inputClass} value={oppForm.titulo} onChange={(e) => setOppForm({ ...oppForm, titulo: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Empresa</label>
                <input className={inputClass} value={oppForm.empresa} onChange={(e) => setOppForm({ ...oppForm, empresa: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Tipo</label>
                <select className={inputClass} value={oppForm.tipo} onChange={(e) => setOppForm({ ...oppForm, tipo: e.target.value as OppForm['tipo'] })}>
                  {BRIDGE_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Horas/semana</label>
                <input type="number" min={1} className={inputClass} value={oppForm.horasSemanales} onChange={(e) => setOppForm({ ...oppForm, horasSemanales: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Semanas</label>
                <input type="number" min={1} className={inputClass} value={oppForm.duracionSemanas} onChange={(e) => setOppForm({ ...oppForm, duracionSemanas: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Etiqueta duración</label>
                <input className={inputClass} value={oppForm.duracionLabel} onChange={(e) => setOppForm({ ...oppForm, duracionLabel: e.target.value })} placeholder="12 semanas" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Ubicación</label>
                <input className={inputClass} value={oppForm.ubicacion} onChange={(e) => setOppForm({ ...oppForm, ubicacion: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Descripción</label>
                <textarea rows={3} className={inputClass} value={oppForm.descripcion} onChange={(e) => setOppForm({ ...oppForm, descripcion: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Requisitos (separados por coma)</label>
                <input className={inputClass} value={oppForm.requisitosText} onChange={(e) => setOppForm({ ...oppForm, requisitosText: e.target.value })} placeholder="React, Git, SQL" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600 mb-2 block">Carreras (vacío = todas)</label>
                <div className="flex flex-wrap gap-2">
                  {CARRERAS.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs border rounded px-2 py-1 cursor-pointer">
                      <input type="checkbox" checked={oppForm.carreras.includes(c)} onChange={() => toggleCarrera(c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={oppForm.activo} onChange={(e) => setOppForm({ ...oppForm, activo: e.target.checked })} />
                Publicada (visible para estudiantes)
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={guardarOportunidad} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setOppModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {postModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between">
              <div>
                <h3 className="text-lg font-bold">Postulaciones — {postModal.opp.titulo}</h3>
                <p className="text-sm text-gray-500">{postModal.apps.filter((a) => a.estado !== 'withdrawn').length} activa(s)</p>
              </div>
              <button type="button" onClick={() => setPostModal(null)} aria-label="Cerrar"><X size={22} /></button>
            </div>
            <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-600 block mb-1">Registrar alumno</label>
                <select value={alumnoPostular} onChange={(e) => setAlumnoPostular(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Seleccionar...</option>
                  {alumnosParaPostular.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre} ({s.email})</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={notaPostular}
                onChange={(e) => setNotaPostular(e.target.value)}
                placeholder="Mensaje (opcional)"
                className="flex-1 min-w-[140px] px-3 py-2 border rounded-lg text-sm"
              />
              <button type="button" onClick={registrarPostulacion} disabled={!alumnoPostular || saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
                <UserPlus size={16} className="inline mr-1" />
                Registrar
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {postModal.loading ? (
                <p className="text-center text-gray-500 py-8">Cargando...</p>
              ) : postModal.apps.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Sin postulaciones.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="text-left py-2">Alumno</th>
                      <th className="text-left py-2">Estado</th>
                      <th className="text-right py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {postModal.apps.map((app) => (
                      <tr key={app.id}>
                        <td className="py-3">
                          <p className="font-medium">{app.estudianteNombre}</p>
                          <p className="text-xs text-gray-500">{app.estudianteEmail}</p>
                        </td>
                        <td className="py-3">
                          <select
                            value={app.estado}
                            onChange={(e) => cambiarEstado(app, e.target.value as ApplicationEstado)}
                            disabled={saving}
                            className="text-xs border rounded px-2 py-1"
                          >
                            {APPLICATION_ESTADOS.map((e) => (
                              <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 text-right">
                          <button type="button" onClick={() => darDeBajaApp(app)} className="text-red-600 text-xs hover:underline inline-flex items-center gap-1">
                            <UserMinus size={14} /> Baja
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
