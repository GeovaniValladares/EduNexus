import { useRef, useState } from 'react';
import {
  User, Phone, GraduationCap, Hash, ChevronRight, ChevronLeft,
  Check, Sparkles, Languages, Briefcase, BookOpen, ArrowRight, Camera, Trash2,
} from 'lucide-react';
import { CARRERAS, CICLOS_POR_CARRERA } from '../../lib/carreras';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const HABILIDADES_SUGERIDAS = [
  'Microsoft Office', 'Google Workspace', 'Comunicación oral', 'Trabajo en equipo',
  'Liderazgo', 'Resolución de problemas', 'Pensamiento crítico', 'Gestión del tiempo',
  'Programación', 'Diseño gráfico', 'Contabilidad', 'Análisis de datos',
];

const IDIOMAS_OPCIONES = ['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano'];

interface Props {
  initialNombre: string;
  initialCarrera: string;
  initialCiclo: string;
  initialAvatarUrl?: string;
  email: string;
  /** If true: show all sections at once (profile page). False: step wizard (first login). */
  editMode?: boolean;
}

type CVData = {
  telefono: string;
  habilidades: string[];
  idiomas: { idioma: string; nivel: string }[];
  experiencia: { empresa: string; cargo: string; periodo: string; descripcion: string }[];
  intereses: string;
};

const STEPS = [
  { label: 'Datos personales', icon: <User size={16} /> },
  { label: 'Información académica', icon: <GraduationCap size={16} /> },
  { label: 'Perfil profesional', icon: <Briefcase size={16} /> },
];

