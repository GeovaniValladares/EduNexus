import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

// ── ULS Ciclo 1 · 2026 event map ─────────────────────────────────────────────
// Key: "YYYY-MM-DD"  Value: array of event type keys
type EventKey =
  | 'matricula-ord'   // Período ordinario de matrícula (orange fill)
  | 'matricula-ext'   // Período extraordinario de matrícula (green fill)
  | 'inicio-clases'   // Inicio de clases (red border)
  | 'parciales'       // Semanas de parciales (amber underline)
  | 'examen-dif'      // Exámenes diferidos (red circle)
  | 'ingreso-notas'   // Período de ingreso de notas (purple underline)
  | 'reposicion'      // Examen de reposición (pink circle)
  | 'eval-docente'    // Evaluación docente (yellow fill)
  | 'entrega-nota'    // Entrega de nota (violet fill)
  | 'fin-ciclo'       // Fin de ciclo (star)
  | 'retiro-adicion'  // Día final retiro/adición (pink)
  | 'asueto';         // Asueto (green star)

const EVENTS: Record<string, EventKey[]> = {
  // ─ Enero: matrícula ordinaria
  '2026-01-05': ['matricula-ord'], '2026-01-06': ['matricula-ord'],
  '2026-01-07': ['matricula-ord'], '2026-01-08': ['matricula-ord'],
  '2026-01-09': ['matricula-ord'], '2026-01-12': ['matricula-ord'],
  '2026-01-13': ['matricula-ord'], '2026-01-14': ['matricula-ord'],
  '2026-01-15': ['matricula-ord'], '2026-01-16': ['matricula-ord'],
  // matrícula extraordinaria
  '2026-01-19': ['matricula-ext'], '2026-01-20': ['matricula-ext'],
  '2026-01-21': ['matricula-ext'], '2026-01-22': ['matricula-ext'],
  '2026-01-23': ['matricula-ext'],
  // inicio de clases
  '2026-01-26': ['inicio-clases'],

  // ─ Febrero: semana de parciales
  '2026-02-16': ['parciales'], '2026-02-17': ['parciales'],
  '2026-02-18': ['parciales'], '2026-02-19': ['parciales'],
  '2026-02-20': ['parciales'], '2026-02-23': ['parciales'],
  '2026-02-24': ['parciales'], '2026-02-25': ['parciales'],
  '2026-02-26': ['parciales'], '2026-02-27': ['parciales', 'examen-dif'],
  '2026-02-28': ['examen-dif'],

  // ─ Marzo: retiro/adición + ingreso notas + examen diferido
  '2026-03-01': ['ingreso-notas'], '2026-03-02': ['ingreso-notas'],
  '2026-03-03': ['ingreso-notas'], '2026-03-04': ['ingreso-notas'],
  '2026-03-05': ['ingreso-notas'],
  '2026-03-20': ['retiro-adicion'],
  '2026-03-27': ['examen-dif'], '2026-03-28': ['examen-dif'],
  '2026-03-30': ['ingreso-notas'], '2026-03-31': ['ingreso-notas'],

  // ─ Abril: Semana Santa (asuetos) + segunda semana de parciales
  '2026-04-02': ['asueto'], '2026-04-03': ['asueto'],
  '2026-04-04': ['asueto'], '2026-04-05': ['asueto'],
  '2026-04-20': ['parciales'], '2026-04-21': ['parciales'],
  '2026-04-22': ['parciales'], '2026-04-23': ['parciales'],
  '2026-04-24': ['parciales'],

  // ─ Mayo: segunda semana parciales + exámenes diferidos
  '2026-05-04': ['parciales'], '2026-05-05': ['parciales'],
  '2026-05-06': ['parciales'], '2026-05-07': ['parciales'],
  '2026-05-08': ['parciales'],
  '2026-05-11': ['parciales'], '2026-05-12': ['parciales'],
  '2026-05-13': ['parciales'], '2026-05-14': ['parciales'],
  '2026-05-15': ['parciales'],
  '2026-05-16': ['examen-dif'],
  '2026-05-30': ['examen-dif'],
  '2026-05-25': ['ingreso-notas'], '2026-05-26': ['ingreso-notas'],
  '2026-05-27': ['ingreso-notas'], '2026-05-28': ['ingreso-notas'],
  '2026-05-29': ['ingreso-notas'],

  // ─ Junio: reposición + evaluación docente + entrega de notas + fin de ciclo
  '2026-06-12': ['reposicion'], '2026-06-13': ['reposicion'],
  '2026-06-15': ['eval-docente'], '2026-06-16': ['eval-docente'],
  '2026-06-17': ['eval-docente'], '2026-06-18': ['eval-docente'],
  '2026-06-19': ['eval-docente'],
  '2026-06-20': ['retiro-adicion'],
  '2026-06-22': ['entrega-nota'], '2026-06-23': ['entrega-nota'],
  '2026-06-24': ['entrega-nota'], '2026-06-25': ['entrega-nota'],
  '2026-06-26': ['entrega-nota'],
  '2026-06-27': ['fin-ciclo'],
};

