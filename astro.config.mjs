// @ts-check
import { defineConfig, envField } from 'astro/config';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
import db from '@astrojs/db';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

/**
 * When ASTRO_DB_REMOTE_URL is set (e.g. Netlify build with Turso) we intercept
 * the `astro:db` virtual module BEFORE @astrojs/db can serve it and replace it
 * with our own drop-in that connects directly to Turso via @libsql/client.
 *
 * @astrojs/db v0.13 only supports remote connections through Astro Studio
 * (which is shut down). This plugin bypasses that entirely.
 */
const tursoDbPlugin = process.env.ASTRO_DB_REMOTE_URL
  ? /** @type {import('vite').Plugin} */ ({
      name: 'turso-db-direct',
      enforce: 'pre',
      resolveId(id) {
        if (id === 'astro:db') {
          return fileURLToPath(new URL('./src/lib/db-compat.ts', import.meta.url));
        }
      },
    })
  : null;

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react(), db()],

  env: {
    schema: {
      // ── AI provider ──────────────────────────────────────────────────────
      AI_PROVIDER: envField.string({ context: 'server', access: 'secret', optional: true }),

      // OpenRouter (recommended — supports 400+ models)
      OPENROUTER_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      OPENROUTER_MODEL:   envField.string({ context: 'server', access: 'secret', optional: true }),

      // Groq (free alternative)
      GROQ_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      GROQ_MODEL:   envField.string({ context: 'server', access: 'secret', optional: true }),

      // Google Gemini (free alternative)
      GOOGLE_GEMINI_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      GEMINI_API_KEY:        envField.string({ context: 'server', access: 'secret', optional: true }),
      GEMINI_MODEL:          envField.string({ context: 'server', access: 'secret', optional: true }),

      // OpenAI (paid)
      OPENAI_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      OPENAI_MODEL:   envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    plugins: [tailwindcss(), ...(tursoDbPlugin ? [tursoDbPlugin] : [])],
    optimizeDeps: {
      exclude: ['astro:db'],
    },
  },

  adapter: netlify(),
});
