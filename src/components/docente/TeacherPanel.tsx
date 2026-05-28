import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, Users, Calendar, ChevronRight, Check, X, Clock,
  MapPin, Edit2, Save, RefreshCw, UserCheck, UserX, ChevronLeft,
  Bell, FileText, Send, AlertCircle, Trash2, AlertTriangle,
  GraduationCap, Laptop, Beaker, Briefcase, Globe, Database, 
  BarChart, Code, Shield, Cpu, Zap, Library
} from 'lucide-react';

type TeacherSubject = {
  id: string; codigo: string; nombre: string; carrera: string; semestre: string;
  creditos: number; profesor: string; horario: string; aula: string; cupo: number;
  totalEnrolled: number; totalPending: number;
};

type EnrolledStudent = {
  enrollmentId: string; userId: string; nombre: string; email: string;
  carrera: string; ciclo: string; avatarUrl: string; estado: string; createdAt: string;
};

type Notice = {
  id: string; titulo: string; contenido: string; urgente: boolean; createdAt: string;
};

type View = 'subjects' | 'students' | 'attendance' | 'schedule' | 'notices' | 'evaluations';

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string | Date) {
  try {
    return new Date(d).toLocaleDateString('es-SV', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return String(d); }
}

/**
 * Returns a professional icon based on the subject name.
 */
function getSubjectIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('hardware') || n.includes('computador')) return <Cpu size={20} />;
  if (n.includes('software') || n.includes('programación') || n.includes('java')) return <Code size={20} />;
  if (n.includes('redes') || n.includes('telecom')) return <Globe size={20} />;
  if (n.includes('base de datos') || n.includes('sql')) return <Database size={20} />;
  if (n.includes('web') || n.includes('diseño')) return <Laptop size={20} />;
  if (n.includes('seguridad') || n.includes('ciber')) return <Shield size={20} />;
  if (n.includes('laboratorio') || n.includes('fisica') || n.includes('quimica')) return <Beaker size={20} />;
  if (n.includes('administración') || n.includes('gerencia')) return <Briefcase size={20} />;
  if (n.includes('matemática') || n.includes('estadística')) return <BarChart size={20} />;
  if (n.includes('idioma') || n.includes('inglés')) return <Zap size={20} />;
  if (n.includes('teología') || n.includes('social') || n.includes('psicología')) return <Library size={20} />;
  return <GraduationCap size={20} />;
}

