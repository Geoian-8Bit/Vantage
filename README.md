# Vantage

Aplicación web de finanzas personales: movimientos, ahorros, deudas, recurrentes y análisis. Desplegada en Vercel sobre Supabase.

## Arquitectura

Next.js 15 App Router · TypeScript estricto · Tailwind 4 · Drizzle ORM · Postgres en Supabase · Supabase Auth · TanStack Query · Zod · Vitest + Playwright · Vercel + GitHub Actions.

Detalles en [`docs/architecture.md`](docs/architecture.md), decisiones en [`docs/adr/`](docs/adr) y despliegue en [`docs/deploy-vercel.md`](docs/deploy-vercel.md).

## Comandos principales

```bash
npm install
npm run dev          # Next.js en local
npm run lint
npm run typecheck
npm run test         # Vitest (unit)
npm run test:e2e     # Playwright (E2E)
npm run build
```

## Documentación del producto

- [`PRODUCT.md`](PRODUCT.md) — visión y funcionalidades.
- [`DESIGN.md`](DESIGN.md) — sistema de diseño.

## Histórico

La versión Electron original ya no existe en este repo. La doc de aquella etapa vive en [`docs/legacy/`](docs/legacy) como referencia histórica.
