import { useState } from 'react';
import { CARRERAS } from '../../lib/carreras';

interface ProfileEditorProps {
  initialNombre: string;
  initialCarrera: string;
  email: string;
}

export default function ProfileEditor({
  initialNombre,
  initialCarrera,
  email,
}: ProfileEditorProps) {
  const [nombre, setNombre] = useState(initialNombre);
  const [carrera, setCarrera] = useState(initialCarrera);
  const [guardado, setGuardado] = useState({ nombre: initialNombre, carrera: initialCarrera });
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const handleGuardar = async () => {
    if (!carrera) {
      setMensaje({ tipo: 'error', texto: 'Selecciona tu carrera para inscribirte y aplicar a pasantías.' });
      return;
    }

    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, carrera }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo guardar');

      const nuevoNombre = data.user.nombre as string;
      const nuevaCarrera = data.user.carrera as string;
      setNombre(nuevoNombre);
      setCarrera(nuevaCarrera);
      setGuardado({ nombre: nuevoNombre, carrera: nuevaCarrera });
      setEditando(false);
      setMensaje({ tipo: 'ok', texto: 'Perfil actualizado correctamente.' });
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Mi perfil</h2>
        {!editando ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Editar
          </button>
        ) : null}
      </div>

      {!carrera && !editando && (
        <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-amber-50 text-amber-900 border border-amber-200">
          Configura tu carrera para ver materias y pasantías de tu programa.
        </div>
      )}

      {mensaje && (
        <div
          className={`mb-4 px-3 py-2 rounded-lg text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {editando ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
            <select
              value={carrera}
              onChange={(e) => setCarrera(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar carrera</option>
              {CARRERAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">Correo: {email} (no editable)</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGuardar}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setNombre(guardado.nombre);
                setCarrera(guardado.carrera);
                setEditando(false);
                setMensaje(null);
              }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <span className="font-medium text-gray-800">Nombre:</span> {nombre}
          </p>
          <p>
            <span className="font-medium text-gray-800">Carrera:</span>{' '}
            {carrera || 'Sin asignar'}
          </p>
          <p>
            <span className="font-medium text-gray-800">Correo:</span> {email}
          </p>
        </div>
      )}
    </div>
  );
}
