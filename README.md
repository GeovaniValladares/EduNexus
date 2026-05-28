# Edunexus — Plataforma ULS

Plataforma web para estudiantes de la Universidad Luterana Salvadoreña: gestión académica, orientación con IA, oportunidades laborales y panel personal.

## Módulos

- **Wiki** — materias, horarios e inscripciones
- **Lía** — asistente con IA, plan personalizado y CV
- **Bridge** — pasantías, proyectos y postulaciones
- **Panel** — resumen académico, trámites y perfil

## Requisitos

- Node.js >= 22.12.0
- npm

## Inicio rápido

```bash
npm install
cp .env.example .env.local
npm run dev
```

Opcional: añade `GROQ_API_KEY` en `.env.local` para activar la IA en Lía.

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:seed` | Datos de ejemplo |
| `npm run ai:test` | Probar conexión IA |

## Stack

Astro 6, React, Tailwind CSS 4, Astro DB, Lucia Auth, Lucide Icons.

## Licencia

Proyecto académico — ULS.
# EduNexus
