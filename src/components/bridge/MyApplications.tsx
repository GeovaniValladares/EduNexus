import { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, ChevronRight, ArrowLeft, Eye, MessageSquare } from 'lucide-react';

interface Application {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  empresa: string;
  estado: string;
  mensaje: string;
  createdAt: string;
  updatedAt: string;
}

interface HistoryItem {
  id: string;
  estado: string;
  comentario: string;
  createdAt: string;
}

export default function MyApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const r = await fetch('/api/bridge/applications');
      if (r.ok) {
        const d = await r.json();
        setApplications(d.applications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (appId: string) => {
    setLoadingHistory(true);
    try {
      const r = await fetch(`/api/bridge/application-history?applicationId=${appId}`);
      if (r.ok) {
        const d = await r.json();
        setHistory(d.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectApp = (app: Application) => {
    setSelectedApp(app);
    fetchHistory(app.id);
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'pending': return <Clock size={16} className="text-amber-500" />;
      case 'shortlisted': return <Eye size={16} className="text-blue-500" />;
      case 'accepted': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'rejected': return <XCircle size={16} className="text-red-500" />;
      case 'viewed': return <Eye size={16} className="text-indigo-500" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  const getStatusLabel = (estado: string) => {
    const map: Record<string, string> = {
      pending: 'Inscrito',
      shortlisted: 'En proceso',
      accepted: 'Aceptado',
      rejected: 'Descartado',
      viewed: 'CV Leído',
      withdrawn: 'Retirado'
    };
    return map[estado] || estado;
  };

  const getStatusClass = (estado: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-100',
      shortlisted: 'bg-blue-50 text-blue-700 border-blue-100',
      accepted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      rejected: 'bg-red-50 text-red-700 border-red-100',
      viewed: 'bg-indigo-50 text-indigo-700 border-indigo-100'
    };
    return map[estado] || 'bg-slate-50 text-slate-700 border-slate-100';
  };

  if (loading) return <div className="py-8 text-center text-slate-400 italic">Cargando tus aplicaciones...</div>;

  if (selectedApp) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => setSelectedApp(null)}
          className="mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={14} /> Volver al listado
        </button>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
            <h4 className="font-bold text-slate-900">{selectedApp.opportunityTitle}</h4>
            <p className="text-sm text-slate-500">{selectedApp.empresa}</p>
          </div>
          <div className="p-5">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Estado del proceso</h5>
            
            {loadingHistory ? (
              <div className="py-4 text-center text-slate-400 text-xs italic">Cargando historial...</div>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 pb-4">
                {history.map((item, idx) => (
                  <div key={item.id} className="relative">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-indigo-500 ring-4 ring-indigo-50' : 'bg-slate-300'}`} />
                    
                    <div className="space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusClass(item.estado)}`}>
                        {getStatusLabel(item.estado)}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed pt-1">
                        {item.comentario}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedApp.mensaje && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-[10px] uppercase mb-2">
              <MessageSquare size={12} /> Tu mensaje de aplicación
            </div>
            <p className="text-sm text-indigo-900/70 italic">"{selectedApp.mensaje}"</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-400 italic">Aún no has aplicado a ninguna oferta.</p>
        </div>
      ) : (
        applications.map((app) => (
          <div
            key={app.id}
            onClick={() => handleSelectApp(app)}
            className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getStatusClass(app.estado)}`}>
              {getStatusIcon(app.estado)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{app.opportunityTitle}</h4>
              <p className="text-xs text-slate-500">{app.empresa}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusClass(app.estado)}`}>
                {getStatusLabel(app.estado)}
              </span>
              <p className="text-[9px] text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-0.5" />
          </div>
        ))
      )}
    </div>
  );
}
