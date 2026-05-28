import { useEffect, useState } from 'react';
import { BookOpen, Code2, Calculator, Cpu, Building2, Globe, FlaskConical, Loader2 } from 'lucide-react';

export type AttendanceSubject = {
  id: string;
  nombre: string;
  codigo: string;
  horario: string;
  carrera: string;
};

type AttendanceData = {
  total: number;
  presente: number;
  pct: number;
};

function getAttendanceStyle(pct: number, hasData: boolean) {
  if (!hasData) return {
    stroke: '#94a3b8',
    trackFill: '#f8fafc',
    badge: 'db-attend-badge-gray',
    status: 'Sin datos',
    count: 'text-slate-400',
  };
  if (pct >= 85) return {
    stroke: '#22c55e',
    trackFill: '#f0fdf4',
    badge: 'db-attend-badge-green',
    status: 'Buena',
    count: 'text-green-600',
  };
  if (pct >= 70) return {
    stroke: '#eab308',
    trackFill: '#fefce8',
    badge: 'db-attend-badge-yellow',
    status: 'Regular',
    count: 'text-yellow-600',
  };
  return {
    stroke: '#ef4444',
    trackFill: '#fff1f2',
    badge: 'db-attend-badge-red',
    status: 'Crítica',
    count: 'text-red-600',
  };
}

function CircularProgress({ pct, stroke, trackFill }: { pct: number; stroke: string; trackFill: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="db-attend-progress-svg">
      <circle cx="36" cy="36" r={r} fill={trackFill} stroke="#e2e8f0" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={stroke} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x="36" y="41" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">
        {pct}%
      </text>
    </svg>
  );
}

function SubjectIcon({ carrera, nombre }: { carrera: string; nombre: string }) {
  const n = (nombre + carrera).toLowerCase();
  let Icon = BookOpen;
  if (n.includes('inform') || n.includes('sistem') || n.includes('software') || n.includes('programac')) Icon = Code2;
  else if (n.includes('mat') || n.includes('calc') || n.includes('estadis') || n.includes('álgebra') || n.includes('algebra')) Icon = Calculator;
  else if (n.includes('electric') || n.includes('electron') || n.includes('circuito') || n.includes('hardware')) Icon = Cpu;
  else if (n.includes('civil') || n.includes('construc') || n.includes('estructur') || n.includes('arquit')) Icon = Building2;
  else if (n.includes('admin') || n.includes('empres') || n.includes('finanz') || n.includes('contab') || n.includes('econom')) Icon = Globe;
  else if (n.includes('quim') || n.includes('biol') || n.includes('lab') || n.includes('física') || n.includes('fisica')) Icon = FlaskConical;
  return <Icon size={13} />;
}

interface Props {
  subjects: AttendanceSubject[];
}

export default function AttendanceCards({ subjects }: Props) {
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/attendance')
      .then((r) => r.ok ? r.json() : { bySubject: {} })
      .then((d) => setAttendanceMap(d.bySubject ?? {}))
      .catch(() => setAttendanceMap({}))
      .finally(() => setLoading(false));
  }, []);

  if (subjects.length === 0) {
    return (
      <div className="db-empty-state">
        <BookOpen size={36} className="db-empty-icon" />
        <p className="text-sm text-slate-500">No tienes materias inscritas aún.</p>
        <a href="/wiki" className="db-link mt-1">Ir a Wiki e inscribirte →</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="db-empty-state">
        <Loader2 size={28} className="db-empty-icon animate-spin" />
        <p className="text-sm text-slate-400">Cargando asistencia…</p>
      </div>
    );
  }

  const totalWithData = subjects.filter((s) => attendanceMap[s.id]?.total > 0).length;

  return (
    <>
      {totalWithData === 0 && (
        <div className="db-attend-demo-note">
          Asistencia registrada por tu docente aparecerá aquí automáticamente.
        </div>
      )}
      <div className="db-attend-grid">
        {subjects.map((s) => {
          const data = attendanceMap[s.id];
          const hasData = data && data.total > 0;
          const pct = hasData ? data.pct : 0;
          const style = getAttendanceStyle(pct, !!hasData);
          return (
            <a key={s.id} href="/wiki" className="db-attend-card">
              <div className="db-attend-card-top">
                <span className="db-attend-icon">
                  <SubjectIcon carrera={s.carrera} nombre={s.nombre} />
                </span>
                <span className={`db-attend-badge ${style.badge}`}>{style.status}</span>
              </div>
              <CircularProgress pct={pct} stroke={style.stroke} trackFill={style.trackFill} />
              <div className="db-attend-info">
                <p className="db-attend-name">{s.nombre}</p>
                <p className="db-attend-code">{s.codigo}</p>
                <p className={`db-attend-count ${style.count}`}>
                  {hasData ? `${data.presente}/${data.total} clases` : 'Sin registros aún'}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
