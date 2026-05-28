import { useState, useEffect } from 'react';
import { UserPlus, Trash2, RefreshCw, Check, X } from 'lucide-react';

type UserRole = 'alumno' | 'docente' | 'empresa' | 'admin';

interface UserRow {
  id: string;
  nombre: string;
  email: string;
  role: string;
  carrera: string;
  perfilCompleto: boolean | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  alumno:      'Estudiante',
  docente:     'Docente',
  empresa:     'Empresa',
  admin:       'Administrador',
  superadmin:  'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  alumno:     'bg-emerald-100 text-emerald-700',
  docente:    'bg-blue-100 text-blue-700',
  empresa:    'bg-amber-100 text-amber-700',
  admin:      'bg-red-100 text-red-700',
  superadmin: 'bg-purple-100 text-purple-700',
};

const emptyForm = { nombre: '', email: '', password: '', role: 'alumno' as UserRole, carrera: '' };

export default function AdminUserManager() {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [form, setForm]       = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [filter, setFilter]   = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Error');
      setMsg({ type: 'ok', text: `Usuario "${data.nombre}" creado correctamente.` });
      setForm({ ...emptyForm });
      await loadUsers();
    } catch (err: unknown) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Error');
      await loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = filter.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

  return (
    <div className="space-y-8">

      {/* ── Create user form ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
          <UserPlus size={20} className="text-indigo-600" />
          Crear usuario
        </h2>

        {msg && (
          <div className={`mb-4 flex items-start gap-2 text-sm p-3 rounded-lg border ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {msg.type === 'ok' ? <Check size={16} className="mt-0.5 shrink-0" /> : <X size={16} className="mt-0.5 shrink-0" />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input
              className={inputCls}
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              placeholder="Nombre Apellido"
            />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico *</label>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="usuario@uls.edu"
            />
          </div>
          <div>
            <label className={labelCls}>Contraseña *</label>
            <input
              type="password"
              className={inputCls}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              placeholder="Mín. 6 caracteres"
              minLength={6}
            />
          </div>
          <div>
            <label className={labelCls}>Rol *</label>
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="alumno">Estudiante</option>
              <option value="docente">Docente</option>
              <option value="empresa">Empresa</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Carrera (opcional)</label>
            <input
              className={inputCls}
              value={form.carrera}
              onChange={(e) => setForm((f) => ({ ...f, carrera: e.target.value }))}
              placeholder="Solo para estudiantes"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition"
            >
              <UserPlus size={16} />
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Users table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900">
            Usuarios registrados <span className="text-slate-400 font-normal text-sm">({users.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="search"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Buscar nombre, correo, rol…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button
              type="button"
              onClick={loadUsers}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
              title="Actualizar"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Correo</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Carrera</th>
                <th className="px-6 py-3">Perfil</th>
                <th className="px-6 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                    {filter ? 'Sin resultados para esa búsqueda.' : 'No hay usuarios registrados.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-900">{u.nombre}</td>
                    <td className="px-6 py-3 text-slate-500">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{u.carrera || '—'}</td>
                    <td className="px-6 py-3">
                      {u.role === 'alumno' ? (
                        u.perfilCompleto
                          ? <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">Completo</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Pendiente</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id, u.nombre)}
                        disabled={deleting === u.id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
