import { useState } from 'react';
import { Mail, GraduationCap, Edit2, Check, X, LayoutDashboard, BookOpen, Sparkles, Briefcase, ShieldCheck, Hash, User2, Camera } from 'lucide-react';
import { CARRERAS, CICLOS_POR_CARRERA } from '../../lib/carreras';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

interface ProfileSidebarProps {
  nombre: string;
  carrera: string;
  ciclo: string;
  email: string;
  roleLabel: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileSidebar({
  nombre,
  carrera,
  ciclo,
  email,
  roleLabel,
  avatarUrl: initialAvatarUrl = '',
  isAdmin = false,
}: ProfileSidebarProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [editando, setEditando] = useState(false);
  const [editNombre, setEditNombre] = useState(nombre);
  const [editCarrera, setEditCarrera] = useState(carrera);
  const [editCiclo, setEditCiclo] = useState(ciclo || 'I');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [currentNombre, setCurrentNombre] = useState(nombre);
  const [currentCarrera, setCurrentCarrera] = useState(carrera);
  const [currentCiclo, setCurrentCiclo] = useState(ciclo || 'I');

  const maxCiclos = CICLOS_POR_CARRERA[editCarrera] ?? 10;
  const validCiclos = ROMAN.slice(0, maxCiclos);

  const initials = getInitials(currentNombre);

  const handleSave = async () => {
    if (!editCarrera) {
      setMsg({ ok: false, text: 'Selecciona una carrera' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editNombre, carrera: editCarrera, ciclo: editCiclo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');
      setCurrentNombre(editNombre);
      setCurrentCarrera(editCarrera);
      setCurrentCiclo(editCiclo);
      setEditando(false);
      setMsg({ ok: true, text: 'Perfil actualizado' });
      setTimeout(() => window.location.reload(), 700);
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditNombre(currentNombre);
    setEditCarrera(currentCarrera);
    setEditCiclo(currentCiclo);
    setEditando(false);
    setMsg(null);
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

  const navLinks = [
    { href: '/dashboard', label: 'Panel', icon: <LayoutDashboard size={15} /> },
    { href: '/perfil', label: 'Mi Perfil / CV', icon: <User2 size={15} /> },
    { href: '/wiki', label: 'Wiki — Materias', icon: <BookOpen size={15} /> },
    { href: '/concierge', label: 'Lía — Asistente IA', icon: <Sparkles size={15} /> },
    { href: '/bridge', label: 'Bridge — Oportunidades', icon: <Briefcase size={15} /> },
  ];

  if (isAdmin) {
    navLinks.push({ href: '/admin', label: 'Administración', icon: <ShieldCheck size={15} /> });
  }

  return (
    <aside className="db-sidebar">
      {/* Avatar + edit button */}
      <div className="db-profile-avatar-wrap">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Foto de perfil" className="db-profile-avatar-img" />
        ) : (
          <div className="db-profile-avatar">{initials}</div>
        )}
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="db-profile-edit-btn"
            title="Editar perfil"
          >
            <Edit2 size={13} />
          </button>
        )}
        <a href="/perfil" className="db-profile-photo-btn" title="Cambiar foto">
          <Camera size={11} />
        </a>
      </div>

      {/* Name */}
      {editando ? (
        <input
          className="db-profile-name-input"
          value={editNombre}
          onChange={(e) => setEditNombre(e.target.value)}
          placeholder="Tu nombre"
        />
      ) : (
        <h2 className="db-profile-name">{currentNombre}</h2>
      )}
      <span className="db-profile-role">{roleLabel}</span>

      <div className="db-profile-divider" />

      {/* Info rows */}
      <div className="db-profile-info">
        <div className="db-profile-info-row">
          <GraduationCap size={14} className="db-profile-info-icon" />
          {editando ? (
            <select
              className="db-profile-select"
              value={editCarrera}
              onChange={(e) => setEditCarrera(e.target.value)}
            >
              <option value="">Seleccionar carrera</option>
              {CARRERAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs">{currentCarrera || 'Sin carrera asignada'}</span>
          )}
        </div>

        <div className="db-profile-info-row">
          <Hash size={14} className="db-profile-info-icon" />
          {editando ? (
            <select
              className="db-profile-select"
              value={editCiclo}
              onChange={(e) => setEditCiclo(e.target.value)}
            >
              {validCiclos.map((c) => (
                <option key={c} value={c}>
                  Ciclo {c}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs">Ciclo {currentCiclo}</span>
          )}
        </div>

        <div className="db-profile-info-row">
          <Mail size={14} className="db-profile-info-icon" />
          <span className="text-xs truncate">{email}</span>
        </div>
      </div>

      {/* Edit actions */}
      {editando && (
        <div className="db-profile-actions">
          {msg && (
            <p className={`db-profile-msg ${msg.ok ? 'db-profile-msg-ok' : 'db-profile-msg-err'}`}>
              {msg.text}
            </p>
          )}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="db-btn-primary flex-1"
            >
              <Check size={13} />
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={handleCancel} className="db-btn-ghost">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {!editando && !currentCarrera && (
        <div className="db-profile-warn">
          Agrega tu carrera para acceder a más funciones.
        </div>
      )}

      <div className="db-profile-divider" />

      {/* Navigation */}
      <nav className="db-sidebar-nav">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`db-sidebar-link ${currentPath === link.href ? 'db-sidebar-link-active' : ''}`}
          >
            <span className="db-sidebar-link-icon">{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
