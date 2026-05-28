import { Lucia } from 'lucia';
import { AstroDBAdapter } from 'lucia-adapter-astrodb';
import { db, Session, User } from 'astro:db';

const adapter = new AstroDBAdapter(db, Session, User);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: import.meta.env.PROD,
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      nombre: attributes.nombre,
      role: attributes.role,
      carrera: attributes.carrera ?? '',
    };
  },
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      nombre: string;
      role: string;
      carrera: string;
    };
  }
}
