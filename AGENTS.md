# wacrm — Harness

> Entry point for any agent working on wacrm. Read this first. Keep it under 200 lines.

## Project

| Campo | Valor |
|-------|-------|
| Stack | Next.js 16 (App Router) + Supabase (PostgreSQL, Auth, Realtime) |
| i18n | next-intl, default `es`, full translations in `messages/` |
| UI | shadcn/ui + Tailwind v4 + tw-animate-css |
| Forms | React 19, Server Actions, react-hook-form |
| Flow builder | @xyflow/react (React Flow) |
| Layout | shadcn Sidebar (dashboard layout) |
| Repo | `https://github.com/grupoprosperyn8n/wacrm.git` (rama `main`) |
| Prod | `https://wacrm.sistemasagenticos.cloud` |
| Context | `CODEX_CONTEXT_WACRM.md` en raíz — contexto completo del proyecto |
| Skills | `wacrm-development`, `wacrm-deploy-coolify`, `wacrm-anonkey-fix` |

## Pre-flight

Antes de tocar código, correr:

```bash
./init.sh
```

Si falla, reportar y no avanzar. El proyecto debe estar sano antes de modificarlo.

## SDD Workflow

Seguir este orden para cualquier feature o fix. Cada fase produce un artifact.

| # | Fase | Artifact | Output |
|---|------|----------|--------|
| 1 | **Explore** | `progress/<date>/explore.md` | Archivos relevantes, estado actual |
| 2 | **Propose** | `progress/<date>/propose.md` | Qué se va a hacer y por qué |
| 3 | **Spec** | `progress/<date>/spec.md` | Comportamiento esperado (entrada/salida) |
| 4 | **Design** | `progress/<date>/design.md` | Archivos a tocar, patrones, decisiones |
| 5 | **Task** | `progress/<date>/task.md` | Partición en unidades pequeñas |
| 6 | **Apply** | Código + `progress/<date>/changes.md` | Implementación + archivos modificados |
| 7 | **Verify** | `progress/<date>/verify.md` | Evidencia: typecheck ✅ lint ✅ test ✅ build ✅ curl ✅ |
| 8 | **Archive** | `progress/<date>/summary.md` | Resumen de lo hecho, blockers, decisiones |

No saltar fases. Si falta un artifact de fase anterior, no avanzar.

## Core Rules

- **i18n**: traducciones solo en `.tsx` con `useTranslations()`, nunca en `.ts`
- **Tailwind v4**: usar `@tailwindcss/postcss`, NO Tailwind v3 (`@tailwind` directives)
- **Componentes UI**: shadcn/ui con `cva()` + `tailwind-merge` + `clsx`
- **Base UI**: `@base-ui/react` para componentes headless primitivos
- **Supabase**: cliente seguro via `@supabase/ssr`, cookies HttpOnly
- **Middleware**: incluye i18n routing + protección de rutas
- **No secrets en código**: ANON_KEY, SERVICE_ROLE_KEY via env vars build-time

## Verify

Antes de decir "listo" o commitear:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Y para cambios en endpoints: `curl` al endpoint de producción y verificar status 200 (o 401 si es protegido sin auth).

## Review Workload

- Cambios >400 líneas -> proponer stacked PRs
- Si el diff es grande, partir en implementación + verify por separado
- Review: el código debe ser legible por humano, no solo funcional para la máquina

## Harness Scripts

| Script | Propósito |
|--------|-----------|
| `init.sh` | Pre-flight: typecheck + lint + test |
| `progress/` | Artifacts de sesión (estado, decisiones, evidencia) |
| `CLAUDE.md` | Redirección a este archivo |
| `CODEX_CONTEXT_WACRM.md` | Contexto completo del proyecto |
