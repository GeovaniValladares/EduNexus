import type { PlanItem } from '../../lib/concierge-context';

interface PersonalizedPlanProps {
  items: PlanItem[];
}

export default function PersonalizedPlan({ items }: PersonalizedPlanProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Sin tareas sugeridas por ahora.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border-l-4 border-green-500 pl-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.deadline}</p>
            </div>
            <span
              className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${
                item.priority === 'high'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {item.priority === 'high' ? 'Urgente' : 'Normal'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
