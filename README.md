# Vantage

Aplicación de finanzas personales. **En migración** de Electron (Windows) a aplicación web (Vercel + Supabase).

## Estado actual

- `main` contiene la última versión Electron estable.
- Rama `migration/web-rewrite` contiene el nuevo proyecto Next.js que sustituirá al actual.
- Hasta que termine la migración, la app Electron sigue funcionando desde `legacy/electron/`.

## Arquitectura objetivo

Next.js 15 App Router · TypeScript estricto · Tailwind 4 · Drizzle ORM · Postgres en Supabase · Supabase Auth · TanStack Query · Zod · Vitest + Playwright · Vercel + GitHub Actions.

Detalles en [`docs/architecture.md`](docs/architecture.md) y decisiones en [`docs/adr/`](docs/adr).

## Comandos principales

```bash
npm install
npm run dev              # Next.js (nueva web)
npm run dev:electron     # Electron legacy
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Documentación del producto

- [`PRODUCT.md`](PRODUCT.md) — visión y funcionalidades.
- [`DESIGN.md`](DESIGN.md) — sistema de diseño.

## Versiones empaquetadas Electron

Hasta el corte final, los instaladores `Vantage Setup x.x.x.exe` se generan desde la app legacy. Se conservarán todos los datos al actualizar.
