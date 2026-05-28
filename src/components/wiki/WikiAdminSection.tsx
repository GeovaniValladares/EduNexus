import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  BookOpen,
  X,
  Search,
  UserMinus,
} from 'lucide-react';
import { CARRERAS, WIKI_SEMESTRES } from '../../lib/wiki-admin-shared';
import type { WikiSubject, WikiEnrollmentStudent } from '../../lib/wiki-types';

export type WikiAdminStudent = {
  id: string;
  nombre: string;
  email: string;
  carrera: string;
  inscripciones: number;
};

type SubjectForm = {
  codigo: string;
  nombre: string;
  carrera: string;
  semestre: string;
  creditos: string;
  profesor: string;
  horario: string;
  aula: string;
  cupo: string;
};

type StudentForm = {
  nombre: string;
  email: string;
  carrera: string;
  password: string;
};

const emptySubject = (): SubjectForm => ({
  codigo: '',
  nombre: '',
  carrera: CARRERAS[0],
  semestre: 'I',
  creditos: '4',
  profesor: '',
  horario: '',
  aula: '',
  cupo: '40',
});

const emptyStudent = (): StudentForm => ({
  nombre: '',
  email: '',
  carrera: CARRERAS[0],
  password: '',
});

export type WikiAdminActions = {
  abrirInscripciones: (subject: WikiSubject) => void;
  abrirEditarMateria: (subject: WikiSubject) => void;
  eliminarMateria: (subject: WikiSubject) => void;
};

interface WikiAdminSectionProps {
  adminTab: 'materias' | 'alumnos' | 'solicitudes';
  onAdminTabChange: (tab: 'materias' | 'alumnos' | 'solicitudes') => void;
  subjects: WikiSubject[];
  onSubjectsChange: (subjects: WikiSubject[]) => void;
  students: WikiAdminStudent[];
  onStudentsChange: (students: WikiAdminStudent[]) => void;
  enrollmentsBySubject: Record<string, WikiEnrollmentStudent[]>;
  onEnrollmentsChange: (map: Record<string, WikiEnrollmentStudent[]>) => void;
  inscritosMap: Record<string, number>;
  onInscritosMapChange: (map: Record<string, number>) => void;
  onMessage: (msg: { tipo: 'ok' | 'error'; texto: string }) => void;
  onActionsReady: (actions: WikiAdminActions) => void;
}

