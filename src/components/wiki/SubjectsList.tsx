import { BookOpen, Users, Clock } from 'lucide-react';

export default function SubjectsList() {
  const subjects = [
    {
      nombre: 'Programación Web Avanzada',
      codigo: 'INF-301',
      profesor: 'Ing. Carlos López',
      horario: 'Mar y Jue 10:00-12:00',
      creditos: 4,
      semestre: 'III',
      estudiantes: 28,
    },
    {
      nombre: 'Bases de Datos II',
      codigo: 'INF-302',
      profesor: 'Ing. María González',
      horario: 'Lun y Mié 14:00-16:00',
      creditos: 4,
      semestre: 'III',
      estudiantes: 32,
    },
    {
      nombre: 'Ingeniería de Software',
      codigo: 'INF-303',
      profesor: 'Ing. Roberto Martínez',
      horario: 'Lun, Mié y Vie 09:00-10:00',
      creditos: 3,
      semestre: 'III',
      estudiantes: 25,
    },
    {
      nombre: 'Seguridad Informática',
      codigo: 'INF-304',
      profesor: 'Ing. Elena Soto',
      horario: 'Mar y Jue 16:00-18:00',
      creditos: 3,
      semestre: 'III',
      estudiantes: 20,
    },
  ];

  return (
    <div className="space-y-4">
      {subjects.map((subject) => (
        <div
          key={subject.codigo}
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition">
                {subject.nombre}
              </h3>
              <p className="text-sm text-gray-500">{subject.codigo}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-gray-600 text-sm">
              <Users size={16} className="mr-2 text-gray-400" />
              <span>{subject.profesor}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Clock size={16} className="mr-2 text-gray-400" />
              <span>{subject.horario}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <BookOpen size={16} className="mr-2 text-gray-400" />
              <span>{subject.estudiantes} estudiantes inscritos</span>
            </div>
          </div>

          <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
            Ver detalles →
          </button>
        </div>
      ))}
    </div>
  );
}
