import { useMemo, useState } from 'react';
import { FileText, Sparkles, Save, ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react';
import type { CvFormData } from '../../lib/cv-form';
import { formToMarkdown, canSaveCv, isCvFormComplete } from '../../lib/cv-form';
import type { ConciergeSubject } from './ConciergeChat';

interface CvFormProps {
  initialForm: CvFormData;
  aiConfigured: boolean;
  aiLabel: string;
  materias: ConciergeSubject[];
}

type SectionId = 'personal' | 'perfil' | 'academico' | 'experiencia' | 'preview';

export default function CvForm({ initialForm, aiConfigured, aiLabel, materias }: CvFormProps) {
  const [form, setForm] = useState<CvFormData>(initialForm);
  const [openSection, setOpenSection] = useState<SectionId>('personal');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'warn'; texto: string } | null>(null);
  const [pdfKey, setPdfKey] = useState(0);

  const preview = useMemo(() => formToMarkdown(form), [form]);

  const update = (field: keyof CvFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const aplicarRespuestaCv = (data: {
    cvData: CvFormData;
    mode?: string;
    warning?: string;
  }) => {
    setForm(data.cvData);
    if (data.warning) {
      setMensaje({ tipo: 'warn', texto: data.warning });
    } else {
      const cloudModes = ['openai', 'groq', 'gemini', 'openrouter'];
      const isCloud = cloudModes.includes(data.mode ?? '');
      setMensaje({
        tipo: 'ok',
        texto: isCloud
          ? `CV mejorado con IA. Revisa el contenido y pulsa Guardar CV.`
          : 'CV generado con plantilla inteligente. Completa los campos faltantes y pulsa Guardar CV.',
      });
    }
    setOpenSection('personal');
  };

  const crearConIA = async () => {
    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/users/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enhance', form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo generar');
      aplicarRespuestaCv(data);
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al generar CV',
      });
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (!canSaveCv(form)) {
      setMensaje({
        tipo: 'error',
        texto: 'Indica tu nombre completo y correo electrónico.',
      });
      return;
    }
    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/users/cv', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvData: form, cvText: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo guardar');
      const incompleto = !isCvFormComplete(form);
      setPdfKey((k) => k + 1);
      setMensaje({
        tipo: incompleto ? 'warn' : 'ok',
        texto: incompleto
          ? 'CV guardado. Tip: completa perfil y formación para fortalecerlo. En Bridge usa «Adjuntar mi CV».'
          : `CV guardado (${new Date().toLocaleString('es-SV')}). En Bridge marca «Adjuntar mi CV».`,
      });
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al guardar',
      });
    } finally {
      setLoading(false);
    }
  };

  const guardarYVerPdf = async () => {
    await guardar();
    setOpenSection('preview');
    setPdfKey((k) => k + 1);
  };

  const toggle = (id: SectionId) => {
    setOpenSection((s) => (s === id ? 'personal' : id));
  };

  const SectionHeader = ({
    id,
    title,
  }: {
    id: SectionId;
    title: string;
  }) => (
    <button
      type="button"
      onClick={() => toggle(id)}
      className="w-full flex items-center justify-between py-3 text-left font-semibold text-gray-900 border-b border-gray-100"
    >
      {title}
      {openSection === id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div id="mi-cv" className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" />
            Crear mi curriculum
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Completa el formulario y usa IA para redactar un CV profesional según tu carrera.
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            aiConfigured
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {aiConfigured ? aiLabel : 'IA no configurada'}
        </span>
      </div>

      {mensaje && (
        <div
          className={`mb-4 text-sm p-3 rounded-lg ${
            mensaje.tipo === 'ok'
              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              : mensaje.tipo === 'warn'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        {/* 1. Datos personales */}
        <div className="border border-gray-200 rounded-lg px-4">
          <SectionHeader id="personal" title="1. Datos personales" />
          {openSection === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cv-nombre">
                  Nombre completo
                </label>
                <input
                  id="cv-nombre"
                  className={inputClass}
                  value={form.nombreCompleto}
                  onChange={(e) => update('nombreCompleto', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-email">
                  Correo electrónico
                </label>
                <input
                  id="cv-email"
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-telefono">
                  Teléfono
                </label>
                <input
                  id="cv-telefono"
                  className={inputClass}
                  value={form.telefono}
                  onChange={(e) => update('telefono', e.target.value)}
                  placeholder="0000-0000"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-ciudad">
                  Ciudad / país
                </label>
                <input
                  id="cv-ciudad"
                  className={inputClass}
                  value={form.ciudad}
                  onChange={(e) => update('ciudad', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-linkedin">
                  LinkedIn o portafolio (opcional)
                </label>
                <input
                  id="cv-linkedin"
                  className={inputClass}
                  value={form.linkedin}
                  onChange={(e) => update('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cv-carrera">
                  Carrera
                </label>
                <input
                  id="cv-carrera"
                  className={`${inputClass} bg-gray-50`}
                  value={form.carrera}
                  readOnly
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Perfil profesional */}
        <div className="border border-gray-200 rounded-lg px-4">
          <SectionHeader id="perfil" title="2. Perfil profesional" />
          {openSection === 'perfil' && (
            <div className="pb-4">
              <label className={labelClass} htmlFor="cv-perfil">
                Resumen (3–5 líneas sobre ti y tus objetivos)
              </label>
              <textarea
                id="cv-perfil"
                rows={5}
                className={inputClass}
                value={form.perfil}
                onChange={(e) => update('perfil', e.target.value)}
                placeholder="Describe tu perfil, fortalezas y qué buscas en una pasantía..."
              />
            </div>
          )}
        </div>

        {/* 3. Formación y habilidades */}
        <div className="border border-gray-200 rounded-lg px-4">
          <SectionHeader id="academico" title="3. Formación y habilidades" />
          {openSection === 'academico' && (
            <div className="space-y-4 pb-4">
              <div>
                <label className={labelClass} htmlFor="cv-formacion">
                  Formación académica
                </label>
                <textarea
                  id="cv-formacion"
                  rows={3}
                  className={inputClass}
                  value={form.formacion}
                  onChange={(e) => update('formacion', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-materias">
                  Materias inscritas (desde Wiki)
                </label>
                <textarea
                  id="cv-materias"
                  rows={4}
                  className={`${inputClass} bg-gray-50`}
                  value={form.materias}
                  onChange={(e) => update('materias', e.target.value)}
                />
                {materias.length === 0 && (
                  <p className="text-xs text-indigo-600 mt-1">
                    <a href="/wiki" className="hover:underline">
                      Inscríbete en Wiki
                    </a>{' '}
                    para completar esta sección automáticamente.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-habilidades">
                  Habilidades (separadas por · o en líneas)
                </label>
                <textarea
                  id="cv-habilidades"
                  rows={3}
                  className={inputClass}
                  value={form.habilidades}
                  onChange={(e) => update('habilidades', e.target.value)}
                  placeholder="Excel · Comunicación · Python..."
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-idiomas">
                  Idiomas
                </label>
                <textarea
                  id="cv-idiomas"
                  rows={2}
                  className={inputClass}
                  value={form.idiomas}
                  onChange={(e) => update('idiomas', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Experiencia y proyectos */}
        <div className="border border-gray-200 rounded-lg px-4">
          <SectionHeader id="experiencia" title="4. Experiencia y proyectos" />
          {openSection === 'experiencia' && (
            <div className="space-y-4 pb-4">
              <div>
                <label className={labelClass} htmlFor="cv-experiencia">
                  Experiencia (pasantías, voluntariado, trabajo)
                </label>
                <textarea
                  id="cv-experiencia"
                  rows={4}
                  className={inputClass}
                  value={form.experiencia}
                  onChange={(e) => update('experiencia', e.target.value)}
                  placeholder="Si no tienes experiencia laboral, describe actividades académicas relevantes."
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cv-proyectos">
                  Proyectos académicos o personales
                </label>
                <textarea
                  id="cv-proyectos"
                  rows={4}
                  className={inputClass}
                  value={form.proyectos}
                  onChange={(e) => update('proyectos', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* 5. Vista previa PDF */}
        <div className="border border-gray-200 rounded-lg px-4">
          <SectionHeader id="preview" title="5. Vista previa del CV" />
          {openSection === 'preview' && (
            <div className="pb-4 space-y-3">
              <p className="text-xs text-slate-500">
                Muestra el último CV guardado. Guarda los cambios para actualizar la vista.
              </p>
              <iframe
                key={pdfKey}
                src="/api/users/cv/pdf"
                className="w-full rounded border border-gray-200 bg-gray-50"
                style={{ height: '680px' }}
                title="Vista previa del CV en PDF"
              />
              <button
                type="button"
                onClick={guardarYVerPdf}
                disabled={loading}
                className="flex items-center gap-2 border border-indigo-300 text-indigo-700 text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
              >
                <RefreshCw size={14} />
                Guardar y actualizar vista
              </button>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={crearConIA}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
          >
            <Sparkles size={16} />
            {loading ? 'Generando...' : 'Crear CV con IA'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
          >
            <Save size={16} />
            Guardar CV
          </button>
          <a
            href="/api/users/cv/pdf?download=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white text-sm px-4 py-2 rounded-lg ml-auto"
            title="Descarga tu CV en formato PDF estilo Harvard (ATS compatible)"
          >
            <Download size={16} />
            Descargar PDF
          </a>
        </div>
      </form>
    </div>
  );
}
