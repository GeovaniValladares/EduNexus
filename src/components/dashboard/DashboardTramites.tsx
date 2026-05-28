export type DashboardTramite = {
  id: string;
  titulo: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  href: string;
};

const estadoLabel: Record<DashboardTramite['estado'], string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
};

const estadoClass: Record<DashboardTramite['estado'], string> = {
  pendiente: 'text-red-700',
  en_proceso: 'text-yellow-700',
  completado: 'text-green-700',
};

interface Props {
  tramites: DashboardTramite[];
}

export default function DashboardTramites({ tramites }: Props) {
  if (tramites.length === 0) {
    return <p className="text-sm text-yellow-800">No hay trámites pendientes.</p>;
  }

  return (
    <div className="space-y-2">
      {tramites.map((t) => (
        <a
          key={t.id}
          href={t.href}
          className="block text-sm text-yellow-800 bg-white/50 hover:bg-white rounded-lg px-3 py-2 transition border border-yellow-100"
        >
          <p className="font-medium">{t.titulo}</p>
          <p className={`text-xs mt-0.5 ${estadoClass[t.estado]}`}>{estadoLabel[t.estado]}</p>
        </a>
      ))}
    </div>
  );
}
