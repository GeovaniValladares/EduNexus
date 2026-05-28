interface NavItem {
  label: string;
  href: string;
}

interface Props {
  items: NavItem[];
  currentPath: string;
}

function isActive(href: string, path: string) {
  if (href === '/dashboard') return path === '/dashboard' || path === '/admin';
  if (href === '/docente')   return path === '/docente'   || path.startsWith('/docente/');
  return path === href || path.startsWith(`${href}/`);
}

export default function NavLinks({ items, currentPath }: Props) {
  return (
    <>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={`uls-nav-link hidden md:inline-flex ${isActive(item.href, currentPath) ? 'uls-nav-link-active' : ''}`}
        >
          {item.label}
        </a>
      ))}
    </>
  );
}

export function MobileNavLinks({ items, currentPath }: Props) {
  return (
    <>
      {items.map((item) => {
        const active = isActive(item.href, currentPath);
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center px-3 py-3 rounded-lg text-base font-medium transition ${
              active
                ? 'text-slate-900 bg-slate-100 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </>
  );
}
