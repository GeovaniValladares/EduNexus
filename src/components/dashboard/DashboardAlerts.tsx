export type DashboardAlert = {
  id: string;
  texto: string;
  href: string;
  accion: string;
};

interface Props {
  alerts: DashboardAlert[];
}

export default function DashboardAlerts({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <p className="text-sm text-blue-700">
        No tienes alertas pendientes.{' '}
        <a href="/bridge" className="font-medium underline hover:text-blue-900">
          Explorar oportunidades
        </a>
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => (
        <li key={alert.id}>
          <a
            href={alert.href}
            className="flex items-center justify-between gap-2 text-sm text-blue-800 bg-white/60 hover:bg-white rounded-lg px-3 py-2 transition border border-blue-100"
          >
            <span>• {alert.texto}</span>
            <span className="text-xs font-semibold text-indigo-600 shrink-0">{alert.accion} →</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
