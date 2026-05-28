/// <reference path="../.astro/types.d.ts" />

type SessionUser = import('./lib/session').SessionUser;

declare namespace App {
  interface Locals {
    user: SessionUser | null;
  }
}

interface ImportMetaEnv {
  readonly AI_PROVIDER?: string;
  readonly GROQ_API_KEY?: string;
  readonly GROQ_MODEL?: string;
  readonly GOOGLE_GEMINI_API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
  readonly GEMINI_MODEL?: string;
  readonly OPENAI_API_KEY?: string;
  readonly OPENAI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
