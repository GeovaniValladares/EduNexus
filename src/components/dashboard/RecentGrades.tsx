export type EnrolledSubjectRow = {
  id: string;
  nombre: string;
  codigo: string;
  horario: string;
};

interface Props {
  subjects: EnrolledSubjectRow[];
}

export default function RecentGrades({ subjects }: Props) {
  if (subjects.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        <p>Aún no tienes materias inscritas.</p>
        <a href="/wiki" className="text-indigo-600 font-medium hover:underline mt-2 inline-block">
          Ir a Wiki e inscribirte →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subjects.map((subject) => (
        <a
          key={subject.id}
          href="/wiki"
          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition border border-transparent hover:border-indigo-100"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{subject.nombre}</p>
            <p className="text-sm text-gray-500">
              {subject.codigo} · {subject.horario}
            </p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <span className="uls-chip-link">
              Ver en Wiki →
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
