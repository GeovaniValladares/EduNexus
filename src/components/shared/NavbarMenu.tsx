import { useState, useEffect, useRef } from 'react';
import { LogOut, Bell, ChevronDown, User } from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
}

interface NotificationItem {
  id: string;
  text: string;
  href: string;
  unread: boolean;
}

interface NavbarMenuProps {
  items: MenuItem[];
  currentPath: string;
  userName?: string;
  userRole?: string;
  userRoleCode?: string;
  notifications?: NotificationItem[];
}

export default function NavbarMenu({ items, currentPath, userName, userRole, userRoleCode, notifications = [] }: NavbarMenuProps) {
  const panelHref =
    userRoleCode === 'docente'    ? '/docente'  :
    userRoleCode === 'empresa'    ? '/empresa'  :
    (userRoleCode === 'admin' || userRoleCode === 'superadmin') ? '/admin' :
    '/dashboard';
  const panelLabel =
    userRoleCode === 'docente'    ? 'Panel Docente'  :
    userRoleCode === 'empresa'    ? 'Panel Empresa'  :
    (userRoleCode === 'admin' || userRoleCode === 'superadmin') ? 'Panel Admin' :
    'Panel principal';
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  return (
    <>
      {/* ── Right-side action cluster ── */}
      <div className="flex items-center gap-1">

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="nav-icon-btn"
            title="Notificaciones"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="nav-notif-badge">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="nav-dropdown nav-notif-panel">
              <div className="nav-dropdown-header">
                <span className="font-semibold text-slate-800">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="nav-notif-count">{unreadCount} nuevas</span>
                )}
              </div>
              <div className="nav-dropdown-body">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-400">
                    <p className="text-xs">No tienes notificaciones</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <a key={n.id} href={n.href} className={`nav-notif-item ${n.unread ? 'nav-notif-item-unread' : ''}`}>
                      <span className={`nav-notif-dot ${n.unread ? 'nav-notif-dot-active' : ''}`} />
                      <span className="text-xs text-slate-700 flex-1 leading-relaxed">{n.text}</span>
                    </a>
                  ))
                )}
              </div>
              <div className="nav-dropdown-footer">
                <a href="/dashboard" className="text-xs text-blue-600 font-medium hover:underline">
                  Ver todas las notificaciones
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="nav-profile-btn"
          >
            <div className="nav-profile-avatar">{initials}</div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold text-slate-800 max-w-28 truncate">
                {userName ?? 'Usuario'}
              </span>
              <span className="text-xs text-slate-500">{userRole ?? ''}</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="nav-dropdown nav-profile-panel">
              <div className="nav-dropdown-header">
                <div className="nav-profile-avatar nav-profile-avatar-lg">{initials}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{userName ?? 'Usuario'}</p>
                  <p className="text-xs text-slate-500">{userRole ?? ''}</p>
                </div>
              </div>
              <div className="nav-dropdown-body">
                {userRoleCode !== 'docente' && userRoleCode !== 'empresa' && (
                  <a href="/perfil" className="nav-menu-item">
                    <User size={14} />
                    <span>Mi perfil</span>
                  </a>
                )}
                <a href={panelHref} className="nav-menu-item">
                  <span className="w-3.5 h-3.5 rounded bg-blue-100 inline-block" />
                  <span>{panelLabel}</span>
                </a>
              </div>
              <div className="nav-dropdown-footer">
                <button type="button" onClick={handleLogout} className="nav-logout-btn w-full">
                  <LogOut size={14} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
