import { useState } from 'react';
import { Search } from 'lucide-react';

export default function WikiSearch() {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar lógica de búsqueda
    console.log('Buscar:', query);
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Busca materias, profesores o recursos..."
        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
    </form>
  );
}