export default function TeacherPanel({ teacherNombre }: { teacherNombre: string }) {
  const [view, setView] = useState<View>('subjects');
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<TeacherSubject | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; text: string } | null>(null);

  // Notices
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [newNotice, setNewNotice] = useState({ titulo: '', contenido: '', urgente: false });
  const [savingNotice, setSavingNotice] = useState(false);

  // Evaluations
  const [evalTitle, setEvalTitle] = useState('Parcial 1');
  const [grades, setGrades] = useState<Record<string, number | ''>>({});
  const [gradeComments, setGradeComments] = useState<Record<string, string>>({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Schedule edit
  const [editSchedule, setEditSchedule] = useState<{ id: string; horario: string; aula: string } | null>(null);

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [attendanceNotas, setAttendanceNotas] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => { fetchSubjects(); }, []);

  const showMsg = (tipo: 'ok' | 'error', text: string) => {
    setMsg({ tipo, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const r = await fetch('/api/docente/subjects');
      if (r.ok) { const d = await r.json(); setSubjects(d.subjects ?? []); }
    } finally { setLoadingSubjects(false); }
  };

  const fetchStudents = async (subjectId: string) => {
    setLoadingStudents(true);
    try {
      const r = await fetch(`/api/docente/students?subjectId=${subjectId}`);
      if (r.ok) { const d = await r.json(); setStudents(d.students ?? []); }
    } finally { setLoadingStudents(false); }
  };

  const fetchAttendance = async (subjectId: string, fecha: string) => {
    const r = await fetch(`/api/docente/attendance?subjectId=${subjectId}&fecha=${fecha}`);
    if (r.ok) {
      const d = await r.json();
      const map: Record<string, boolean> = {};
      const notas: Record<string, string> = {};
      for (const rec of d.records ?? []) {
        map[rec.userId] = rec.presente;
        if (rec.nota) notas[rec.userId] = rec.nota;
      }
      setAttendance(map);
      setAttendanceNotas(notas);
    }
  };

  const fetchNotices = async (subjectId: string) => {
    setLoadingNotices(true);
    try {
      const r = await fetch(`/api/docente/notices?subjectId=${subjectId}`);
      if (r.ok) { const d = await r.json(); setNotices(d.notices ?? []); }
    } finally { setLoadingNotices(false); }
  };

  const fetchGrades = useCallback(async (subjectId: string, titulo: string) => {
    setLoadingGrades(true);
    try {
      const r = await fetch(`/api/docente/grades?subjectId=${subjectId}&titulo=${encodeURIComponent(titulo)}`);
      if (r.ok) {
        const d = await r.json();
        const g: Record<string, number | ''> = {};
        const c: Record<string, string> = {};
        for (const [uid, val] of Object.entries(d.byUser as Record<string, { nota: number; comentario: string }>)) {
          g[uid] = val.nota;
          c[uid] = val.comentario;
        }
        setGrades(g);
        setGradeComments(c);
      }
    } finally { setLoadingGrades(false); }
  }, []);

  const openSubject = (sub: TeacherSubject) => {
    setSelectedSubject(sub); setView('students'); fetchStudents(sub.id);
  };
  const openAttendance = (sub: TeacherSubject) => {
    setSelectedSubject(sub); setView('attendance');
    fetchStudents(sub.id); fetchAttendance(sub.id, attendanceDate);
  };
  const openNotices = (sub: TeacherSubject) => {
    setSelectedSubject(sub); setView('notices'); setNotices([]); fetchNotices(sub.id);
  };
  const openEvaluations = (sub: TeacherSubject) => {
    setSelectedSubject(sub); setView('evaluations');
    setGrades({}); setGradeComments({});
    fetchStudents(sub.id);
    fetchGrades(sub.id, evalTitle);
  };
  const openScheduleEdit = (sub: TeacherSubject) => {
    setEditSchedule({ id: sub.id, horario: sub.horario, aula: sub.aula });
    setView('schedule'); setSelectedSubject(sub);
  };

  const handleReviewEnrollment = async (enrollmentId: string, accion: 'approve' | 'reject') => {
    try {
      const r = await fetch('/api/docente/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, accion }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setStudents((prev) =>
        prev.map((s) =>
          s.enrollmentId === enrollmentId ? { ...s, estado: accion === 'approve' ? 'approved' : 'rejected' } : s
        )
      );
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === selectedSubject?.id
            ? { ...s, totalPending: Math.max(0, s.totalPending - 1), totalEnrolled: accion === 'approve' ? s.totalEnrolled + 1 : s.totalEnrolled }
            : s
        )
      );
      showMsg('ok', accion === 'approve' ? 'Inscripción aprobada' : 'Inscripción rechazada');
    } catch (e: unknown) {
      showMsg('error', e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDateChange = async (date: string) => {
    setAttendanceDate(date);
    if (selectedSubject) await fetchAttendance(selectedSubject.id, date);
  };

  const togglePresente = (userId: string) => {
    setAttendance((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const saveAttendance = async () => {
    if (!selectedSubject) return;
    setSavingAttendance(true);
    const approvedStudents = students.filter((s) => s.estado === 'approved');
    const records = approvedStudents.map((s) => ({
      userId: s.userId, presente: attendance[s.userId] ?? false, nota: attendanceNotas[s.userId] ?? '',
    }));
    try {
      const r = await fetch('/api/docente/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubject.id, fecha: attendanceDate, records }),
      });
      if (r.ok) showMsg('ok', 'Asistencia guardada correctamente');
      else showMsg('error', 'Error al guardar');
    } catch { showMsg('error', 'Error de conexión'); }
    finally { setSavingAttendance(false); }
  };

  const saveSchedule = async () => {
    if (!editSchedule) return;
    try {
      const r = await fetch('/api/docente/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: editSchedule.id, horario: editSchedule.horario, aula: editSchedule.aula }),
      });
      if (r.ok) {
        setSubjects((prev) =>
          prev.map((s) => s.id === editSchedule.id ? { ...s, horario: editSchedule.horario, aula: editSchedule.aula } : s)
        );
        setEditSchedule(null); setView('subjects');
        showMsg('ok', 'Horario actualizado');
      } else showMsg('error', 'Error al guardar horario');
    } catch { showMsg('error', 'Error de conexión'); }
  };

  const publishNotice = async () => {
    if (!selectedSubject || !newNotice.titulo.trim() || !newNotice.contenido.trim()) return;
    setSavingNotice(true);
    try {
      const r = await fetch('/api/docente/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubject.id,
          titulo: newNotice.titulo,
          contenido: newNotice.contenido,
          urgente: newNotice.urgente,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setNotices((prev) => [d.notice, ...prev]);
        setNewNotice({ titulo: '', contenido: '', urgente: false });
        showMsg('ok', 'Aviso publicado correctamente');
      } else {
        showMsg('error', 'Error al publicar aviso');
      }
    } catch { showMsg('error', 'Error de conexión'); }
    finally { setSavingNotice(false); }
  };

  const deleteNotice = async (noticeId: string) => {
    try {
      const r = await fetch(`/api/docente/notices?id=${noticeId}`, { method: 'DELETE' });
      if (r.ok) {
        setNotices((prev) => prev.filter((n) => n.id !== noticeId));
        showMsg('ok', 'Aviso eliminado');
      } else showMsg('error', 'Error al eliminar');
    } catch { showMsg('error', 'Error de conexión'); }
  };

  const saveGrades = async () => {
    if (!selectedSubject || !evalTitle) return;
    setSavingGrades(true);
    const approvedStudents = students.filter((s) => s.estado === 'approved');
    const records = approvedStudents
      .filter((s) => grades[s.userId] !== '' && grades[s.userId] !== undefined)
      .map((s) => ({
        userId: s.userId,
        nota: Number(grades[s.userId]),
        comentario: gradeComments[s.userId] ?? '',
      }));
    try {
      const r = await fetch('/api/docente/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubject.id, titulo: evalTitle, records }),
      });
      if (r.ok) showMsg('ok', `Calificaciones de "${evalTitle}" guardadas`);
      else showMsg('error', 'Error al guardar notas');
    } catch { showMsg('error', 'Error de conexión'); }
    finally { setSavingGrades(false); }
  };

  const handleEvalTitleChange = (title: string) => {
    setEvalTitle(title);
    setGrades({}); setGradeComments({});
    if (selectedSubject) fetchGrades(selectedSubject.id, title);
  };

  const approvedStudents = students.filter((s) => s.estado === 'approved');
  const pendingStudents  = students.filter((s) => s.estado === 'pending');

  return (
    <div className="docente-panel w-full max-w-7xl mx-auto px-4 md:px-6 py-8 bg-slate-50/50 min-h-screen">
      {msg && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${msg.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {msg.tipo === 'ok' ? <Check size={20} /> : <X size={20} />}
          <p className="font-bold text-sm tracking-wide">{msg.text}</p>
        </div>
      )}

      {/* ── My Subjects list ── */}
      {view === 'subjects' && (
        <div className="animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                  <BookOpen size={24} strokeWidth={2.5} />
                </div>
                Mis Materias
              </h2>
              <p className="text-slate-500 mt-2 font-medium">Gestión académica para el ciclo actual</p>
            </div>
            <button type="button" onClick={fetchSubjects} 
              className="p-3 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-2xl transition-all shadow-sm active:scale-95" 
              title="Actualizar catálogo">
              <RefreshCw size={20} className={loadingSubjects ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingSubjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-bold text-lg px-6">No tienes materias asignadas actualmente.</p>
              <p className="text-slate-400 text-sm mt-2">Verifica que tu nombre coincida con el catálogo institucional:</p>
              <code className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 font-black rounded-xl inline-block border border-indigo-100 italic">{teacherNombre}</code>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
              {subjects.map((sub) => (
                <div key={sub.id} className="group bg-white border border-slate-200 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-4 bg-slate-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        {getSubjectIcon(sub.nombre)}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">Ciclo {sub.semestre}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{sub.codigo}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{sub.nombre}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-6 opacity-70">
                      {sub.carrera.replace(/^Licenciatura en |^Técnico en |^Ingeniería /,'')}
                    </p>

                    <div className="space-y-3 mb-8">
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Clock size={14} /></div>
                        <p className="text-xs font-bold">{sub.horario}</p>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><MapPin size={14} /></div>
                        <p className="text-xs font-bold">Aula {sub.aula}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 py-3 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Inscritos</p>
                        <p className="text-xs font-black text-emerald-600">{sub.totalEnrolled}</p>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Pendientes</p>
                        <p className={`text-xs font-black ${sub.totalPending > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{sub.totalPending}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Créditos</p>
                        <p className="text-xs font-black text-indigo-600">{sub.creditos}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => openSubject(sub)} className="flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                        <Users size={14} /> Alumnos
                      </button>
                      <button onClick={() => openAttendance(sub)} className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 text-xs font-black rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                        <Calendar size={14} /> Asistencia
                      </button>
                      <button onClick={() => openNotices(sub)} className="flex items-center justify-center gap-2 py-2.5 bg-amber-50 text-amber-700 text-xs font-black rounded-xl hover:bg-amber-600 hover:text-white transition-all">
                        <Bell size={14} /> Avisos
                      </button>
                      <button onClick={() => openEvaluations(sub)} className="flex items-center justify-center gap-2 py-2.5 bg-sky-50 text-sky-700 text-xs font-black rounded-xl hover:bg-sky-600 hover:text-white transition-all">
                        <FileText size={14} /> Notas
                      </button>
                      <button onClick={() => openScheduleEdit(sub)} className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-900 hover:text-white transition-all mt-1">
                        <Edit2 size={14} /> Gestionar Horario y Aula
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Detail Views (Back Button Header) ── */}
      {view !== 'subjects' && selectedSubject && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => setView('subjects')} 
                className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-2xl transition-all shadow-sm active:scale-90">
                <ChevronLeft size={24} />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                    {getSubjectIcon(selectedSubject.nombre)}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedSubject.nombre}</h2>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  {selectedSubject.codigo} <span className="w-1 h-1 bg-slate-300 rounded-full" /> CICLO {selectedSubject.semestre}
                </p>
              </div>
            </div>

            {/* Quick Actions Tabs */}
            <div className="flex items-center p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto no-scrollbar">
              {[
                { id: 'students', label: 'Alumnos', icon: Users },
                { id: 'attendance', label: 'Asistencia', icon: Calendar },
                { id: 'notices', label: 'Avisos', icon: Bell },
                { id: 'evaluations', label: 'Notas', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => tab.id === 'students' ? openSubject(selectedSubject) : 
                             tab.id === 'attendance' ? openAttendance(selectedSubject) :
                             tab.id === 'notices' ? openNotices(selectedSubject) : openEvaluations(selectedSubject)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${view === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <tab.icon size={14} strokeWidth={2.5} /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* View Content Rendering */}
          {view === 'students' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {pendingStudents.length > 0 && (
                  <section className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-8">
                    <h3 className="text-lg font-black text-amber-900 flex items-center gap-2 mb-6">
                      <AlertCircle size={20} /> Solicitudes Pendientes ({pendingStudents.length})
                    </h3>
                    <div className="space-y-3">
                      {pendingStudents.map((s) => (
                        <div key={s.enrollmentId} className="bg-white p-4 rounded-3xl border border-amber-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-black text-base shrink-0 overflow-hidden uppercase">
                            {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(s.nombre)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 truncate">{s.nombre}</p>
                            <p className="text-xs text-slate-500 font-medium italic">{s.email}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleReviewEnrollment(s.enrollmentId, 'approve')} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-90" title="Aprobar"><UserCheck size={18} /></button>
                            <button onClick={() => handleReviewEnrollment(s.enrollmentId, 'reject')} className="p-3 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all active:scale-90" title="Rechazar"><UserX size={18} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    Lista de Inscritos <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100">{approvedStudents.length} alumnos</span>
                  </h3>
                  {approvedStudents.length === 0 ? (
                    <div className="py-20 text-center bg-white border border-slate-200 rounded-[2.5rem]">
                      <Users size={40} className="text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold italic">No hay alumnos inscritos todavía.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {approvedStudents.map((s, i) => (
                        <div key={s.enrollmentId} className="bg-white border border-slate-200 p-4 rounded-[1.5rem] flex items-center gap-4 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group cursor-default">
                          <span className="text-[10px] font-black text-slate-300 w-4 group-hover:text-indigo-400 transition-colors">{String(i + 1).padStart(2, '0')}</span>
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-base shrink-0 overflow-hidden uppercase border border-indigo-100">
                            {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(s.nombre)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{s.nombre}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{s.carrera.replace(/^Licenciatura en |^Técnico en /,'')} · CICLO {s.ciclo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-6">Detalles de la Materia</h4>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ubicación</p>
                      <div className="flex items-center gap-2"><MapPin size={16} className="text-indigo-400" /> <span className="font-black text-sm">Aula {selectedSubject.aula}</span></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Horario</p>
                      <div className="flex items-center gap-2"><Clock size={16} className="text-indigo-400" /> <span className="font-black text-sm">{selectedSubject.horario}</span></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ocupación del Grupo</p>
                      <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${(selectedSubject.totalEnrolled / selectedSubject.cupo) * 100}%` }} />
                      </div>
                      <p className="text-[10px] font-bold mt-2 text-slate-400 flex justify-between uppercase">
                        <span>{selectedSubject.totalEnrolled} Inscritos</span>
                        <span>{selectedSubject.cupo} Cupo Máx</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'attendance' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Calendar size={24} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Registro</p>
                    <input type="date" value={attendanceDate} onChange={(e) => handleDateChange(e.target.value)}
                      className="text-lg font-black text-slate-900 border-none p-0 focus:ring-0 cursor-pointer bg-transparent uppercase" />
                  </div>
                </div>
                <button type="button" onClick={saveAttendance} disabled={savingAttendance || approvedStudents.length === 0}
                  className="w-full md:w-auto px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 active:scale-95 uppercase text-xs tracking-widest">
                  <Save size={18} /> {savingAttendance ? 'Guardando...' : 'Confirmar Asistencia'}
                </button>
              </div>

              <div className="space-y-3">
                {approvedStudents.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-20 text-center font-bold text-slate-400 italic">No hay alumnos inscritos en esta materia.</div>
                ) : approvedStudents.map((s) => (
                  <div key={s.userId} className={`group p-4 rounded-[2rem] border transition-all duration-300 flex items-center gap-4 ${attendance[s.userId] ? 'bg-emerald-50/50 border-emerald-200 shadow-md shadow-emerald-50' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 overflow-hidden uppercase transition-all ${attendance[s.userId] ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(s.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 truncate">{s.nombre}</p>
                      <input type="text" placeholder="Observación (tardanza, falta justificada...)"
                        value={attendanceNotas[s.userId] ?? ''}
                        onChange={(e) => setAttendanceNotas((prev) => ({ ...prev, [s.userId]: e.target.value }))}
                        className="w-full bg-transparent border-none text-[11px] font-bold text-slate-500 focus:ring-0 p-0 placeholder:text-slate-300" />
                    </div>
                    <button type="button" onClick={() => togglePresente(s.userId)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${attendance[s.userId] ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      {attendance[s.userId] ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                      {attendance[s.userId] ? 'Presente' : 'Ausente'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'notices' && (
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Form Sidebar */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Send size={18} className="text-amber-500" /> Nuevo Aviso
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título del Comunicado</label>
                      <input type="text" value={newNotice.titulo} placeholder="Ej: Cambio de aula para el examen"
                        onChange={(e) => setNewNotice({ ...newNotice, titulo: e.target.value })}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensaje Detallado</label>
                      <textarea value={newNotice.contenido} placeholder="Escribe el mensaje para el grupo..." rows={5}
                        onChange={(e) => setNewNotice({ ...newNotice, contenido: e.target.value })}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white outline-none transition-all resize-none" />
                    </div>
                    <div className="flex flex-col gap-4 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer group p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                        <input type="checkbox" checked={newNotice.urgente} onChange={(e) => setNewNotice({ ...newNotice, urgente: e.target.checked })}
                          className="w-5 h-5 text-amber-600 border-slate-300 rounded-lg focus:ring-amber-500" />
                        <span className="text-xs font-black text-amber-800 uppercase tracking-wide">Marcar como urgente</span>
                      </label>
                      <button type="button" onClick={publishNotice}
                        disabled={savingNotice || !newNotice.titulo.trim() || !newNotice.contenido.trim()}
                        className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 disabled:opacity-50 active:scale-95 uppercase text-xs tracking-widest">
                        {savingNotice ? 'Publicando...' : 'Publicar Aviso'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* History List */}
              <div className="lg:col-span-3 space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                  Historial de Avisos <span>{notices.length}</span>
                </h3>
                {loadingNotices ? (
                  <div className="space-y-4">
                    {[1,2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}
                  </div>
                ) : notices.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-[2.5rem]">
                    <Bell size={40} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold italic">No has publicado avisos todavía.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notices.map((n) => (
                      <div key={n.id} className={`group relative p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-xl ${n.urgente ? 'bg-amber-50/50 border-amber-200 shadow-amber-50' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            {n.urgente && (
                              <div className="p-1.5 bg-amber-600 text-white rounded-lg animate-pulse">
                                <AlertTriangle size={14} strokeWidth={3} />
                              </div>
                            )}
                            <p className="font-black text-slate-900 leading-tight tracking-tight">{n.titulo}</p>
                          </div>
                          <button type="button" onClick={() => deleteNotice(n.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0" title="Eliminar aviso">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{n.contenido}</p>
                        <p className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest flex items-center gap-2">
                          <Calendar size={10} /> {formatDate(n.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'evaluations' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="p-4 bg-sky-600 text-white rounded-2xl shadow-lg shadow-sky-900/50"><FileText size={24} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Seleccionar Evaluación</p>
                    <select value={evalTitle} onChange={(e) => handleEvalTitleChange(e.target.value)}
                      className="w-full md:w-64 bg-slate-800 border border-slate-700 text-white font-black text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all cursor-pointer">
                      <option>Parcial 1</option>
                      <option>Parcial 2</option>
                      <option>Examen Final</option>
                      <option>Laboratorio / Proyecto</option>
                      <option>Actividades</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={saveGrades} disabled={savingGrades || approvedStudents.length === 0}
                  className="w-full md:w-auto px-10 py-4 bg-sky-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-sky-700 transition-all shadow-xl shadow-sky-900/50 disabled:opacity-50 active:scale-95 uppercase text-xs tracking-widest">
                  <Save size={20} /> {savingGrades ? 'Guardando...' : 'Publicar Notas'}
                </button>
              </div>

              {loadingStudents || loadingGrades ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-3xl animate-pulse" />)}
                </div>
              ) : approvedStudents.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-20 text-center font-bold text-slate-400 italic">No hay alumnos inscritos.</div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estudiante</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-36 text-center">Calificación</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:table-cell">Retroalimentación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {approvedStudents.map((s) => (
                        <tr key={s.userId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center font-black text-base shrink-0 border border-slate-200 overflow-hidden uppercase">
                                {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : getInitials(s.nombre)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-slate-900 truncate tracking-tight">{s.nombre}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="relative group">
                              <input type="number" min="0" max="10" step="0.1"
                                value={grades[s.userId] ?? ''}
                                onChange={(e) => setGrades({ ...grades, [s.userId]: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                placeholder="0.0"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-lg font-black text-sky-700 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white outline-none transition-all" />
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-sky-500 rounded-full opacity-0 group-focus-within:opacity-100 animate-ping" />
                            </div>
                          </td>
                          <td className="p-6 hidden md:table-cell">
                            <input type="text"
                              value={gradeComments[s.userId] ?? ''}
                              onChange={(e) => setGradeComments({ ...gradeComments, [s.userId]: e.target.value })}
                              placeholder="Escribe un comentario privado para el alumno..."
                              className="w-full px-4 py-3 bg-transparent border-none text-xs font-bold text-slate-500 focus:ring-2 focus:ring-sky-500/10 focus:rounded-xl focus:bg-sky-50/30 outline-none placeholder:text-slate-300 placeholder:italic transition-all" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Schedule Edit (Standard Form Style) ── */}
          {view === 'schedule' && editSchedule && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100"><Edit2 size={24} /></div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Configuración del Salón</h3>
                </div>
                <div className="space-y-8">
                  <div className="relative group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Horario Semanal</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                      <Clock size={20} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input type="text" value={editSchedule.horario}
                        onChange={(e) => setEditSchedule((prev) => prev ? { ...prev, horario: e.target.value } : prev)}
                        placeholder="Ej. Lun y Mié 07:00-09:00"
                        className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 outline-none" />
                    </div>
                  </div>
                  <div className="relative group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Aula o Laboratorio</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                      <MapPin size={20} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input type="text" value={editSchedule.aula}
                        onChange={(e) => setEditSchedule((prev) => prev ? { ...prev, aula: e.target.value } : prev)}
                        placeholder="Ej. Aula A-101 o Lab de Computo 2"
                        className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={saveSchedule}
                      className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 uppercase text-xs tracking-widest">
                      <Save size={18} className="inline mr-2" /> Guardar Cambios
                    </button>
                    <button type="button" onClick={() => { setView('subjects'); setEditSchedule(null); }}
                      className="px-8 py-4 text-slate-500 font-black hover:bg-slate-100 rounded-2xl transition-all uppercase text-xs tracking-widest">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
