import { useState, useEffect, useMemo } from 'react';
import { BookOpen, RefreshCw, Check, Search } from 'lucide-react';

interface Subject {
  id: string;
  codigo: string;
  nombre: string;
  carrera: string;
  semestre: string;
  profesor: string;
}

interface Docente {
  id: string;
  nombre: string;
  email: string;
}

export default function SubjectAssignment() {
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [docentes, setDocentes]   = useState<Docente[]>([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState<string | null>(null);
  const [saved, setSaved]         = useState<string | null>(null);
  const [filterName, setFilterName]   = useState('');
  const [filterCarrera, setFilterCarrera] = useState('');
  const [filterDocente, setFilterDocente] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects ?? []);
        setDocentes(data.docentes ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const assign = async (subjectId: string, docenteId: string) => {
    setSaving(subjectId);
    setSaved(null);
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, docenteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Error');
      setSubjects((prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, profesor: data.profesor } : s))
      );
      setSaved(subjectId);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al asignar');
    } finally {
      setSaving(null);
    }
  };

  const carreras = useMemo(
    () => Array.from(new Set(subjects.map((s) => s.carrera))).sort(),
    [subjects]
  );

  const filtered = subjects.filter((s) => {
    const q = filterName.toLowerCase();
    const matchName = !q || s.nombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q);
    const matchCarrera = !filterCarrera || s.carrera === filterCarrera;
    const matchDocente =
      !filterDocente ||
      (filterDocente === '__sin__' ? !s.profesor : s.profesor === filterDocente);
    return matchName && matchCarrera && matchDocente;
  });

  return (
    <div className="space-y-6">

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Buscar materia
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Nombre o código…"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>
          </div>
          <div className="min-w-52">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Carrera
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              value={filterCarrera}
              onChange={(e) => setFilterCarrera(e.target.value)}
            >
              <option value="">Todas las carreras</option>
              {carreras.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="min-w-52">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Docente asignado
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              value={filterDocente}
              onChange={(e) => setFilterDocente(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="__sin__">Sin docente</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.nombre}>{d.nombre}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          {filtered.length} materia(s) · {docentes.length} docente(s) registrado(s)
        </p>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-600" />
          <h2 className="font-bold text-slate-900">Asignación de materias a docentes</h2>
        </div>

        {docentes.length === 0 && !loading && (
          <div className="px-6 py-8 text-center text-amber-700 bg-amber-50 text-sm">
            No hay docentes registrados. Primero crea docentes en{' '}
            <a href="/admin/usuarios" className="underline font-medium">Gestión de usuarios</a>.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 w-24">Código</th>
                <th className="px-4 py-3">Materia</th>
                <th className="px-4 py-3">Carrera</th>
                <th className="px-4 py-3 w-16 text-center">Sem.</th>
                <th className="px-4 py-3 min-w-56">Docente asignado</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                filtered.map((subject) => {
                  const currentDocente = docentes.find((d) => d.nombre === subject.profesor);
                  return (
                    <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{subject.codigo}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{subject.nombre}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {subject.carrera.replace(/^Licenciatura en |^Técnico en |^Ingeniería /, '')}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">{subject.semestre}</td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                          value={currentDocente?.id ?? ''}
                          onChange={(e) => assign(subject.id, e.target.value)}
                          disabled={saving === subject.id}
                        >
                          <option value="">— Sin asignar —</option>
                          {docentes.map((d) => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {saving === subject.id && (
                          <RefreshCw size={14} className="animate-spin text-indigo-400 inline" />
                        )}
                        {saved === subject.id && (
                          <Check size={14} className="text-emerald-500 inline" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
