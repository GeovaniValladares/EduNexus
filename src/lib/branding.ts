/** Textos de navegación y marca en español */
export const ASSETS = {
  logoEdunexusLightBg: '/images/logos/logo-edunexus-light-bg.png',
  logoEdunexusDarkBg: '/images/logos/logo-edunexus-dark-bg.png',
  logoUlsLightBg: '/images/logos/logo-uls-light-bg.png',
  logoUlsDarkBg: '/images/logos/logo-uls-dark-bg.png',
  heroImage: '/images/hero/hero-02.jpg',
  studentImage: '/images/hero/foto-estudiante.jpg',
} as const;

export const CONTACT = {
  email: 'info@uls.edu.sv',
  phone: '+503 2133-4000',
} as const;

export const BRAND = {
  siteName: 'Edunexus',
  siteTagline: 'Plataforma integral ULS',
  university: 'Universidad Luterana Salvadoreña',
  wiki: {
    nav: 'Wiki',
    title: 'Wiki',
    subtitle: 'Materias, horarios e inscripciones',
  },
  assistant: {
    name: 'Lía',
    nav: 'Lía',
    title: 'Lía — Orientación con IA',
    subtitle: 'Tu asistente virtual para orientación académica y profesional',
  },
  bridge: {
    nav: 'Bridge',
    title: 'Bridge',
    subtitle: 'Oportunidades laborales y pasantías',
  },
  panel: {
    nav: 'Panel',
    title: 'Panel',
    subtitle: 'Resumen de tu actividad académica',
  },
} as const;

export function mensajeBienvenida(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || nombre;
  return `Bienvenid@, ${primerNombre}`;
}
