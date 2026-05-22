# Arquitectura

## Stack

- **Next.js 15 App Router** — frontend y API.
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`).
- **Tailwind 4** + tokens propios.
- **Drizzle ORM** sobre **Postgres en Supabase**.
- **Supabase Auth** (JWT verificado server-side).
- **TanStack Query** para estado del servidor en cliente.
- **Zod** para validación de bordes (API + forms).
- **Vitest** (unit/integration) + **Playwright** (E2E).
- **Vercel** + **GitHub Actions**.
- **Sentry** para errores.

## Estructura

```
src/
  app/                       Next.js App Router (rutas, páginas, API)
  features/<dominio>/
    domain/                  Entidades, tipos, reglas puras, Zod schemas
    application/             Casos de uso (services), DTOs
    infrastructure/          Acceso a datos (repositorios Drizzle)
    ui/                      Componentes y hooks específicos
  components/                Componentes UI transversales
  lib/                       Clientes Supabase, auth, errores, logger
  db/                        Schema Drizzle y migraciones
tests/
  unit/                      Vitest
  e2e/                       Playwright
docs/
  adr/                       Architecture Decision Records
  legacy/                    Documentación pre-migración (referencia histórica)
```

`docs/legacy/` se conserva como contexto del producto pre-migración; el código Electron ya no vive en este repo.

## Reglas de capa

Flujo único: **UI → hook → API route → service → repository → DB**. Nada salta capas.

## Convenciones

- Imports absolutos con `@/*` desde `src/`.
- Componentes React: PascalCase. Hooks: `useXxx`. Tipos: PascalCase. Zod schemas: `<Nombre>Schema`. DTOs: `<Accion><Recurso>Dto`.
- Validación de entrada en los bordes (API y forms). Confianza dentro.

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Next.js en local |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (unit) |
| `npm run test:e2e` | Playwright (E2E) |
| `npm run format` | Prettier |
