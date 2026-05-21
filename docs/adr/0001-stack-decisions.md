# ADR-0001: Stack de migración a aplicación web

- **Estado:** Aceptada
- **Fecha:** 2026-05-21

## Contexto

Vantage era una app de escritorio Windows en Electron + sql.js. Se migra a una aplicación web con paridad funcional para:

- Eliminar el reparto manual de instaladores `.exe`.
- Permitir acceso desde móvil.
- Automatizar despliegues para todos los usuarios.
- Servir como pieza de portfolio con estructura típica de empresa moderna.

## Decisión

- **Framework:** Next.js 15 App Router. Monorepo único, no servicios separados.
- **ORM:** Drizzle. **DB:** Postgres en Supabase.
- **Auth:** Supabase Auth (JWT verificado server-side).
- **Validación:** Zod.
- **Estado servidor en cliente:** TanStack Query.
- **Forms:** react-hook-form + Zod.
- **Tests:** Vitest + Playwright.
- **Despliegue:** Vercel + GitHub Actions.
- **Observabilidad:** Sentry.
- **Estructura:** Clean Architecture lite, organizada por features.

## Alternativas consideradas

- **Vite + Supabase directo sin backend propio.** Más rápido y menos código. Descartada porque el objetivo explícito es montar arquitectura típica de empresa, con backend por capas.
- **Backend separado (NestJS) + frontend Next.js.** Justificable en empresas grandes. Descartada por sobredimensionada para ~10 usuarios y porque añade CORS, despliegues duplicados y latencia sin beneficio real a esta escala.
- **Prisma ORM.** Más maduro y mejor DX inicial. Descartado por peor rendimiento en cold-starts de funciones serverless (relevante en Vercel Hobby).
- **Auth.js v5.** Más "puro empresa Node". Descartado por simplicidad operativa (todo en Supabase) y para no gestionar plantillas de email aparte.
- **Firebase.** Vendor lock-in mayor y DB no relacional. Descartado por Postgres estándar.
- **Railway / Render.** PaaS que cobra desde umbral bajo. Vercel Hobby gratis cubre esta escala mejor.

## Consecuencias

**Positivas**

- Arquitectura empresarial moderna con separación por capas, OpenAPI documentado y CI/CD estándar.
- Repo legible para empleadores y mantenible a medio plazo.
- Backend propio que abre la puerta a funcionalidades server-side futuras (OCR, jobs programados).

**Negativas**

- Reescritura del envoltorio frontend (Vite → Next.js). El contenido React se conserva 1:1.
- Backend completo a construir; hoy no existe.
- Vendor lock-in moderado en Supabase. Mitigado: Postgres es estándar, los datos son exportables.
- Plan Free de Supabase pausa el proyecto tras 7 días de inactividad. Mitigado con cron de keep-alive en Vercel.
