import { useState, useEffect } from 'react';
import {
  Users, Briefcase, FileText, CheckCircle, XCircle, Clock,
  ChevronRight, ExternalLink, Download, Search, Filter, Mail,
  Calendar, Building2, User, Eye, ArrowLeft, Plus, Edit2, Trash2, Save, X, ChevronDown, Check
} from 'lucide-react';
import { CARRERAS } from '../../lib/carreras';

type Application = {
  id: string;
  estado: string;
  mensaje: string;
  cvText: string;
  createdAt: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  opportunityTitle: string;
  opportunityId: string;
};

type Opportunity = {
  id: string;
  titulo: string;
  tipo: string;
  horasSemanales: number;
  duracionSemanas: number;
  duracionLabel: string;
  ubicacion: string;
  descripcion: string;
  requisitos: string; // JSON string
  carreras: string; // JSON string
  activo: boolean;
};

type View = 'applications' | 'vacancies' | 'create-vacancy' | 'edit-vacancy';

export default function CompanyPanel() {
  const [view, setView] = useState<View>('applications');
  const [apps, setApps] = useState<Application[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Form state for vacancy
  const [formData, setFormData] = useState<Partial<Opportunity>>({
    titulo: '',
    tipo: 'Pasantía',
    horasSemanales: 20,
    duracionSemanas: 12,
    duracionLabel: '3 meses',
    ubicacion: '',
    descripcion: '',
    requisitos: '[]',
    carreras: '[]',
    activo: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Application update state
  const [appComment, setAppComment] = useState('');
  const [updatingApp, setUpdatingApp] = useState(false);

  useEffect(() => {
    fetchApps();
    fetchOpps();
  }, []);

  const fetchApps = async () => {
    try {
      const r = await fetch('/api/empresa/applications');
      if (r.ok) {
        const d = await r.json();
        setApps(d.applications ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOpps = async () => {
    try {
      const r = await fetch('/api/empresa/opportunities');
      if (r.ok) {
        const d = await r.json();
        setOpps(d.opportunities ?? []);
      }
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingApp(true);
    try {
      const r = await fetch('/api/empresa/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: newStatus, comentario: appComment }),
      });
      if (r.ok) {
        setApps(prev => prev.map(a => a.id === id ? { ...a, estado: newStatus } : a));
        if (selectedApp?.id === id) setSelectedApp({ ...selectedApp, estado: newStatus });
        setAppComment('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingApp(false);
    }
  };

  const handleSaveVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { ...formData, id: editingId } : formData;

    try {
      const r = await fetch('/api/empresa/opportunities', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        fetchOpps();
        setView('vacancies');
        setEditingId(null);
        setFormData({
          titulo: '', tipo: 'Pasantía', horasSemanales: 20, duracionSemanas: 12,
          duracionLabel: '3 meses', ubicacion: '', descripcion: '',
          requisitos: '[]', carreras: '[]', activo: true
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteVacancy = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar esta vacante?')) return;
    try {
      const r = await fetch('/api/empresa/opportunities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (r.ok) setOpps(prev => prev.filter(o => o.id !== id));
    } catch (e) { console.error(e); }
  };

  const openEdit = (o: Opportunity) => {
    setFormData(o);
    setEditingId(o.id);
    setView('edit-vacancy');
  };

  const filteredApps = apps.filter(a => {
    const matchesFilter = filter === 'all' || a.estado === filter;
    const matchesSearch = a.studentName.toLowerCase().includes(search.toLowerCase()) ||
                         a.opportunityTitle.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      shortlisted: 'bg-blue-100 text-blue-700 border-blue-200',
      viewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    const labels: Record<string, string> = {
      pending: 'Inscrito',
      accepted: 'Aceptado',
      rejected: 'Descartado',
      shortlisted: 'En proceso',
      viewed: 'CV Leído',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const parseJsonArr = (json: string) => {
    try { return JSON.parse(json || '[]'); } catch { return []; }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 italic">Cargando datos del panel...</div>;

  return (
    <div className="company-panel space-y-8">
      {/* Navigation Tabs */}
      {!selectedApp && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setView('applications')}
            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${view === 'applications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={16} className="inline mr-2" /> Aplicaciones
          </button>
          <button
            onClick={() => setView('vacancies')}
            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${view === 'vacancies' || view === 'create-vacancy' || view === 'edit-vacancy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Briefcase size={16} className="inline mr-2" /> Mis Vacantes
          </button>
        </div>
      )}

      {selectedApp ? (
        /* CV Detail View */
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setSelectedApp(null)}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={16} /> Volver al listado
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-900 px-8 py-10 text-white">
                  <h2 className="text-3xl font-bold">{selectedApp.studentName}</h2>
                  <p className="text-slate-400 mt-1 flex items-center gap-2">
                    <Mail size={14} /> {selectedApp.studentEmail}
                  </p>
                </div>
                <div className="p-8">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Currículum Vitae</h3>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    {selectedApp.cvText || "El estudiante no ha proporcionado texto de CV."}
                  </pre>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Detalle de Aplicación</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Oportunidad</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedApp.opportunityTitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Estado Actual</p>
                    <div className="mt-1">{getStatusBadge(selectedApp.estado)}</div>
                  </div>
                  {selectedApp.mensaje && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Mensaje del candidato</p>
                      <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-100 italic">"{selectedApp.mensaje}"</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Comentario para el alumno</label>
                    <textarea
                      value={appComment}
                      onChange={(e) => setAppComment(e.target.value)}
                      placeholder="Ej. Te contactaremos pronto para una entrevista..."
                      className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      disabled={updatingApp}
                      onClick={() => updateStatus(selectedApp.id, 'shortlisted')} 
                      className="w-full py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-all disabled:opacity-50"
                    >
                      Mover a En proceso
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        disabled={updatingApp}
                        onClick={() => updateStatus(selectedApp.id, 'accepted')} 
                        className="py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                      >
                        Aceptar
                      </button>
                      <button 
                        disabled={updatingApp}
                        onClick={() => updateStatus(selectedApp.id, 'rejected')} 
                        className="py-2 bg-white text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        Descartar
                      </button>
                    </div>
                    <button 
                      disabled={updatingApp}
                      onClick={() => updateStatus(selectedApp.id, 'viewed')} 
                      className="w-full py-2 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
                    >
                      Marcar como CV Leído
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : view === 'applications' ? (
        /* Applications List */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-blue-600" size={24} /> Aplicaciones Recibidas
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar candidato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all w-64" />
              </div>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Filter size={14} className="text-slate-400 ml-1" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent text-sm text-slate-600 outline-none border-none py-1 focus:ring-0">
                  <option value="all">Todos</option>
                  <option value="pending">Inscrito</option>
                  <option value="shortlisted">En proceso</option>
                  <option value="accepted">Aceptados</option>
                  <option value="rejected">Descartados</option>
                  <option value="viewed">CV Leído</option>
                </select>
              </div>
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-20 text-center text-slate-500">No hay aplicaciones registradas.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredApps.map((a) => (
                <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex items-center gap-4" onClick={() => setSelectedApp(a)}>
                  <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                    {a.studentAvatar ? <img src={a.studentAvatar} alt="" className="w-full h-full object-cover rounded-full" /> : a.studentName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 truncate">{a.studentName}</h3>
                      {getStatusBadge(a.estado)}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Briefcase size={12} /> {a.opportunityTitle}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === 'vacancies' ? (
        /* Vacancies List */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="text-blue-600" size={24} /> Mis Vacantes Publicadas
            </h2>
            <button onClick={() => setView('create-vacancy')} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md">
              <Plus size={16} /> Publicar Nueva
            </button>
          </div>

          {opps.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-20 text-center text-slate-500">No has publicado ninguna vacante todavía.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opps.map((o) => (
                <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-300 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight mb-1">{o.titulo}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${o.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {o.activo ? 'Activa' : 'Cerrada'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(o)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteVacancy(o.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5"><Clock size={12} /> {o.tipo}</p>
                    <p className="flex items-center gap-1.5"><Calendar size={12} /> {o.duracionLabel}</p>
                    <p className="flex items-center gap-1.5 col-span-2"><Building2 size={12} /> {o.ubicacion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Vacancy Form (Create/Edit) */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('vacancies')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
            <h2 className="text-2xl font-bold text-slate-900">{editingId ? 'Editar Vacante' : 'Publicar Nueva Vacante'}</h2>
          </div>

          <form onSubmit={handleSaveVacancy} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Título de la Posición</label>
                <input required type="text" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="Ej. Desarrollador Web Frontend Pasantía" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                  <option>Pasantía</option>
                  <option>Micro-proyecto</option>
                  <option>Empleo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ubicación</label>
                <input required type="text" value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} placeholder="Ej. San Salvador (Híbrido)" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Duración</label>
                <input required type="text" value={formData.duracionLabel} onChange={(e) => setFormData({...formData, duracionLabel: e.target.value})} placeholder="Ej. 3 meses" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Horas semanales</label>
                <input required type="number" value={formData.horasSemanales} onChange={(e) => setFormData({...formData, horasSemanales: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción de la vacante</label>
                <textarea required rows={5} value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} placeholder="Describe las tareas y el perfil buscado..." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"></textarea>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Carreras destino</label>
                <div className="flex flex-wrap gap-2">
                  {CARRERAS.map(c => {
                    const selected = parseJsonArr(formData.carreras || '[]').includes(c);
                    return (
                      <button
                        key={c} type="button"
                        onClick={() => {
                          const current = parseJsonArr(formData.carreras || '[]');
                          const next = selected ? current.filter((x: string) => x !== c) : [...current, c];
                          setFormData({...formData, carreras: JSON.stringify(next)});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
              <button type="button" onClick={() => setView('vacancies')} className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
              <button type="submit" className="px-8 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2">
                <Save size={18} /> {editingId ? 'Guardar Cambios' : 'Publicar Vacante'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
