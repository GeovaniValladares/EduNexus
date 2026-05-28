import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Users,
  Clock,
  MapPin,
  Search,
  Calendar,
  X,
  Eye,
  Shield,
  Pencil,
  Trash2,
} from 'lucide-react';
import { isAdmin as checkIsAdmin } from '../../lib/roles';
import { filterWikiSubjects } from '../../lib/wiki-filters';
import type { WikiSubject, WikiEnrollmentStudent } from '../../lib/wiki-types';
import WikiAdminSection, {
  type WikiAdminStudent,
  type WikiAdminActions,
} from './WikiAdminSection';

export type { WikiSubject, WikiEnrollmentStudent };

// ── Pending enrollments panel (admin only) ────────────────────────────────
function PendingEnrollmentsPanel() {
  const [pending, setPending] = useState<{
    enrollmentId: string; studentNombre: string; studentEmail: string;
    studentCarrera: string; studentCiclo: string;
    subjectNombre: string; subjectCodigo: string; subjectCiclo: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/wiki/enrollment-review');
      if (r.ok) {
        const d = await r.json();
        setPending(d.pending ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (enrollmentId: string, accion: 'approve' | 'reject') => {
    setActionLoading(enrollmentId);
    setMsg(null);
    try {
      const r = await fetch('/api/wiki/enrollment-review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, accion }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setPending((prev) => prev.filter((e) => e.enrollmentId !== enrollmentId));
      setMsg({ tipo: 'ok', texto: accion === 'approve' ? 'Inscripción aprobada' : 'Inscripción rechazada' });
    } catch (e: unknown) {
      setMsg({ tipo: 'error', texto: e instanceof Error ? e.message : 'Error' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          msg.tipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>{msg.texto}</div>
      )}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">Cargando solicitudes…</div>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No hay solicitudes de inscripción pendientes.
        </div>
      ) : (
        pending.map((e) => (
          <div key={e.enrollmentId} className="bg-white rounded-lg shadow p-5 border-l-4 border-yellow-400">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-gray-900">{e.studentNombre}</p>
                <p className="text-sm text-gray-500">{e.studentEmail} · {e.studentCarrera} · Ciclo {e.studentCiclo}</p>
                <p className="text-sm text-indigo-700 mt-1 font-medium">
                  {e.subjectNombre} <span className="text-gray-400">({e.subjectCodigo}) — Ciclo {e.subjectCiclo}</span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={actionLoading === e.enrollmentId}
                  onClick={() => handleAction(e.enrollmentId, 'approve')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                >
                  {actionLoading === e.enrollmentId ? '…' : 'Aprobar'}
                </button>
                <button
                  type="button"
                  disabled={actionLoading === e.enrollmentId}
                  onClick={() => handleAction(e.enrollmentId, 'reject')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50"
                >
                  {actionLoading === e.enrollmentId ? '…' : 'Rechazar'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const ROMAN_ORDER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function cicloIdx(c: string) { return ROMAN_ORDER.indexOf(c?.toUpperCase()); }

interface WikiCatalogProps {
  userCarrera: string;
  userCiclo?: string;
  userRole: string;
  subjects: WikiSubject[];
  initialEnrolledIds: string[];
  enrollmentEstados?: Record<string, string>; // subjectId → 'pending' | 'approved' | 'rejected'
  enrollmentsBySubject?: Record<string, WikiEnrollmentStudent[]>;
  initialStudents?: WikiAdminStudent[];
}

const SEMESTRES = ['Todos', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export default function WikiCatalog({
  userCarrera,
  userCiclo = 'X',
  userRole,
  subjects: initialSubjects,
  initialEnrolledIds,
  enrollmentEstados: initialEnrollmentEstados = {},
  enrollmentsBySubject: initialEnrollmentsBySubject = {},
  initialStudents = [],
}: WikiCatalogProps) {
  const isAdmin = checkIsAdmin(userRole);

  const [subjectsList, setSubjectsList] = useState(initialSubjects);
  const [studentsList, setStudentsList] = useState(initialStudents);
  const [enrollmentsMap, setEnrollmentsMap] = useState(initialEnrollmentsBySubject);
  const [adminTab, setAdminTab] = useState<'materias' | 'alumnos' | 'solicitudes'>('materias');
  const adminActionsRef = useRef<WikiAdminActions | null>(null);
  // 'solo-ciclo' | 'todos' — for students default to their own ciclo
  const [cicloView, setCicloView] = useState<'solo-ciclo' | 'todos'>(isAdmin ? 'todos' : 'solo-ciclo');

  const [semestre, setSemestre] = useState('Todos');
  const [carreraFiltroAdmin, setCarreraFiltroAdmin] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [profesorFiltro, setProfesorFiltro] = useState('Todos');
  const [soloConCupo, setSoloConCupo] = useState(false);
  const [vista, setVista] = useState<'materias' | 'horario' | 'inscripciones'>('materias');
  const [enrolledIds, setEnrolledIds] = useState<string[]>(initialEnrolledIds);
  const [enrollmentEstados, setEnrollmentEstados] = useState<Record<string, string>>(initialEnrollmentEstados);
  const [pendingReview, setPendingReview] = useState<{
    enrollmentId: string; studentNombre: string; studentEmail: string;
    studentCarrera: string; studentCiclo: string;
    subjectNombre: string; subjectCodigo: string; subjectCiclo: string;
  }[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);
  const [inscritosMap, setInscritosMap] = useState<Record<string, number>>(
    Object.fromEntries(initialSubjects.map((s) => [s.id, s.inscritos]))
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [detalleMateria, setDetalleMateria] = useState<WikiSubject | null>(null);

  const carrerasDisponibles = useMemo(
    () => [...new Set(subjectsList.map((s) => s.carrera))].sort(),
    [subjectsList]
  );

  const filterOpts = useMemo(
    () => ({
      isAdmin,
      userCarrera,
      carreraFiltroAdmin,
      semestre,
      busqueda,
      profesor: profesorFiltro,
      soloConCupo,
    }),
    [
      isAdmin,
      userCarrera,
      carreraFiltroAdmin,
      semestre,
      busqueda,
      profesorFiltro,
      soloConCupo,
    ]
  );

  const materiasFiltradas = useMemo(() => {
    let list = filterWikiSubjects(subjectsList, filterOpts);
    // In "solo-ciclo" mode for students, only show current ciclo (past/future are hidden
    // unless there's an active text search or explicit semestre filter)
    if (!isAdmin && cicloView === 'solo-ciclo' && !busqueda.trim() && semestre === 'Todos') {
      list = list.filter((s) => s.semestre === userCiclo);
    }
    return list;
  }, [subjectsList, filterOpts, isAdmin, cicloView, busqueda, semestre, userCiclo]);

  const misInscripciones = useMemo(() => {
    const inscritas = subjectsList.filter((s) => enrolledIds.includes(s.id));
    return filterWikiSubjects(inscritas, filterOpts);
  }, [subjectsList, enrolledIds, filterOpts]);

  const profesoresDisponibles = useMemo(() => {
    const base = isAdmin
      ? subjectsList.filter((s) => carreraFiltroAdmin === 'todas' || s.carrera === carreraFiltroAdmin)
      : subjectsList.filter((s) => !userCarrera || s.carrera === userCarrera);
    if (semestre !== 'Todos') {
      return [...new Set(base.filter((s) => s.semestre === semestre).map((s) => s.profesor))].sort();
    }
    return [...new Set(base.map((s) => s.profesor))].sort();
  }, [subjectsList, isAdmin, userCarrera, carreraFiltroAdmin, semestre]);

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    semestre !== 'Todos' ||
    profesorFiltro !== 'Todos' ||
    soloConCupo ||
    (isAdmin && carreraFiltroAdmin !== 'todas');

  const limpiarFiltros = () => {
    setBusqueda('');
    setSemestre('Todos');
    setProfesorFiltro('Todos');
    setSoloConCupo(false);
    if (isAdmin) setCarreraFiltroAdmin('todas');
  };

  const semestresDisponibles = useMemo(() => {
    const base = isAdmin
      ? subjectsList.filter((s) => carreraFiltroAdmin === 'todas' || s.carrera === carreraFiltroAdmin)
      : subjectsList.filter((s) => !userCarrera || s.carrera === userCarrera);
    return [...new Set(base.map((s) => s.semestre))].sort();
  }, [subjectsList, isAdmin, userCarrera, carreraFiltroAdmin]);

  useEffect(() => {
    if (profesorFiltro !== 'Todos' && !profesoresDisponibles.includes(profesorFiltro)) {
      setProfesorFiltro('Todos');
    }
  }, [profesoresDisponibles, profesorFiltro]);

  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(() => setMensaje(null), 5000);
    return () => window.clearTimeout(t);
  }, [mensaje]);

  const handleInscribir = async (subjectId: string): Promise<boolean> => {
    setLoadingId(subjectId);
    setMensaje(null);
    try {
      const res = await fetch('/api/wiki/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo inscribir');
      setEnrolledIds((prev) => [...prev, subjectId]);
      setEnrollmentEstados((prev) => ({ ...prev, [subjectId]: data.estado ?? 'pending' }));
      setInscritosMap((prev) => ({ ...prev, [subjectId]: (prev[subjectId] ?? 0) + 1 }));
      setMensaje({ tipo: 'ok', texto: '✓ Solicitud enviada — esperando aprobación del docente' });
      return true;
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
      return false;
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancelar = async (subjectId: string): Promise<boolean> => {
    setLoadingId(subjectId);
    setMensaje(null);
    try {
      const res = await fetch('/api/wiki/enroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo cancelar');
      setEnrolledIds((prev) => prev.filter((id) => id !== subjectId));
      setEnrollmentEstados((prev) => { const n = { ...prev }; delete n[subjectId]; return n; });
      setInscritosMap((prev) => ({ ...prev, [subjectId]: Math.max(0, (prev[subjectId] ?? 1) - 1) }));
      setMensaje({ tipo: 'ok', texto: 'Solicitud cancelada' });
      return true;
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
      return false;
    } finally {
      setLoadingId(null);
    }
  };

  const renderTarjeta = (subject: WikiSubject) => {
    const inscrito = !isAdmin && enrolledIds.includes(subject.id);
    const estado = enrollmentEstados[subject.id]; // 'pending' | 'approved' | 'rejected' | undefined
    const inscritos = inscritosMap[subject.id] ?? subject.inscritos;
    const cupoLleno = inscritos >= subject.cupo;

    // Ciclo relationship for students
    const subjIdx = cicloIdx(subject.semestre);
    const userIdx = cicloIdx(userCiclo);
    const esCicloAnterior = !isAdmin && subjIdx < userIdx;  // past → cursada
    const esCicloActual   = !isAdmin && subjIdx === userIdx;
    const esCicloFuturo   = !isAdmin && subjIdx > userIdx;  // future → bloqueada

    const puedeInscribir =
      !isAdmin && !inscrito && !cupoLleno && esCicloActual &&
      (!userCarrera || subject.carrera === userCarrera);
    const listaInscritos = enrollmentsMap[subject.id];

    // Badges for enrollment + ciclo state
    const estadoBadge = inscrito ? (
      estado === 'approved' ? (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Inscrito</span>
      ) : estado === 'pending' ? (
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pendiente aprobación</span>
      ) : estado === 'rejected' ? (
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Rechazada</span>
      ) : (
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pendiente</span>
      )
    ) : null;

    const cicloBadge = !isAdmin && !inscrito ? (
      esCicloAnterior ? (
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Cursada</span>
      ) : esCicloFuturo ? (
        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Ciclo {subject.semestre}</span>
      ) : null
    ) : null;

    return (
      <div
        key={subject.id}
        className={`bg-white rounded-lg shadow p-6 transition ${
          estado === 'approved' ? 'ring-2 ring-green-400' :
          estado === 'pending' ? 'ring-2 ring-yellow-300' :
          estado === 'rejected' ? 'ring-2 ring-red-300 opacity-75' :
          esCicloAnterior ? 'opacity-60 bg-slate-50' :
          esCicloFuturo ? 'opacity-50 bg-slate-50' :
          'hover:shadow-lg'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">{subject.nombre}</h3>
              {estadoBadge}
              {cicloBadge}
            </div>
            <p className="text-sm text-gray-500">
              {subject.codigo} · Semestre {subject.semestre}
              {isAdmin && <> · {subject.carrera}</>}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600 text-sm">
            <Users size={16} className="mr-2 text-gray-400 shrink-0" />
            <span>{subject.profesor}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <Clock size={16} className="mr-2 text-gray-400 shrink-0" />
            <span>{subject.horario}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <MapPin size={16} className="mr-2 text-gray-400 shrink-0" />
            <span>{subject.aula}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <BookOpen size={16} className="mr-2 text-gray-400 shrink-0" />
            <span>
              {inscritos} / {subject.cupo} estudiantes inscritos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDetalleMateria(subject)}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition"
          >
            <Eye size={16} />
            Ver detalles
          </button>
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => adminActionsRef.current!.abrirInscripciones(subject)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
              >
                <Users size={16} />
                Inscritos ({listaInscritos?.length ?? inscritos})
              </button>
              <button
                type="button"
                onClick={() => adminActionsRef.current!.abrirEditarMateria(subject)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 border hover:bg-gray-50 rounded-lg"
              >
                <Pencil size={16} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => adminActionsRef.current!.eliminarMateria(subject)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </>
          ) : inscrito && estado === 'approved' ? (
            <span className="text-sm text-green-700 font-medium py-2 flex items-center gap-1">
              ✓ Inscripción confirmada
            </span>
          ) : inscrito && estado === 'rejected' ? (
            <button type="button" onClick={() => handleCancelar(subject.id)}
              disabled={loadingId === subject.id}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50">
              {loadingId === subject.id ? 'Procesando...' : 'Quitar solicitud rechazada'}
            </button>
          ) : inscrito ? (
            // pending state
            <button type="button" onClick={() => handleCancelar(subject.id)}
              disabled={loadingId === subject.id}
              className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition disabled:opacity-50">
              {loadingId === subject.id ? 'Procesando...' : 'Cancelar solicitud'}
            </button>
          ) : puedeInscribir ? (
            <button type="button" onClick={() => handleInscribir(subject.id)}
              disabled={loadingId === subject.id}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50">
              {loadingId === subject.id ? 'Enviando...' : 'Solicitar inscripción'}
            </button>
          ) : esCicloAnterior ? (
            <span className="text-sm text-slate-400 py-2 italic">Ya cursada</span>
          ) : esCicloFuturo ? (
            <span className="text-sm text-orange-400 py-2">🔒 Disponible en Ciclo {subject.semestre}</span>
          ) : (
            <span className="text-sm text-gray-500 py-2">
              {cupoLleno ? 'Cupo lleno' : 'No disponible para tu carrera'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-900 border border-red-200 flex items-center gap-2">
          <Shield size={18} className="shrink-0" />
          <span>
            <strong>Modo administrador:</strong> gestiona materias, docentes, horarios, alumnos e
            inscripciones (crear, editar, eliminar e inscribir / dar de baja).
          </span>
        </div>
      )}

      {!isAdmin && !userCarrera && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-amber-50 text-amber-900 border border-amber-200">
          Configura tu carrera en el{' '}
          <a href="/dashboard" className="font-semibold underline hover:text-amber-700">
            panel
          </a>{' '}
          para ver e inscribirte en las materias de tu programa.
        </div>
      )}

      {detalleMateria && !isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setDetalleMateria(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-1 pr-8">{detalleMateria.nombre}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {detalleMateria.codigo} · Semestre {detalleMateria.semestre}
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Profesor</dt>
                <dd className="font-medium text-right">{detalleMateria.profesor}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Horario</dt>
                <dd className="font-medium">{detalleMateria.horario}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Aula</dt>
                <dd className="font-medium">{detalleMateria.aula}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Cupo</dt>
                <dd className="font-medium">
                  {inscritosMap[detalleMateria.id] ?? detalleMateria.inscritos} / {detalleMateria.cupo}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex gap-2">
              {enrolledIds.includes(detalleMateria.id) ? (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleCancelar(detalleMateria.id);
                    if (ok) setDetalleMateria(null);
                  }}
                  disabled={loadingId === detalleMateria.id}
                  className="flex-1 text-red-600 bg-red-50 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {loadingId === detalleMateria.id ? 'Procesando...' : 'Cancelar inscripción'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleInscribir(detalleMateria.id);
                    if (ok) setDetalleMateria(null);
                  }}
                  disabled={
                    loadingId === detalleMateria.id ||
                    (inscritosMap[detalleMateria.id] ?? detalleMateria.inscritos) >= detalleMateria.cupo ||
                    (!!userCarrera && detalleMateria.carrera !== userCarrera)
                  }
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {loadingId === detalleMateria.id ? 'Inscribiendo...' : 'Inscribirse'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetalleMateria(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleMateria && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
            <button
              type="button"
              onClick={() => setDetalleMateria(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-1 pr-8">{detalleMateria.nombre}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {detalleMateria.codigo} · {detalleMateria.carrera} · Semestre {detalleMateria.semestre}
            </p>
            <dl className="space-y-2 text-sm mb-4">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Docente</dt>
                <dd className="font-medium">{detalleMateria.profesor}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Horario</dt>
                <dd>{detalleMateria.horario}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Cupo</dt>
                <dd>
                  {inscritosMap[detalleMateria.id] ?? detalleMateria.inscritos} / {detalleMateria.cupo}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetalleMateria(null);
                  adminActionsRef.current!.abrirInscripciones(detalleMateria);
                }}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium"
              >
                Gestionar inscripciones
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetalleMateria(null);
                  adminActionsRef.current!.abrirEditarMateria(detalleMateria);
                }}
                className="w-full border py-2 rounded-lg text-sm"
              >
                Editar materia
              </button>
            </div>
          </div>
        </div>
      )}

      {mensaje && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {!isAdmin && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setVista('materias')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              vista === 'materias' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Materias disponibles
          </button>
          <button
            type="button"
            onClick={() => setVista('inscripciones')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              vista === 'inscripciones' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Mis inscripciones ({misInscripciones.length})
          </button>
          <button
            type="button"
            onClick={() => setVista('horario')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              vista === 'horario' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Mi horario
          </button>
        </div>
      )}

      {isAdmin && (
        <WikiAdminSection
          adminTab={adminTab}
          onAdminTabChange={setAdminTab}
          subjects={subjectsList}
          onSubjectsChange={setSubjectsList}
          students={studentsList}
          onStudentsChange={setStudentsList}
          enrollmentsBySubject={enrollmentsMap}
          onEnrollmentsChange={setEnrollmentsMap}
          inscritosMap={inscritosMap}
          onInscritosMapChange={setInscritosMap}
          onMessage={setMensaje}
          onActionsReady={(actions) => {
            adminActionsRef.current = actions;
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-20 space-y-6">
            {!isAdmin ? (
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Tu carrera</h3>
                <p className="text-sm text-indigo-700 font-medium">
                  {userCarrera || 'Sin carrera asignada'}
                </p>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Filtros (admin)</h3>
                <p className="text-xs text-gray-500">Todas las carreras y semestres</p>
              </div>
            )}

            {/* Ciclo view toggle for students */}
            {!isAdmin && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Vista de ciclo</p>
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button"
                    onClick={() => setCicloView('solo-ciclo')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      cicloView === 'solo-ciclo' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'
                    }`}>
                    Mi Ciclo ({userCiclo})
                  </button>
                  <button type="button"
                    onClick={() => setCicloView('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      cicloView === 'todos' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'
                    }`}>
                    Todos los ciclos
                  </button>
                </div>
                {cicloView === 'todos' && (
                  <p className="text-xs text-slate-400 mt-1.5">Cursadas = ciclos anteriores · Bloqueadas = ciclos futuros</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="wiki-buscar" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                <input
                  id="wiki-buscar"
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Materia, código o profesor..."
                  autoComplete="off"
                  className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-600"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="wiki-semestre" className="block text-sm font-medium text-gray-700 mb-2">
                Semestre
              </label>
              <select
                id="wiki-semestre"
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {SEMESTRES.filter((s) => s === 'Todos' || semestresDisponibles.includes(s)).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s === 'Todos' ? 'Todos los semestres' : `Semestre ${s}`}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label htmlFor="wiki-profesor" className="block text-sm font-medium text-gray-700 mb-2">
                Profesor
              </label>
              <select
                id="wiki-profesor"
                value={profesorFiltro}
                onChange={(e) => setProfesorFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Todos">Todos los profesores</option>
                {profesoresDisponibles.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={soloConCupo}
                onChange={(e) => setSoloConCupo(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Solo con cupo disponible
            </label>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1"
              >
                Limpiar filtros
              </button>
            )}

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Carrera</label>
                <select
                  value={carreraFiltroAdmin}
                  onChange={(e) => setCarreraFiltroAdmin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="todas">Todas las carreras</option>
                  {carrerasDisponibles.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
              <p>Semestres: {semestresDisponibles.join(', ') || '—'}</p>
              <p>
                {materiasFiltradas.length} de {subjectsList.filter((s) =>
                  isAdmin
                    ? carreraFiltroAdmin === 'todas' || s.carrera === carreraFiltroAdmin
                    : !userCarrera || s.carrera === userCarrera
                ).length}{' '}
                materia(s)
              </p>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          {isAdmin && adminTab === 'solicitudes' && (
            <PendingEnrollmentsPanel />
          )}
          {(!isAdmin || adminTab === 'materias') && (vista === 'materias' || isAdmin) && (
            <div className="space-y-4">
              {materiasFiltradas.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  {isAdmin
                    ? 'No hay materias con los filtros seleccionados. Usa «Nueva materia» para agregar una.'
                    : 'No hay materias con los filtros seleccionados.'}
                </div>
              ) : (
                materiasFiltradas.map(renderTarjeta)
              )}
            </div>
          )}

          {!isAdmin && vista === 'inscripciones' && (
            <div className="space-y-4">
              {misInscripciones.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  Aún no te has inscrito en ninguna materia.
                </div>
              ) : (
                misInscripciones.map(renderTarjeta)
              )}
            </div>
          )}

          {!isAdmin && vista === 'horario' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-indigo-50">
                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                  <Calendar size={20} />
                  Horario de {userCarrera || 'tu carrera'}
                </h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Materias en las que estás inscrito este periodo
                </p>
              </div>
              {misInscripciones.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Inscríbete en materias para ver tu horario aquí.
                </div>
              ) : (
                <div className="divide-y">
                  {misInscripciones.map((s) => (
                    <div
                      key={s.id}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{s.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {s.codigo} · Semestre {s.semestre}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{s.profesor}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-indigo-700 flex items-center justify-end gap-1">
                          <Clock size={16} />
                          {s.horario}
                        </p>
                        <p className="text-sm text-gray-500">{s.aula}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
