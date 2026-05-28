import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';

export const prerender = false;

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ message: 'No se recibió ningún archivo' }), {
        status: 400,
      });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ message: 'Solo se aceptan imágenes JPEG, PNG, WEBP o GIF' }),
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ message: 'La imagen no debe superar 2 MB' }),
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    await db.update(User).set({ avatarUrl: dataUrl }).where(eq(User.id, user.id));

    return new Response(JSON.stringify({ success: true, avatarUrl: dataUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    return new Response(JSON.stringify({ message: 'Error al procesar la imagen' }), {
      status: 500,
    });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  await db.update(User).set({ avatarUrl: null }).where(eq(User.id, user.id));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
