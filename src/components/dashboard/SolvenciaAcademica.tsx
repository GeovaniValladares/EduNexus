import { useCallback, useEffect, useState } from 'react';
import { FileDown, FileText, Loader2, CheckCircle } from 'lucide-react';
import { estadoSolvenciaLabel, TITULO_CONSTANCIA, type SolvenciaEstado } from '../../lib/solvencia';

type SolvenciaTramite = {
  id: string;
  folio: string;
  estado: SolvenciaEstado;
  materiasCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function SolvenciaAcademica() {
  const [loading, setLoading] = useState(true);
  const [solicitando, setSolicitando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [tramite, setTramite] = useState<SolvenciaTramite | null>(null);
  const [puedeSolicitar, setPuedeSolicitar] = useState(false);
  const [requisitoMsg, setRequisitoMsg] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tramites/solvencia');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al cargar');
      setTramite(data.tramite ?? null);
      setPuedeSolicitar(data.elegibilidad?.ok ?? false);
      setRequisitoMsg(data.elegibilidad?.mensaje ?? '');
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSolicitar = async () => {
    setSolicitando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/tramites/solvencia', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo solicitar');
      setTramite(data.tramite);
      setMensaje({ tipo: 'ok', texto: data.message || 'Constancia emitida correctamente' });
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error de conexión',
      });
    } finally {
      setSolicitando(false);
      await cargar();
    }
  };

  const handleDescargar = async () => {
    setDescargando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/tramites/solvencia/pdf');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'No se pudo descargar el PDF');
      }
      const blob = await res.blob();
      const folio = tramite?.folio ?? 'constancia';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `constancia-inscripcion-solvencia-${folio}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMensaje({ tipo: 'ok', texto: 'PDF descargado (inscripción + solvencia en un solo documento)' });
    } catch (err: unknown) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al descargar',
      });
    } finally {
      setDescargando(false);
    }
  };

  const emitida = tramite?.estado === 'completado';

  return (
    <div id="solvencia" className="bg-white border border-yellow-300 rounded-lg p-4 scroll-mt-24">
      <div className="flex items-start gap-3 mb-3">
        <FileText className="text-yellow-700 shrink-0 mt-0.5" size={22} />
        <div>
          <h4 className="font-bold text-gray-900">{TITULO_CONSTANCIA}</h4>
          <p className="text-xs text-gray-600 mt-0.5">
            Un solo PDF con tu inscripción de materias y tu solvencia académica.
          </p>
        </div>
      </div>

      {mensaje && (
        <div
          className={`mb-3 px-3 py-2 rounded-lg text-xs ${
            mensaje.tipo === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Cargando...
        </p>
      ) : emitida ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle size={18} />
            <span>
              <strong>{estadoSolvenciaLabel(tramite.estado)}</strong> · Folio {tramite.folio}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Emitida el {tramite.updatedAt} · Incluye {tramite.materiasCount} materia(s) inscrita(s)
          </p>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {descargando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Generando PDF...
              </>
            ) : (
              <>
                <FileDown size={16} /> Descargar constancia (PDF)
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {!puedeSolicitar && requisitoMsg && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {requisitoMsg}
            </p>
          )}
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Carrera configurada en tu perfil</li>
            <li>Al menos una materia inscrita en Wiki</li>
            <li>El docente debe aprobar al menos una inscripción</li>
            <li>Solicitar la constancia unificada</li>
            <li>Descargar el PDF (Sección I: inscripción · Sección II: solvencia)</li>
          </ol>
          <button
            type="button"
            onClick={handleSolicitar}
            disabled={!puedeSolicitar || solicitando}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {solicitando ? 'Generando constancia...' : 'Solicitar constancia'}
          </button>
        </div>
      )}
    </div>
  );
}
