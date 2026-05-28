import { useState } from 'react';

export default function OpportunitiesFilter() {
  const [type, setType] = useState('all');

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-20">
      <h3 className="font-bold text-gray-900 mb-4">Filtros</h3>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Oportunidad</label>
        <div className="space-y-2">
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="radio"
              name="type"
              value="all"
              checked={type === 'all'}
              onChange={(e) => setType(e.target.value)}
              className="rounded-full"
            />
            <span className="ml-2 text-gray-700">Todas</span>
          </label>
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="radio"
              name="type"
              value="micro"
              checked={type === 'micro'}
              onChange={(e) => setType(e.target.value)}
              className="rounded-full"
            />
            <span className="ml-2 text-gray-700">Micro-pasantías</span>
          </label>
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="radio"
              name="type"
              value="job"
              checked={type === 'job'}
              onChange={(e) => setType(e.target.value)}
              className="rounded-full"
            />
            <span className="ml-2 text-gray-700">Empleos</span>
          </label>
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="radio"
              name="type"
              value="project"
              checked={type === 'project'}
              onChange={(e) => setType(e.target.value)}
              className="rounded-full"
            />
            <span className="ml-2 text-gray-700">Proyectos</span>
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Horas Semanales</label>
        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option>Todas</option>
          <option>1-10 horas</option>
          <option>10-20 horas</option>
          <option>20-40 horas</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Duración</label>
        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option>Todas</option>
          <option>1-4 semanas</option>
          <option>1-3 meses</option>
          <option>3-6 meses</option>
        </select>
      </div>

      <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition">
        Aplicar Filtros
      </button>
    </div>
  );
}
