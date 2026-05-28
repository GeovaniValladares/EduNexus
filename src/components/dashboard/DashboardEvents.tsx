export type DashboardEvent = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  href: string;
  color: 'red' | 'blue' | 'orange' | 'green' | 'purple';
};

const colorClasses: Record<DashboardEvent['color'], { bg: string; text: string; dot: string }> = {
  red: { bg: 'bg-red-50 hover:bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
  blue: { bg: 'bg-blue-50 hover:bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  orange: { bg: 'bg-orange-50 hover:bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  green: { bg: 'bg-green-50 hover:bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  purple: { bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
};

interface Props {
  events: DashboardEvent[];
}

export default function DashboardEvents({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        <p>No hay eventos próximos.</p>
        <a href="/wiki" className="text-indigo-600 font-medium hover:underline mt-2 inline-block">
          Inscríbete en materias →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const colors = colorClasses[event.color];
        return (
          <a
            key={event.id}
            href={event.href}
            className={`flex items-start gap-3 p-3 rounded-lg transition cursor-pointer ${colors.bg} border border-transparent hover:border-gray-200`}
          >
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${colors.dot}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${colors.text}`}>{event.titulo}</p>
              <p className={`text-sm ${colors.text} opacity-75`}>{event.tipo}</p>
            </div>
            <span className="text-xs text-gray-500 font-medium shrink-0">{event.fecha}</span>
          </a>
        );
      })}
    </div>
  );
}
