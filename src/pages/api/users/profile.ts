import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { isCarreraValida, CICLOS_POR_CARRERA } from '../../../lib/carreras';
import { getSessionUser } from '../../../lib/session';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, carrera, ciclo, telefono, perfilCompleto } = body;

    const updates: {
      nombre?: string; carrera?: string; ciclo?: string;
      telefono?: string; perfilCompleto?: boolean;
    } = {};

    if (nombre !== undefined) {
      const n = String(nombre).trim();
      if (n.length < 2) {
        return new Response(
          JSON.stringify({ message: 'El nombre debe tener al menos 2 caracteres' }),
          { status: 400 }
        );
      }
      updates.nombre = n;
    }

    if (carrera !== undefined) {
      const c = String(carrera).trim();
      if (c && !isCarreraValida(c)) {
        return new Response(JSON.stringify({ message: 'Carrera no válida' }), { status: 400 });
      }
      updates.carrera = c;
      // If the career changed, reset the ciclo to I
      if (c && c !== user.carrera) {
        updates.ciclo = 'I';
      }
    }

    if (ciclo !== undefined) {
      const cicloStr = String(ciclo).trim().toUpperCase();
      const targetCarrera = updates.carrera ?? user.carrera ?? '';
      const maxCiclos = CICLOS_POR_CARRERA[targetCarrera] ?? 10;
      const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      const validCiclos = ROMAN.slice(0, maxCiclos);
      if (cicloStr && !validCiclos.includes(cicloStr)) {
        return new Response(JSON.stringify({ message: 'Ciclo no válido para esta carrera' }), {
          status: 400,
        });
      }
      updates.ciclo = cicloStr;
    }

    if (telefono !== undefined) {
      updates.telefono = String(telefono).trim();
    }

    if (perfilCompleto === true) {
      updates.perfilCompleto = true;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ message: 'Nada que actualizar' }), { status: 400 });
    }

    await db.update(User).set(updates).where(eq(User.id, user.id));

    const updated = await db.select().from(User).where(eq(User.id, user.id)).get();

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          nombre: updated?.nombre ?? user.nombre,
          carrera: updated?.carrera ?? '',
          ciclo: updated?.ciclo ?? 'I',
          telefono: updated?.telefono ?? '',
          perfilCompleto: updated?.perfilCompleto ?? false,
          email: user.email,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return new Response(JSON.stringify({ message: 'Error al guardar perfil' }), { status: 500 });
  }
};
