import { Briefcase, Clock, DollarSign, MapPin } from 'lucide-react';
import { useState } from 'react';

interface Opportunity {
  id: string;
  titulo: string;
  empresa: string;
  tipo: string;
  horas_semanales: number;
  duracion: string;
  ubicacion: string;
  descripcion: string;
  requisitos: string[];
  aplicado: boolean;
}

export default function OpportunitiesList() {
  const [opportunities] = useState<Opportunity[]>([
    {
      id: '1',
      titulo: 'Desarrollador Web Frontend',
      empresa: 'TechStart Solutions',
      tipo: 'Micro-Pasantía',
      horas_semanales: 15,
      duracion: '8 semanas',
      ubicacion: 'San Salvador',
      descripcion: 'Buscamos desarrollador web con experiencia en React para proyecto frontend de cliente importante.',
      requisitos: ['React', 'JavaScript', 'CSS', 'Git'],
      aplicado: true,
    },
    {
      id: '2',
      titulo: 'Asistente de Base de Datos',
      empresa: 'DataFlow Corp',
      tipo: 'Pasantía',
      horas_semanales: 20,
      duracion: '12 semanas',
      ubicacion: 'Santa Tecla',
      descripcion: 'Soporte en diseño y mantenimiento de bases de datos SQL y NoSQL.',
      requisitos: ['SQL', 'MongoDB', 'Python'],
      aplicado: false,
    },
    {
      id: '3',
      titulo: 'Analista de Sistemas Junior',
      empresa: 'Business Solutions',
      tipo: 'Empleo',
      horas_semanales: 40,
      duracion: 'Indefinido',
      ubicacion: 'San Salvador',
      descripcion: 'Analista de sistemas para empresa en crecimiento. Excelentes beneficios.',
      requisitos: ['Análisis', 'UML', 'Comunicación'],
      aplicado: false,
    },
  ]);

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'Micro-Pasantía':
        return 'bg-blue-100 text-blue-700';
      case 'Pasantía':
        return 'bg-green-100 text-green-700';
      case 'Empleo':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {opportunities.map((opp) => (
        <div key={opp.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900">{opp.titulo}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded ${getTypeColor(opp.tipo)}`}>
                  {opp.tipo}
                </span>
                {opp.aplicado && (
                  <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                    ✓ Aplicado
                  </span>
                )}
              </div>
              <p className="text-gray-600 font-medium">{opp.empresa}</p>
            </div>
            {!opp.aplicado && (
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition">
                Aplicar
              </button>
            )}
          </div>

          <p className="text-gray-700 text-sm mb-4">{opp.descripcion}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Clock size={16} className="mr-2 text-gray-400" />
              <span>{opp.horas_semanales}h/semana</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Briefcase size={16} className="mr-2 text-gray-400" />
              <span>{opp.duracion}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={16} className="mr-2 text-gray-400" />
              <span>{opp.ubicacion}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Requisitos:</p>
            <div className="flex flex-wrap gap-2">
              {opp.requisitos.map((req) => (
                <span key={req} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                  {req}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