export default function WikiAdminSection({
  adminTab,
  onAdminTabChange,
  subjects,
  onSubjectsChange,
  students,
  onStudentsChange,
  enrollmentsBySubject,
  onEnrollmentsChange,
  inscritosMap,
  onInscritosMapChange,
  onMessage,
  onActionsReady,
}: WikiAdminSectionProps) {
  const [busquedaAlumnos, setBusquedaAlumnos] = useState('');
  const [carreraAlumnos, setCarreraAlumnos] = useState('todas');
  const [saving, setSaving] = useState(false);

  const [subjectModal, setSubjectModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(
    null
  );
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(emptySubject);

  const [studentModal, setStudentModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(
    null
  );
  const [studentForm, setStudentForm] = useState<StudentForm>(emptyStudent);

  const [enrollModal, setEnrollModal] = useState<{
    subject: WikiSubject;
    students: WikiEnrollmentStudent[];
    loading: boolean;
  } | null>(null);
  const [alumnoInscribir, setAlumnoInscribir] = useState('');

  const alumnosFiltrados = useMemo(() => {
    let list = students;
    if (carreraAlumnos !== 'todas') {
      list = list.filter((s) => s.carrera === carreraAlumnos);
    }
    const q = busquedaAlumnos.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.nombre.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.carrera.toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, busquedaAlumnos, carreraAlumnos]);

  const alumnosParaInscribir = useMemo(() => {
    if (!enrollModal) return [];
    const inscritosIds = new Set(enrollModal.students.map((s) => s.userId));
    return students.filter(
      (s) =>
        !inscritosIds.has(s.id) &&
        (!s.carrera || s.carrera === enrollModal.subject.carrera)
    );
  }, [enrollModal, students]);

  const abrirCrearMateria = () => {
    setSubjectForm(emptySubject());
    setSubjectModal({ mode: 'create' });
  };

  const abrirEditarMateria = (s: WikiSubject) => {
    setSubjectForm({
      codigo: s.codigo,
      nombre: s.nombre,
      carrera: s.carrera,
      semestre: s.semestre,
      creditos: String(s.creditos),
      profesor: s.profesor,
      horario: s.horario,
      aula: s.aula,
      cupo: String(s.cupo),
    });
    setSubjectModal({ mode: 'edit', id: s.id });
  };

  const guardarMateria = async () => {
    setSaving(true);
    try {
      const payload = {
        ...subjectForm,
        creditos: Number(subjectForm.creditos),
        cupo: Number(subjectForm.cupo),
      };
      const isEdit = subjectModal?.mode === 'edit';
      const res = await fetch('/api/wiki/admin/subjects', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: subjectModal!.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');

      const saved = data.subject as WikiSubject;
      if (isEdit) {
        onSubjectsChange(subjects.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)));
        onMessage({ tipo: 'ok', texto: 'Materia actualizada' });
      } else {
        onSubjectsChange([...subjects, saved]);
        onInscritosMapChange({ ...inscritosMap, [saved.id]: 0 });
        onMessage({ tipo: 'ok', texto: 'Materia creada' });
      }
      setSubjectModal(null);
    } catch (err) {
      onMessage({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al guardar materia',
      });
    } finally {
      setSaving(false);
    }
  };

  const eliminarMateria = async (s: WikiSubject) => {
    if (
      !window.confirm(
        `¿Eliminar "${s.nombre}"? Se darán de baja ${inscritosMap[s.id] ?? s.inscritos} inscripción(es).`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/wiki/admin/subjects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al eliminar');

      onSubjectsChange(subjects.filter((x) => x.id !== s.id));
      const nextEnroll = { ...enrollmentsBySubject };
      delete nextEnroll[s.id];
      onEnrollmentsChange(nextEnroll);
      const nextMap = { ...inscritosMap };
      delete nextMap[s.id];
      onInscritosMapChange(nextMap);
      onMessage({ tipo: 'ok', texto: 'Materia eliminada' });
    } catch (err) {
      onMessage({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al eliminar',
      });
    } finally {
      setSaving(false);
    }
  };

  const abrirInscripciones = async (subject: WikiSubject) => {
    const cached = enrollmentsBySubject[subject.id];
    setEnrollModal({ subject, students: cached ?? [], loading: !cached });
    setAlumnoInscribir('');

    if (cached) return;

    try {
      const res = await fetch(
        `/api/wiki/enrollments?subjectId=${encodeURIComponent(subject.id)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const list: WikiEnrollmentStudent[] = (data.students ?? []).map(
        (st: WikiEnrollmentStudent & { enrollmentId?: string }) => ({
          enrollmentId: st.enrollmentId,
          userId: st.userId,
          nombre: st.nombre,
          email: st.email,
          carrera: st.carrera,
          fecha: st.fecha,
        })
      );
      setEnrollModal({ subject, students: list, loading: false });
      onEnrollmentsChange({ ...enrollmentsBySubject, [subject.id]: list });
    } catch {
      setEnrollModal({ subject, students: [], loading: false });
      onMessage({ tipo: 'error', texto: 'No se pudo cargar inscritos' });
    }
  };

  const inscribirAlumno = async () => {
    if (!enrollModal || !alumnoInscribir) return;
    setSaving(true);
    try {
      const res = await fetch('/api/wiki/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: alumnoInscribir, subjectId: enrollModal.subject.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const nuevo = data.enrollment as WikiEnrollmentStudent & { enrollmentId: string };
      const updated = [
        ...enrollModal.students,
        {
          enrollmentId: nuevo.enrollmentId,
          userId: nuevo.userId,
          nombre: nuevo.nombre,
          email: nuevo.email,
          carrera: nuevo.carrera,
          fecha: nuevo.fecha,
        },
      ];
      setEnrollModal({ ...enrollModal, students: updated });
      onEnrollmentsChange({ ...enrollmentsBySubject, [enrollModal.subject.id]: updated });
      const count = (inscritosMap[enrollModal.subject.id] ?? 0) + 1;
      onInscritosMapChange({ ...inscritosMap, [enrollModal.subject.id]: count });
      onSubjectsChange(
        subjects.map((s) =>
          s.id === enrollModal.subject.id ? { ...s, inscritos: count } : s
        )
      );
      onStudentsChange(
        students.map((st) =>
          st.id === alumnoInscribir
            ? { ...st, inscripciones: st.inscripciones + 1 }
            : st
        )
      );
      setAlumnoInscribir('');
      onMessage({ tipo: 'ok', texto: 'Alumno inscrito' });
    } catch (err) {
      onMessage({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al inscribir',
      });
    } finally {
      setSaving(false);
    }
  };

  const darDeBaja = async (st: WikiEnrollmentStudent) => {
    if (!enrollModal) return;
    if (!window.confirm(`¿Dar de baja a ${st.nombre}?`)) return;

    setSaving(true);
    try {
      const res = await fetch('/api/wiki/admin/enrollments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: st.enrollmentId,
          userId: st.userId,
          subjectId: enrollModal.subject.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const updated = enrollModal.students.filter((x) => x.userId !== st.userId);
      setEnrollModal({ ...enrollModal, students: updated });
      onEnrollmentsChange({ ...enrollmentsBySubject, [enrollModal.subject.id]: updated });
      const count = Math.max(0, (inscritosMap[enrollModal.subject.id] ?? 1) - 1);
      onInscritosMapChange({ ...inscritosMap, [enrollModal.subject.id]: count });
      onSubjectsChange(
        subjects.map((s) =>
          s.id === enrollModal.subject.id ? { ...s, inscritos: count } : s
        )
      );
      onStudentsChange(
        students.map((x) =>
          x.id === st.userId ? { ...x, inscripciones: Math.max(0, x.inscripciones - 1) } : x
        )
      );
      onMessage({ tipo: 'ok', texto: 'Alumno dado de baja' });
    } catch (err) {
      onMessage({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al dar de baja',
      });
    } finally {
      setSaving(false);
    }
  };

  const abrirCrearAlumno = () => {
    setStudentForm(emptyStudent());
    setStudentModal({ mode: 'create' });
  };

  const abrirEditarAlumno = (st: WikiAdminStudent) => {
    setStudentForm({
      nombre: st.nombre,
      email: st.email,
      carrera: st.carrera || CARRERAS[0],
      password: '',
    });
    setStudentModal({ mode: 'edit', id: st.id });
  };

  const guardarAlumno = async () => {
    setSaving(true);
    try {
      const isEdit = studentModal?.mode === 'edit';
      const body: Record<string, string> = { ...studentForm };
      if (isEdit && !body.password) delete body.password;

      const res = await fetch('/api/wiki/admin/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: studentModal!.id, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');

      const saved = data.student as WikiAdminStudent;
      if (isEdit) {
        onStudentsChange(students.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)));
        onMessage({ tipo: 'ok', texto: 'Alumno actualizado' });
      } else {
        onStudentsChange([...students, saved]);
        const pwdMsg = data.tempPassword
          ? ` Contraseña temporal: ${data.tempPassword}`
          : '';
        onMessage({ tipo: 'ok', texto: `Alumno creado.${pwdMsg}` });
      }
      setStudentModal(null);
    } catch (err) {
      onMessage({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al guardar alumno',
      });
    } finally {
      setSaving(false);
    }
  };

  const eliminarAlumno = async (st: WikiAdminStudent) => {
    if (
      !window.confirm(
        `¿Eliminar a ${st.nombre}? Se cancelarán ${st.inscripciones} inscripción(es).`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/wiki/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: st.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      onStudentsChange(students.filter((s) => s.id !== st.id));
      const nextEnroll = { ...enrollmentsBySubject };
      for (const sid of Object.keys(nextEnroll)) {
        nextEnroll[sid] = nextEnroll[sid].filter((e) => e.userId !== st.id);
      }
      onEnrollmentsChange(nextEnroll);
      const nextMap = { ...inscritosMap };
      for (const sid of Object.keys(nextMap)) {
        if (nextEnroll[sid]) nextMap[sid] = nextEnroll[sid].length;
      }
      onInscritosMapChange(nextMap);
      onSubjectsChange(
        subjects.map((s) => ({ ...s, inscritos: nextMap[s.id] ?? s.inscritos }))
      );
      onMessage({ tipo: 'ok', texto: 'Alumno eliminado' });
    } catch (err) {
      onMessage({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al eliminar',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    onActionsReady({
      abrirInscripciones,
      abrirEditarMateria,
      eliminarMateria,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => onAdminTabChange('materias')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            adminTab === 'materias' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          <BookOpen size={16} className="inline mr-1" />
          Materias ({subjects.length})
        </button>
        <button
          type="button"
          onClick={() => onAdminTabChange('alumnos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            adminTab === 'alumnos' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          <Users size={16} className="inline mr-1" />
          Alumnos ({students.length})
        </button>
        <button
          type="button"
          onClick={() => onAdminTabChange('solicitudes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            adminTab === 'solicitudes' ? 'bg-yellow-500 text-white' : 'bg-white border text-gray-700'
          }`}
        >
          <UserPlus size={16} className="inline mr-1" />
          Solicitudes
        </button>
        <div className="flex-1" />
        {adminTab === 'materias' ? (
          <button
            type="button"
            onClick={abrirCrearMateria}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Plus size={18} />
            Nueva materia
          </button>
        ) : (
          <button
            type="button"
            onClick={abrirCrearAlumno}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <UserPlus size={18} />
            Nuevo alumno
          </button>
        )}
      </div>

      {adminTab === 'alumnos' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="admin-buscar-alumno" className="block text-xs font-medium text-gray-600 mb-1">
                Buscar alumno
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  id="admin-buscar-alumno"
                  type="search"
                  value={busquedaAlumnos}
                  onChange={(e) => setBusquedaAlumnos(e.target.value)}
                  placeholder="Nombre o correo..."
                  className="w-full pl-9 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="admin-carrera-alumno" className="block text-xs font-medium text-gray-600 mb-1">
                Carrera
              </label>
              <select
                id="admin-carrera-alumno"
                value={carreraAlumnos}
                onChange={(e) => setCarreraAlumnos(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="todas">Todas</option>
                {CARRERAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Correo</th>
                  <th className="px-4 py-3 text-left">Carrera</th>
                  <th className="px-4 py-3 text-center">Inscripciones</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {alumnosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No hay alumnos con esos filtros.
                    </td>
                  </tr>
                ) : (
                  alumnosFiltrados.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{st.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{st.email}</td>
                      <td className="px-4 py-3 text-gray-600">{st.carrera || '—'}</td>
                      <td className="px-4 py-3 text-center">{st.inscripciones}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => abrirEditarAlumno(st)}
                          className="text-indigo-600 hover:underline text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarAlumno(st)}
                          className="text-red-600 hover:underline text-xs font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {subjectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">
                {subjectModal.mode === 'create' ? 'Nueva materia' : 'Editar materia'}
              </h3>
              <button type="button" onClick={() => setSubjectModal(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-600">Código</label>
                <input
                  className={inputClass}
                  value={subjectForm.codigo}
                  onChange={(e) => setSubjectForm({ ...subjectForm, codigo: e.target.value })}
                  placeholder="INF-101"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-600">Créditos</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className={inputClass}
                  value={subjectForm.creditos}
                  onChange={(e) => setSubjectForm({ ...subjectForm, creditos: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Nombre</label>
                <input
                  className={inputClass}
                  value={subjectForm.nombre}
                  onChange={(e) => setSubjectForm({ ...subjectForm, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Carrera</label>
                <select
                  className={inputClass}
                  value={subjectForm.carrera}
                  onChange={(e) => setSubjectForm({ ...subjectForm, carrera: e.target.value })}
                >
                  {CARRERAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Semestre</label>
                <select
                  className={inputClass}
                  value={subjectForm.semestre}
                  onChange={(e) => setSubjectForm({ ...subjectForm, semestre: e.target.value })}
                >
                  {WIKI_SEMESTRES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Docente</label>
                <input
                  className={inputClass}
                  value={subjectForm.profesor}
                  onChange={(e) => setSubjectForm({ ...subjectForm, profesor: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Horario</label>
                <input
                  className={inputClass}
                  value={subjectForm.horario}
                  onChange={(e) => setSubjectForm({ ...subjectForm, horario: e.target.value })}
                  placeholder="Lun y Mié 08:00-10:00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Aula</label>
                <input
                  className={inputClass}
                  value={subjectForm.aula}
                  onChange={(e) => setSubjectForm({ ...subjectForm, aula: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Cupo</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={subjectForm.cupo}
                  onChange={(e) => setSubjectForm({ ...subjectForm, cupo: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={guardarMateria}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setSubjectModal(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {studentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">
                {studentModal.mode === 'create' ? 'Nuevo alumno' : 'Editar alumno'}
              </h3>
              <button type="button" onClick={() => setStudentModal(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nombre completo</label>
                <input
                  className={inputClass}
                  value={studentForm.nombre}
                  onChange={(e) => setStudentForm({ ...studentForm, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Correo</label>
                <input
                  type="email"
                  className={inputClass}
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Carrera</label>
                <select
                  className={inputClass}
                  value={studentForm.carrera}
                  onChange={(e) => setStudentForm({ ...studentForm, carrera: e.target.value })}
                >
                  {CARRERAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">
                  {studentModal.mode === 'create'
                    ? 'Contraseña (opcional, si vacía: AlumnoULS2026!)'
                    : 'Nueva contraseña (opcional)'}
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={guardarAlumno}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setStudentModal(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {enrollModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Inscripciones — {enrollModal.subject.nombre}</h3>
                <p className="text-sm text-gray-500">
                  {enrollModal.students.length} / {enrollModal.subject.cupo} cupo
                </p>
              </div>
              <button type="button" onClick={() => setEnrollModal(null)} aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>
            <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-600 block mb-1">Inscribir alumno</label>
                <select
                  value={alumnoInscribir}
                  onChange={(e) => setAlumnoInscribir(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {alumnosParaInscribir.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={inscribirAlumno}
                disabled={!alumnoInscribir || saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Inscribir
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {enrollModal.loading ? (
                <p className="text-center text-gray-500 py-8">Cargando...</p>
              ) : enrollModal.students.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Sin inscritos.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="text-left py-2">Alumno</th>
                      <th className="text-left py-2">Carrera</th>
                      <th className="text-left py-2">Fecha</th>
                      <th className="text-right py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {enrollModal.students.map((st) => (
                      <tr key={st.userId}>
                        <td className="py-3">
                          <p className="font-medium">{st.nombre}</p>
                          <p className="text-xs text-gray-500">{st.email}</p>
                        </td>
                        <td className="py-3 text-gray-600">{st.carrera}</td>
                        <td className="py-3 text-gray-500">{st.fecha}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => darDeBaja(st)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 text-red-600 text-xs font-medium hover:underline disabled:opacity-50"
                          >
                            <UserMinus size={14} />
                            Dar de baja
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
