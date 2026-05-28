import { Clock, MapPin, CalendarOff } from 'lucide-react';

export type ScheduleSubject = {
  id: string;
  nombre: string;
  codigo: string;
  horario: string;
  aula: string;
  carrera: string;
};

// JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAY_ABBREVS: Record<number, string[]> = {
  0: ['Dom'],
  1: ['Lun'],
  2: ['Mar'],
  3: ['Mié', 'Mie'],
  4: ['Jue'],
  5: ['Vie'],
  6: ['Sáb', 'Sab'],
};

function subjectIsToday(horario: string, todayDay: number): boolean {
  const abbrevs = DAY_ABBREVS[todayDay] ?? [];
  return abbrevs.some((abbr) => horario.includes(abbr));
}

function extractStartTime(horario: string): string {
  const m = horario.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '00:00';
}

function extractTimeRange(horario: string): string {
  const m = horario.match(/\d{1,2}:\d{2}(?:\s*[-–]\s*\d{1,2}:\d{2})?/);
  return m ? m[0] : '—';
}

function getClassType(nombre: string): 'class' | 'lab' | 'tutor' {
  const n = nombre.toLowerCase();
  if (n.includes('lab') || n.includes('práct') || n.includes('taller')) return 'lab';
  if (n.includes('tutor') || n.includes('asesor')) return 'tutor';
  return 'class';
}

const typeLabel: Record<string, string> = {
  class: 'Clase',
  lab: 'Práctica',
  tutor: 'Tutoría',
};

interface Props {
  subjects: ScheduleSubject[];
}

export default function ScheduleToday({ subjects }: Props) {
  const now = new Date();
  const todayDay = now.getDay();

  const todayLabel = now.toLocaleDateString('es-SV', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const todayLabelCap = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  // Filter to subjects scheduled today, then sort by start time
  const todaySubjects = subjects
    .filter((s) => subjectIsToday(s.horario, todayDay))
    .sort((a, b) => {
      const ta = extractStartTime(a.horario);
      const tb = extractStartTime(b.horario);
      return ta.localeCompare(tb);
    });

  return (
    <div>
      <div className="db-sched-date">
        <Clock size={14} />
        <span>{todayLabelCap}</span>
      </div>

      {subjects.length === 0 ? (
        <div className="db-empty-state">
          <Clock size={32} className="db-empty-icon" />
          <p className="text-sm text-slate-500">No tienes materias inscritas aún.</p>
          <a href="/wiki" className="db-link mt-1">Inscribirte en materias →</a>
        </div>
      ) : todaySubjects.length === 0 ? (
        <div className="db-empty-state">
          <CalendarOff size={32} className="db-empty-icon" />
          <p className="text-sm text-slate-500">No tienes clases programadas para hoy.</p>
          <p className="text-xs text-slate-400 mt-1">
            Tienes {subjects.length} materia(s) inscritas en otros días.
          </p>
        </div>
      ) : (
        <div className="db-sched-wrap">
          <table className="db-sched-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Aula</th>
                <th>Asignatura</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {todaySubjects.map((s) => {
                const tipo = getClassType(s.nombre);
                const aula = s.aula || '—';
                return (
                  <tr key={s.id}>
                    <td className="db-sched-time">{extractTimeRange(s.horario)}</td>
                    <td className="db-sched-room">
                      <MapPin size={11} className="inline mr-1 opacity-40" />
                      {aula}
                    </td>
                    <td>
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{s.nombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.codigo}</p>
                    </td>
                    <td>
                      <span className={`db-sched-type db-sched-type-${tipo}`}>
                        {typeLabel[tipo]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
