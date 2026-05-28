import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { getSessionUser } from '../../../../lib/session';
import { generarCvPdf } from '../../../../lib/cv-pdf';
import { parseCvDataJson, defaultCvForm } from '../../../../lib/cv-form';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response('No autenticado', { status: 401 });
  }

  // Load latest saved cv data from the database
  const dbUser = await db.select().from(User).where(eq(User.id, user.id)).get();
  const saved  = parseCvDataJson(dbUser?.cvData ?? null);

  const base = defaultCvForm({
    nombre:   user.nombre,
    email:    user.email,
    carrera:  user.carrera ?? '',
    cum:      0,
    materias: [],
  });
  const form = saved ? { ...base, ...saved } : base;

  if (!form.nombreCompleto?.trim()) {
    return new Response(
      JSON.stringify({ message: 'Completa tu CV antes de descargarlo.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const pdfBytes = await generarCvPdf(form);
  const safeName = form.nombreCompleto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const filename = `cv-${safeName || 'estudiante'}.pdf`;

  const url = new URL(request.url);
  const download = url.searchParams.get('download') === '1';
  const disposition = download
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store',
    },
  });
};
