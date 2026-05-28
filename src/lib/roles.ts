import { BRAND } from './branding';

export const ROLES = {
  ALUMNO: 'alumno',
  STUDENT: 'student',
  DOCENTE: 'docente',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  EMPRESA: 'empresa',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: UserRole[] = [ROLES.ADMIN, ROLES.SUPERADMIN];
export const DOCENTE_ROLES: UserRole[] = [ROLES.DOCENTE, ROLES.ADMIN, ROLES.SUPERADMIN];
export const EMPRESA_ROLES: UserRole[] = [ROLES.EMPRESA, ROLES.ADMIN, ROLES.SUPERADMIN];

// Student-only nav (teachers/admins have their own dedicated panels)
export const STUDENT_ROLES: UserRole[] = [
  ROLES.ALUMNO,
  ROLES.STUDENT,
  ROLES.ADMIN,
  ROLES.SUPERADMIN,
];

// Routes only teachers should see (not mixed with student links)
export const DOCENTE_ONLY_ROLES: UserRole[] = [ROLES.DOCENTE];

export const NAV_ITEMS = [
  { label: BRAND.wiki.nav,       href: '/wiki',       roles: STUDENT_ROLES },
  { label: BRAND.assistant.nav,  href: '/concierge',  roles: STUDENT_ROLES },
  { label: BRAND.bridge.nav,     href: '/bridge',     roles: STUDENT_ROLES },
  { label: BRAND.panel.nav,      href: '/dashboard',  roles: STUDENT_ROLES },
  { label: 'Panel Docente',      href: '/docente',    roles: DOCENTE_ONLY_ROLES },
  { label: 'Empresa',            href: '/empresa',    roles: EMPRESA_ROLES },
  { label: 'Admin',              href: '/admin',      roles: ADMIN_ROLES },
] as const;

export function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole);
}

export function isDocente(role: string): boolean {
  return DOCENTE_ROLES.includes(role as UserRole);
}

export function isEmpresa(role: string): boolean {
  return EMPRESA_ROLES.includes(role as UserRole);
}

export function canAccessNavItem(role: string, itemRoles: readonly string[]): boolean {
  return itemRoles.includes(role);
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    [ROLES.ALUMNO]: 'Estudiante',
    [ROLES.STUDENT]: 'Estudiante',
    [ROLES.DOCENTE]: 'Docente',
    [ROLES.ADMIN]: 'Administrador',
    [ROLES.SUPERADMIN]: 'Super Administrador',
    [ROLES.EMPRESA]: 'Empresa',
  };
  return labels[role] ?? role;
}
