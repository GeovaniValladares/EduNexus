import { useEffect, useState } from 'react';
import { Bell, Calendar, AlertTriangle, ExternalLink, BookOpen, Loader2, Star } from 'lucide-react';
import type { DashboardAlert } from './DashboardAlerts';
import type { DashboardEvent } from './DashboardEvents';
import AcademicCalendar from './AcademicCalendar';

type Notice = {
  id: string;
  titulo: string;
  contenido: string;
  urgente: boolean;
  createdAt: string;
  subjectNombre: string;
  subjectCodigo: string;
};

type Grade = {
  id: string;
  titulo: string;
  nota: number;
  subjectNombre: string;
  subjectCodigo: string;
  createdAt: string;
};

function WidgetHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: number }) {
  return (
    <div className="db-widget-header">
      {icon}
      <h3>{title}</h3>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

function NoteColor(nota: number) {
  if (nota >= 7) return 'text-green-700 bg-green-50 border-green-100';
  if (nota >= 5) return 'text-yellow-700 bg-yellow-50 border-yellow-100';
  return 'text-red-700 bg-red-50 border-red-100';
}

interface Props {
  alerts: DashboardAlert[];
  events: DashboardEvent[];
}

export default function AnnouncementsPanel({ alerts, events }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(true);

  useEffect(() => {
    fetch('/api/student/notices')
      .then((r) => r.ok ? r.json() : { notices: [] })
      .then((d) => setNotices(d.notices ?? []))
      .catch(() => setNotices([]))
      .finally(() => setLoadingNotices(false));

    fetch('/api/student/grades')
      .then((r) => r.ok ? r.json() : { grades: [] })
      .then((d) => setGrades((d.grades ?? []).slice(0, 8)))
      .catch(() => setGrades([]))
      .finally(() => setLoadingGrades(false));
  }, []);

  return (
    <div className="db-right-panel">

      {/* ── Alerts from dashboard data ── */}
      {(alerts.length > 0 || events.length > 0) && (
        <div className="db-widget">
          <WidgetHeader icon={<Bell size={15} />} title="Alertas y eventos" badge={alerts.length} />
          <div className="db-widget-body">
            {alerts.map((a) => (
              <a key={a.id} href={a.href} className="db-announce-row db-announce-link">
                <Bell size={13} className="shrink-0 text-blue-400 mt-0.5" />
                <p className="text-xs leading-relaxed text-slate-700 flex-1">{a.texto}</p>
                <span className="text-xs font-bold text-blue-600 shrink-0 flex items-center gap-0.5">
                  {a.accion}<ExternalLink size={10} />
                </span>
              </a>
            ))}
            {events.length > 0 && (
              <>
                {alerts.length > 0 && <div className="db-widget-sep" />}
                {events.slice(0, 4).map((ev) => (
                  <a key={ev.id} href={ev.href} className="db-event-row">
                    <span className={`db-event-dot db-event-dot-${ev.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{ev.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ev.tipo}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 font-medium">{ev.fecha}</span>
                  </a>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Teacher Notices (real data) ── */}
      <div className="db-widget">
        <WidgetHeader icon={<AlertTriangle size={15} />} title="Avisos de materias" badge={notices.filter(n => n.urgente).length} />
        <div className="db-widget-body">
          {loadingNotices ? (
            <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs">
              <Loader2 size={14} className="animate-spin" /> Cargando avisos…
            </div>
          ) : notices.length === 0 ? (
            <div className="py-4 text-center">
              <BookOpen size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs text-slate-400">No hay avisos de tus materias por ahora.</p>
            </div>
          ) : (
            notices.map((n) => (
              <div key={n.id} className={`db-announce-row ${n.urgente ? 'db-announce-urgent' : ''}`}>
                {n.urgente
                  ? <AlertTriangle size={14} className="shrink-0 text-amber-500 mt-0.5" />
                  : <Bell size={14} className="shrink-0 text-indigo-400 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{n.titulo}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.contenido}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{n.subjectNombre} · {n.subjectCodigo}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Recent Grades (real data) ── */}
      <div className="db-widget">
        <WidgetHeader icon={<Star size={15} />} title="Mis calificaciones" />
        <div className="db-widget-body">
          {loadingGrades ? (
            <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs">
              <Loader2 size={14} className="animate-spin" /> Cargando calificaciones…
            </div>
          ) : grades.length === 0 ? (
            <div className="py-4 text-center">
              <Star size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs text-slate-400">Las notas aparecerán cuando tu docente las ingrese.</p>
            </div>
          ) : (
            grades.map((g) => (
              <div key={g.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className={`text-sm font-bold px-2 py-1 rounded border min-w-[2.5rem] text-center ${NoteColor(g.nota)}`}>
                  {g.nota.toFixed(1)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{g.titulo}</p>
                  <p className="text-[10px] text-slate-400 truncate">{g.subjectNombre}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Academic Calendar ULS ── */}
      <div className="db-widget">
        <WidgetHeader icon={<Calendar size={15} />} title="Calendario Académico ULS" />
        <div className="db-widget-body db-widget-body-calendar">
          <AcademicCalendar />
        </div>
      </div>

    </div>
  );
}