// Upcoming events — cutoff is the last day of the event range (ISO date for filtering)
const UPCOMING = [
  { date: '26 Ene',    label: 'Inicio de clases',       color: '#dc2626', cutoff: '2026-01-26' },
  { date: '16–27 Feb', label: 'Parciales 1ª vuelta',    color: '#f59e0b', cutoff: '2026-02-27' },
  { date: '27–28 Feb', label: 'Exámenes diferidos',      color: '#ef4444', cutoff: '2026-02-28' },
  { date: '2–5 Abr',   label: 'Semana Santa (asueto)',   color: '#16a34a', cutoff: '2026-04-05' },
  { date: '4–15 May',  label: 'Parciales 2ª vuelta',    color: '#f59e0b', cutoff: '2026-05-15' },
  { date: '16 May',    label: 'Examen diferido',         color: '#ef4444', cutoff: '2026-05-16' },
  { date: '25–29 May', label: 'Ingreso de notas',        color: '#7c3aed', cutoff: '2026-05-29' },
  { date: '30 May',    label: 'Examen diferido',         color: '#ef4444', cutoff: '2026-05-30' },
  { date: '12–13 Jun', label: 'Examen de reposición',   color: '#ec4899', cutoff: '2026-06-13' },
  { date: '15–19 Jun', label: 'Evaluación docente',     color: '#ca8a04', cutoff: '2026-06-19' },
  { date: '22–26 Jun', label: 'Entrega de notas',       color: '#7c3aed', cutoff: '2026-06-26' },
  { date: '27 Jun',    label: 'Fin de ciclo ★',          color: '#2563eb', cutoff: '2026-06-27' },
];

const EVENT_STYLES: Record<EventKey, { bg: string; text: string; label: string }> = {
  'matricula-ord':  { bg: '#fed7aa', text: '#9a3412', label: 'Matrícula ordinaria' },
  'matricula-ext':  { bg: '#bbf7d0', text: '#14532d', label: 'Matrícula extraordinaria' },
  'inicio-clases':  { bg: '#fee2e2', text: '#991b1b', label: 'Inicio de clases' },
  'parciales':      { bg: '#fef9c3', text: '#78350f', label: 'Semana de parciales' },
  'examen-dif':     { bg: '#fecaca', text: '#7f1d1d', label: 'Exámenes diferidos' },
  'ingreso-notas':  { bg: '#e9d5ff', text: '#4c1d95', label: 'Ingreso de notas' },
  'reposicion':     { bg: '#fce7f3', text: '#831843', label: 'Examen de reposición' },
  'eval-docente':   { bg: '#fef3c7', text: '#92400e', label: 'Evaluación docente' },
  'entrega-nota':   { bg: '#ede9fe', text: '#4c1d95', label: 'Entrega de nota' },
  'fin-ciclo':      { bg: '#dbeafe', text: '#1e3a8a', label: 'Fin de ciclo' },
  'retiro-adicion': { bg: '#fce7f3', text: '#9d174d', label: 'Retiro/adición materias' },
  'asueto':         { bg: '#d1fae5', text: '#065f46', label: 'Asueto' },
};

const DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun → convert to Mon-based (0=Mon…6=Sun)
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function getPrimaryEvent(keys: EventKey[]): EventKey {
  // Priority order when multiple events land on same day
  const priority: EventKey[] = [
    'fin-ciclo', 'inicio-clases', 'examen-dif', 'reposicion',
    'eval-docente', 'entrega-nota', 'ingreso-notas', 'parciales',
    'retiro-adicion', 'matricula-ext', 'matricula-ord', 'asueto',
  ];
  return priority.find((k) => keys.includes(k)) ?? keys[0];
}

const TODAY = new Date();
const TODAY_KEY = toKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

export default function AcademicCalendar() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(() => {
    if (TODAY.getFullYear() === 2026 && TODAY.getMonth() <= 5) return TODAY.getMonth();
    return 4; // May
  });
  const [hoveredDay, setHoveredDay] = useState<{ day: number; label: string } | null>(null);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Only show events whose cutoff date >= today
  const todayMs = new Date(TODAY_KEY).getTime();
  const upcomingFiltered = UPCOMING.filter((e) => new Date(e.cutoff).getTime() >= todayMs);

  return (
    <div>
      {/* ── Header ── */}
      <div className="acal-header">
        <button type="button" onClick={prevMonth} className="acal-nav-btn">
          <ChevronLeft size={14} />
        </button>
        <div className="acal-month-title">
          <CalendarDays size={14} className="text-indigo-500" />
          <span>{MONTHS[month]} {year}</span>
          <span className="acal-cycle-badge">Ciclo 1 · 2026</span>
        </div>
        <button type="button" onClick={nextMonth} className="acal-nav-btn">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Day headers ── */}
      <div className="acal-days-header">
        {DAYS.map((d) => <span key={d}>{d}</span>)}
      </div>

      {/* ── Calendar grid ── */}
      <div className="acal-grid">
        {/* empty cells before first day */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {/* days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = toKey(year, month, day);
          const events = EVENTS[key];
          const primary = events ? getPrimaryEvent(events) : null;
          const style = primary ? EVENT_STYLES[primary] : null;
          const isToday = key === TODAY_KEY;

          const isHovered = hoveredDay?.day === day;

          return (
            <div
              key={day}
              className={`acal-day ${isToday ? 'acal-day-today' : ''} ${style ? 'acal-day-event' : ''}`}
              style={style ? { background: style.bg, color: style.text } : undefined}
              onMouseEnter={() => style && setHoveredDay({ day, label: style.label })}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {day}
              {primary === 'fin-ciclo' && <span className="acal-star">★</span>}
              {primary === 'asueto' && <span className="acal-star" style={{ color: '#16a34a' }}>★</span>}
              {primary === 'inicio-clases' && <span className="acal-dot" style={{ background: '#dc2626' }} />}
              {isHovered && style && (
                <span className="acal-tooltip">{style.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="acal-legend">
        {([
          ['matricula-ord', 'Matr. ordinaria'],
          ['matricula-ext', 'Matr. extraordinaria'],
          ['inicio-clases', 'Inicio de clases'],
          ['parciales', 'Parciales'],
          ['examen-dif', 'Exam. diferido'],
          ['ingreso-notas', 'Ingreso notas'],
          ['reposicion', 'Reposición'],
          ['eval-docente', 'Eval. docente'],
          ['entrega-nota', 'Entrega nota'],
          ['fin-ciclo', 'Fin de ciclo'],
          ['asueto', 'Asueto'],
        ] as [EventKey, string][]).map(([k, lbl]) => (
          <div key={k} className="acal-legend-item">
            <span className="acal-legend-dot" style={{ background: EVENT_STYLES[k].bg, border: `1px solid ${EVENT_STYLES[k].text}30` }} />
            <span>{lbl}</span>
          </div>
        ))}
      </div>

      {/* ── Upcoming strip (only future / current events) ── */}
      {upcomingFiltered.length > 0 && (
        <div className="acal-upcoming">
          <p className="acal-upcoming-title">Próximas fechas clave</p>
          {upcomingFiltered.map((ev, i) => (
            <div key={i} className="acal-upcoming-row">
              <span className="acal-upcoming-dot" style={{ background: ev.color }} />
              <span className="acal-upcoming-date">{ev.date}</span>
              <span className="acal-upcoming-label">{ev.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