export default function ProfileSetup({ initialNombre, initialCarrera, initialCiclo, initialAvatarUrl = '', email, editMode = false }: Props) {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch('/api/users/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al subir foto');
      setAvatarUrl(data.avatarUrl);
    } catch (e: unknown) {
      setAvatarError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarLoading(true);
    await fetch('/api/users/avatar', { method: 'DELETE' });
    setAvatarUrl('');
    setAvatarLoading(false);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 – Personal
  const [nombre, setNombre] = useState(initialNombre);
  const [telefono, setTelefono] = useState('');

  // Step 2 – Academic
  const [carrera, setCarrera] = useState(initialCarrera);
  const [ciclo, setCiclo] = useState(initialCiclo || 'I');

  const maxCiclos = CICLOS_POR_CARRERA[carrera] ?? 10;
  const validCiclos = ROMAN.slice(0, maxCiclos);

  // Step 3 – CV
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [habilidadCustom, setHabilidadCustom] = useState('');
  const [idiomas, setIdiomas] = useState<{ idioma: string; nivel: string }[]>([
    { idioma: 'Español', nivel: 'Nativo' },
  ]);
  const [experiencias, setExperiencias] = useState<
    { empresa: string; cargo: string; periodo: string; descripcion: string }[]
  >([]);
  const [intereses, setIntereses] = useState('');

  const toggleHabilidad = (h: string) => {
    setHabilidades((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  };

  const addHabilidadCustom = () => {
    const t = habilidadCustom.trim();
    if (t && !habilidades.includes(t)) {
      setHabilidades((prev) => [...prev, t]);
      setHabilidadCustom('');
    }
  };

  const addIdioma = () =>
    setIdiomas((prev) => [...prev, { idioma: '', nivel: 'Básico' }]);

  const removeIdioma = (i: number) =>
    setIdiomas((prev) => prev.filter((_, idx) => idx !== i));

  const updateIdioma = (i: number, field: 'idioma' | 'nivel', val: string) =>
    setIdiomas((prev) => prev.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)));

  const addExp = () =>
    setExperiencias((prev) => [
      ...prev,
      { empresa: '', cargo: '', periodo: '', descripcion: '' },
    ]);

  const removeExp = (i: number) =>
    setExperiencias((prev) => prev.filter((_, idx) => idx !== i));

  const updateExp = (
    i: number,
    field: 'empresa' | 'cargo' | 'periodo' | 'descripcion',
    val: string
  ) =>
    setExperiencias((prev) =>
      prev.map((x, idx) => (idx === i ? { ...x, [field]: val } : x))
    );

  const validateStep = (): boolean => {
    setError('');
    if (step === 0) {
      if (nombre.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres'); return false; }
    }
    if (step === 1) {
      if (!carrera) { setError('Selecciona tu carrera'); return false; }
      if (!ciclo) { setError('Selecciona tu ciclo actual'); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => { setError(''); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setError('');

    const cvData: CVData = { telefono, habilidades, idiomas, experiencia: experiencias, intereses };

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, carrera, ciclo, telefono, perfilCompleto: true }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Error al guardar');
      }

      await fetch('/api/users/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvData: JSON.stringify(cvData) }),
      });

      if (editMode) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // ── Edit mode: all sections visible at once ──────────────────────────────
  if (editMode) {
    return (
      <div className="setup-shell">
        {saved && (
          <div className="setup-saved-banner">
            <Check size={15} /> Perfil actualizado correctamente
          </div>
        )}
        {error && <div className="setup-error">{error}</div>}

        <div className="setup-edit-grid">
          {/* Personal */}
          <div className="setup-edit-section">
            <div className="setup-section-title"><User size={16} className="text-blue-600" /><span>Datos personales</span></div>

            {/* Avatar */}
            <div className="setup-avatar-row">
              <div className="setup-avatar-wrap">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="setup-avatar-img" />
                ) : (
                  <div className="setup-avatar-placeholder">
                    {nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'}
                  </div>
                )}
                {avatarLoading && <div className="setup-avatar-loading" />}
              </div>
              <div className="flex flex-col gap-1">
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="setup-btn-sm flex items-center gap-1.5" disabled={avatarLoading}>
                  <Camera size={12} /> {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {avatarUrl && (
                  <button type="button" onClick={handleAvatarDelete} className="text-xs text-red-500 flex items-center gap-1" disabled={avatarLoading}>
                    <Trash2 size={10} /> Quitar
                  </button>
                )}
                {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
              </div>
            </div>

            <div className="setup-field">
              <label>Nombre completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="setup-input" />
            </div>
            <div className="setup-field">
              <label>Correo</label>
              <input type="email" value={email} disabled className="setup-input setup-input-disabled" />
            </div>
            <div className="setup-field">
              <label>Teléfono</label>
              <div className="setup-input-icon">
                <Phone size={14} className="setup-icon" />
                <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+503 7000-0000" className="setup-input pl-9" />
              </div>
            </div>
          </div>

          {/* Academic */}
          <div className="setup-edit-section">
            <div className="setup-section-title"><GraduationCap size={16} className="text-blue-600" /><span>Información académica</span></div>
            <div className="setup-field">
              <label>Carrera</label>
              <select value={carrera} onChange={(e) => { setCarrera(e.target.value); setCiclo('I'); }} className="setup-select">
                <option value="">Selecciona tu carrera</option>
                {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {carrera && (
              <div className="setup-field">
                <label>Ciclo actual</label>
                <div className="setup-ciclo-grid">
                  {validCiclos.map((c) => (
                    <button key={c} type="button" onClick={() => setCiclo(c)}
                      className={`setup-ciclo-btn ${ciclo === c ? 'setup-ciclo-btn-active' : ''}`}>
                      <Hash size={11} /> Ciclo {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="setup-edit-section">
            <div className="setup-section-title"><Briefcase size={16} className="text-blue-600" /><span>Habilidades</span></div>
            <div className="setup-chips-grid">
              {HABILIDADES_SUGERIDAS.map((h) => (
                <button key={h} type="button" onClick={() => toggleHabilidad(h)}
                  className={`setup-chip ${habilidades.includes(h) ? 'setup-chip-active' : ''}`}>
                  {habilidades.includes(h) && <Check size={10} />}
                  {h}
                </button>
              ))}
              {/* Render custom skills that are not in suggested list */}
              {habilidades.filter(h => !HABILIDADES_SUGERIDAS.includes(h)).map((h) => (
                <button key={h} type="button" onClick={() => toggleHabilidad(h)}
                  className="setup-chip setup-chip-active">
                  <Check size={10} />
                  {h}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input type="text" value={habilidadCustom} onChange={(e) => setHabilidadCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addHabilidadCustom();
                  }
                }}
                placeholder="Habilidad personalizada..." className="setup-input flex-1" />
              <button type="button" onClick={addHabilidadCustom} className="setup-btn-sm">+</button>
            </div>
          </div>

          {/* Languages */}
          <div className="setup-edit-section">
            <div className="setup-section-title"><Languages size={16} className="text-blue-600" /><span>Idiomas</span></div>
            {idiomas.map((lang, i) => (
              <div key={i} className="setup-row-pair mb-2">
                <select value={lang.idioma} onChange={(e) => updateIdioma(i, 'idioma', e.target.value)} className="setup-select flex-1">
                  {IDIOMAS_OPCIONES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={lang.nivel} onChange={(e) => updateIdioma(i, 'nivel', e.target.value)} className="setup-select w-28">
                  {['Nativo', 'Avanzado', 'Intermedio', 'Básico'].map((n) => <option key={n}>{n}</option>)}
                </select>
                {idiomas.length > 1 && <button type="button" onClick={() => removeIdioma(i)} className="setup-remove-btn">×</button>}
              </div>
            ))}
            <button type="button" onClick={addIdioma} className="setup-link-btn">+ Agregar idioma</button>
          </div>

          {/* Experience */}
          <div className="setup-edit-section setup-edit-section-wide">
            <div className="setup-section-title"><Briefcase size={16} className="text-blue-600" /><span>Experiencia laboral</span></div>
            {experiencias.map((exp, i) => (
              <div key={i} className="setup-exp-block">
                <div className="setup-row-pair">
                  <input type="text" value={exp.empresa} onChange={(e) => updateExp(i, 'empresa', e.target.value)} placeholder="Empresa" className="setup-input flex-1" />
                  <input type="text" value={exp.cargo} onChange={(e) => updateExp(i, 'cargo', e.target.value)} placeholder="Cargo" className="setup-input flex-1" />
                </div>
                <input type="text" value={exp.periodo} onChange={(e) => updateExp(i, 'periodo', e.target.value)} placeholder="Período" className="setup-input w-full" />
                <textarea value={exp.descripcion} onChange={(e) => updateExp(i, 'descripcion', e.target.value)} placeholder="Descripción..." rows={2} className="setup-input w-full resize-none" />
                <button type="button" onClick={() => removeExp(i)} className="text-xs text-red-500 hover:underline">Eliminar</button>
              </div>
            ))}
            <button type="button" onClick={addExp} className="setup-link-btn">+ Agregar experiencia</button>
          </div>

          {/* Interests */}
          <div className="setup-edit-section">
            <div className="setup-section-title"><Sparkles size={16} className="text-blue-600" /><span>Áreas de interés</span></div>
            <textarea value={intereses} onChange={(e) => setIntereses(e.target.value)} rows={3}
              placeholder="Ej. Desarrollo de software, emprendimiento..." className="setup-input w-full resize-none" />
          </div>
        </div>

        <div className="setup-edit-footer">
          <button type="button" onClick={handleSubmit} disabled={loading} className="setup-btn-finish">
            {loading ? 'Guardando…' : <><Check size={15} /> Guardar cambios</>}
          </button>
          <a href="/dashboard" className="setup-link-btn">← Volver al panel</a>
        </div>
      </div>
    );
  }

  // ── Wizard mode (first-time profile completion) ───────────────────────────
  return (
    <div className="setup-shell">
      {/* Progress steps */}
      <div className="setup-steps">
        {STEPS.map((s, i) => (
          <div key={i} className={`setup-step ${i === step ? 'setup-step-active' : ''} ${i < step ? 'setup-step-done' : ''}`}>
            <div className="setup-step-circle">
              {i < step ? <Check size={14} /> : s.icon}
            </div>
            <span className="setup-step-label">{s.label}</span>
            {i < STEPS.length - 1 && <div className="setup-step-line" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="setup-card">
        {error && <div className="setup-error">{error}</div>}

        {/* ── Step 0: Personal ── */}
        {step === 0 && (
          <div className="setup-fields">
            <div className="setup-section-title">
              <User size={18} className="text-blue-600" />
              <span>Datos personales</span>
            </div>
            <p className="setup-hint">Tu nombre aparecerá en tu perfil y en documentos académicos.</p>

            {/* Avatar upload */}
            <div className="setup-avatar-row">
              <div className="setup-avatar-wrap">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="setup-avatar-img" />
                ) : (
                  <div className="setup-avatar-placeholder">
                    {nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'}
                  </div>
                )}
                {avatarLoading && <div className="setup-avatar-loading" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="setup-btn-sm flex items-center gap-1.5" disabled={avatarLoading}>
                  <Camera size={13} /> {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {avatarUrl && (
                  <button type="button" onClick={handleAvatarDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1" disabled={avatarLoading}>
                    <Trash2 size={11} /> Quitar
                  </button>
                )}
                <p className="text-xs text-slate-400">JPG, PNG, WEBP · máx 2 MB</p>
                {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
              </div>
            </div>

            <div className="setup-field">
              <label>Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. María Fernanda López García"
                className="setup-input"
              />
            </div>

            <div className="setup-field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                disabled
                className="setup-input setup-input-disabled"
              />
              <p className="setup-hint-sm">El correo no se puede cambiar.</p>
            </div>

            <div className="setup-field">
              <label>Teléfono <span className="setup-optional">(opcional)</span></label>
              <div className="setup-input-icon">
                <Phone size={15} className="setup-icon" />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+503 7000-0000"
                  className="setup-input pl-9"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Academic ── */}
        {step === 1 && (
          <div className="setup-fields">
            <div className="setup-section-title">
              <GraduationCap size={18} className="text-blue-600" />
              <span>Información académica</span>
            </div>
            <p className="setup-hint">Esto determina qué materias están disponibles para ti en Wiki.</p>

            <div className="setup-field">
              <label>Carrera</label>
              <select
                value={carrera}
                onChange={(e) => { setCarrera(e.target.value); setCiclo('I'); }}
                className="setup-select"
              >
                <option value="">Selecciona tu carrera</option>
                {CARRERAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {carrera && (
              <div className="setup-field">
                <label>Ciclo actual</label>
                <p className="setup-hint-sm">Selecciona el ciclo en el que te encuentras actualmente.</p>
                <div className="setup-ciclo-grid">
                  {validCiclos.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCiclo(c)}
                      className={`setup-ciclo-btn ${ciclo === c ? 'setup-ciclo-btn-active' : ''}`}
                    >
                      <Hash size={12} />
                      Ciclo {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="setup-info-box">
              <BookOpen size={15} className="shrink-0 text-blue-500 mt-0.5" />
              <p className="text-xs text-slate-600">
                Solo verás materias de tu carrera hasta tu ciclo actual. Cuando avances de ciclo,
                actualiza este dato en tu perfil para desbloquear más materias.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: CV / Professional ── */}
        {step === 2 && (
          <div className="setup-fields">
            <div className="setup-section-title">
              <Sparkles size={18} className="text-blue-600" />
              <span>Perfil profesional</span>
            </div>
            <p className="setup-hint">
              Esta información se usará para generar tu CV y ayudarte a aplicar a pasantías en Bridge.
              Puedes completarla ahora o más tarde desde tu perfil.
            </p>

            {/* Skills */}
            <div className="setup-field">
              <label><Briefcase size={13} className="inline mr-1" />Habilidades</label>
              <div className="setup-chips-grid">
                {HABILIDADES_SUGERIDAS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHabilidad(h)}
                    className={`setup-chip ${habilidades.includes(h) ? 'setup-chip-active' : ''}`}
                  >
                    {habilidades.includes(h) && <Check size={11} />}
                    {h}
                  </button>
                ))}
                {/* Render custom skills that are not in suggested list */}
                {habilidades.filter(h => !HABILIDADES_SUGERIDAS.includes(h)).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHabilidad(h)}
                    className="setup-chip setup-chip-active"
                  >
                    <Check size={11} />
                    {h}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={habilidadCustom}
                  onChange={(e) => setHabilidadCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addHabilidadCustom();
                    }
                  }}
                  placeholder="Agregar habilidad personalizada..."
                  className="setup-input flex-1"
                />
                <button type="button" onClick={addHabilidadCustom} className="setup-btn-sm">
                  Agregar
                </button>
              </div>
            </div>

            {/* Languages */}
            <div className="setup-field">
              <div className="flex items-center justify-between mb-2">
                <label><Languages size={13} className="inline mr-1" />Idiomas</label>
                <button type="button" onClick={addIdioma} className="setup-link-btn">
                  + Agregar idioma
                </button>
              </div>
              {idiomas.map((lang, i) => (
                <div key={i} className="setup-row-pair">
                  <select
                    value={lang.idioma}
                    onChange={(e) => updateIdioma(i, 'idioma', e.target.value)}
                    className="setup-select flex-1"
                  >
                    <option value="">Idioma</option>
                    {IDIOMAS_OPCIONES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select
                    value={lang.nivel}
                    onChange={(e) => updateIdioma(i, 'nivel', e.target.value)}
                    className="setup-select w-28"
                  >
                    {['Nativo', 'Avanzado', 'Intermedio', 'Básico'].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {idiomas.length > 1 && (
                    <button type="button" onClick={() => removeIdioma(i)} className="setup-remove-btn">×</button>
                  )}
                </div>
              ))}
            </div>

            {/* Experience */}
            <div className="setup-field">
              <div className="flex items-center justify-between mb-2">
                <label><Briefcase size={13} className="inline mr-1" />Experiencia laboral <span className="setup-optional">(opcional)</span></label>
                <button type="button" onClick={addExp} className="setup-link-btn">
                  + Agregar
                </button>
              </div>
              {experiencias.map((exp, i) => (
                <div key={i} className="setup-exp-block">
                  <div className="setup-row-pair">
                    <input type="text" value={exp.empresa} onChange={(e) => updateExp(i, 'empresa', e.target.value)}
                      placeholder="Empresa / Organización" className="setup-input flex-1" />
                    <input type="text" value={exp.cargo} onChange={(e) => updateExp(i, 'cargo', e.target.value)}
                      placeholder="Cargo / Rol" className="setup-input flex-1" />
                  </div>
                  <input type="text" value={exp.periodo} onChange={(e) => updateExp(i, 'periodo', e.target.value)}
                    placeholder="Período (ej. Ene 2024 – Jun 2024)" className="setup-input w-full" />
                  <textarea value={exp.descripcion} onChange={(e) => updateExp(i, 'descripcion', e.target.value)}
                    placeholder="Descripción breve de tus responsabilidades..." rows={2}
                    className="setup-input w-full resize-none" />
                  <button type="button" onClick={() => removeExp(i)} className="text-xs text-red-500 hover:underline">
                    Eliminar experiencia
                  </button>
                </div>
              ))}
              {experiencias.length === 0 && (
                <p className="text-xs text-slate-400 italic">Puedes agregar experiencia laboral, voluntariados o prácticas.</p>
              )}
            </div>

            {/* Interests */}
            <div className="setup-field">
              <label>Áreas de interés profesional <span className="setup-optional">(opcional)</span></label>
              <textarea
                value={intereses}
                onChange={(e) => setIntereses(e.target.value)}
                rows={2}
                placeholder="Ej. Desarrollo de software, emprendimiento, medio ambiente..."
                className="setup-input w-full resize-none"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="setup-nav">
          {step > 0 && (
            <button type="button" onClick={back} className="setup-btn-back">
              <ChevronLeft size={16} /> Anterior
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="setup-btn-next">
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} className="setup-btn-finish">
              {loading ? 'Guardando…' : <>Completar perfil <ArrowRight size={16} /></>}
            </button>
          )}
        </div>

        {step === 2 && (
          <button
            type="button"
            onClick={() => { window.location.href = '/dashboard'; }}
            className="setup-skip-btn"
          >
            Completar después →
          </button>
        )}
      </div>
    </div>
  );
}
