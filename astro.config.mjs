// @ts-check
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';
import db from '@astrojs/db';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

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
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['astro:db'],
    },
  },

  adapter: netlify(),
});
