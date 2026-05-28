# Vantage

Aplicación web de **finanzas personales**: movimientos, apartados, deudas, recurrentes y análisis. Una sola cuenta dueña de sus datos, accesible desde el navegador e instalable como PWA en el móvil.

> **Demo público sin registro** → **<https://vantage-geoian-s-projects.vercel.app>**
>
> En la pantalla de login pulsa *"Probar demo sin registrarte"*. Es una cuenta anónima compartida que se resetea automáticamente cada 6 h, así que cualquiera puede trastear sin ensuciar datos reales.

---

## Qué es

Vantage nació como app de escritorio (Electron + SQLite local) y en **mayo de 2026** se migró a web con paridad funcional sobre **Next.js + Supabase**. El objetivo de la migración: dejar de repartir instaladores `.exe`, poder usarla desde el móvil y automatizar el despliegue. El histórico de la etapa Electron vive como referencia en [`docs/legacy/`](docs/legacy).

La interfaz es de una sola persona/hogar por cuenta. El backend ya contempla espacios compartidos (RLS multi-space en Postgres), pero esa funcionalidad está fuera de scope de la UI por ahora.

Más contexto de producto y principios en [`PRODUCT.md`](PRODUCT.md). Sistema de diseño y paletas en [`DESIGN.md`](DESIGN.md).

---

## Funcionalidades

### Captura y gestión de movimientos
- **Movimientos** en tres modos en el mismo formulario: gasto/ingreso **puntual**, **apartado** (afecta a una hucha de ahorro) o **recurrente** (se materializa solo cada día/semana/mes).
- **FAB global** y barra inferior con "Movs" en el centro para añadir un gasto en dos toques desde el móvil.
- **Alta por foto del ticket**: hace una foto, OCR client-side con **PaddleOCR PP-OCRv5** (modelo `latin`, soporta español) sobre **onnxruntime-web**, y rellena el formulario con importe, fecha y comercio. Viewfinder propio con `getUserMedia` para móvil; en escritorio cae al input nativo.
- **Bulk delete** y filtros (categoría, método de pago, rango de fechas, texto) compartidos entre `/transactions` y `/analytics`.

### Apartados, deudas y recurrentes
- **Apartados** (savings) con metas y porcentaje de progreso.
- **Deudas amortizables**: cuota recurrente automática y simulador de pago extra para ver impacto en plazo/intereses.
- **Recurrentes**: lista propia, generación automática diaria por **Vercel Cron** (`0 6 * * *`) que llama a `/api/cron/process-recurring`.

### Análisis
- **Dashboard** con resumen mensual, evolución y desglose por categoría.
- **Stats / Analytics** con gráficos **Recharts 3** y filterbar unificada con Transactions.
- **Calendario** con vista mensual y doble-click para añadir gasto rápido en un día.

### Import / Export / Backup
- **Import Excel** y **Import Access** (`mdb-reader`) — pensado para migrar desde GesHogar o desde hojas de cálculo.
- **Export PDF** vía `pdfkit`.
- **Restore desde `.db` SQLite** con `sql.js`, para subir el backup de la app Electron antigua.
- **Backup automático** de Postgres: GitHub Action semanal que ejecuta `pg_dump` y cifra el dump con **GPG AES256** antes de subirlo como artifact (retención 90 días). Instrucciones de restauración en la cabecera de [`.github/workflows/db-backup.yml`](.github/workflows/db-backup.yml).

### Autenticación
- **Email + contraseña** clásica (Supabase Auth). Confirmación de email **desactivada**: el alta entra directa al dashboard.
- **Botón "ver contraseña"** en login y signup.
- **Cambio de email / contraseña** desde Ajustes, con confirmación por email.
- **2FA TOTP** opcional (compatible con Authy, Google Authenticator, etc.).
- **Reset de contraseña** por email (templates traducidos al español con branding de Vantage).
- **Demo público** sin login: cuenta anónima compartida, acceso solo-lectura para acciones sensibles, reset cada 6 h vía GitHub Action.

### Interfaz
- **Responsive completo** móvil/escritorio. En móvil: bottom tabs, FAB en `/transactions`, **bottom-sheet de filtros con swipe-down**, todo el contenido dentro de cards.
- **PWA instalable**: manifest + service worker, funciona offline para navegación básica.
- **5 paletas seleccionables** (Corporativo / Soft Clay / Botánico / Tea House / Mediterráneo) con modo claro y oscuro, todo en CSS tokens, sin framer-motion ni shadcn.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript estricto · Tailwind CSS 4 |
| Estado servidor | TanStack Query 5 |
| Validación | Zod 4 (bordes: API y forms) |
| Gráficos | Recharts 3 |
| OCR | PaddleOCR PP-OCRv5 (`ppu-paddle-ocr`) sobre `onnxruntime-web` |
| Backend | Next.js API Routes + Server Actions |
| ORM / DB | Drizzle ORM + Postgres en Supabase (con RLS por usuario) |
| Auth | Supabase Auth (password + TOTP + anonymous para el demo) |
| Tests | Vitest (unit) + Playwright (E2E) |
| CI/CD | GitHub Actions → Vercel |
| Errores | Sentry |

Detalle técnico en [`docs/architecture.md`](docs/architecture.md) y decisiones de stack en [`docs/adr/0001-stack-decisions.md`](docs/adr/0001-stack-decisions.md).

---

## Estructura

```
src/
  app/                       Next.js App Router (rutas, páginas, API)
  features/<dominio>/
    domain/                  Entidades, tipos puros, Zod schemas
    application/             Casos de uso (services), DTOs
    infrastructure/          Repositorios Drizzle
    ui/                      Componentes y hooks del dominio
  components/                UI transversal
  lib/                       Clientes Supabase, auth, errores, logger
  db/                        Schema Drizzle y migraciones
tests/
  unit/                      Vitest
  e2e/                       Playwright
docs/
  adr/                       Architecture Decision Records
  legacy/                    Documentación pre-migración (referencia)
```

Flujo único, sin saltos de capa: **UI → hook → API route → service → repository → DB**.

---

## Desarrollo local

Requisitos: Node 20+, una `DATABASE_URL` de Supabase (Pooler en **modo Session**, puerto `5432`), las claves del proyecto Supabase.

```bash
npm install
cp .env.example .env.local            # rellena las claves
npm run db:migrate                    # aplica migraciones Drizzle
npm run dev                           # http://localhost:3000
```

### Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Next.js en local con Turbopack |
| `npm run build` | Build de producción |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier |
| `npm run test` | Vitest (unit) |
| `npm run test:watch` | Vitest en watch |
| `npm run test:coverage` | Vitest con coverage v8 |
| `npm run test:e2e` | Playwright (E2E) |
| `npm run test:e2e:ui` | Playwright con UI |
| `npm run db:generate` | Genera migración Drizzle a partir del schema |
| `npm run db:migrate` | Aplica migraciones |
| `npm run db:push` | Sincroniza schema sin migración (solo dev) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:verify` | Verifica integridad del schema con `scripts/verify-db.ts` |

---

## Despliegue y CI/CD

**No usamos la integración Git nativa de Vercel** (`vercel.json` la desactiva con `git.deploymentEnabled: false`). Quien orquesta es GitHub Actions:

1. Push a `main` → workflow `CI/CD` (`.github/workflows/ci.yml`).
2. Corren en paralelo: **lint+typecheck**, **unit** (Vitest), **build** (Next.js) y **E2E** (Playwright sobre rutas públicas).
3. Si todo pasa, el job `deploy` ejecuta `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`.

Tareas programadas:
- **Vercel Cron** (`vercel.json`) — diario a las 06:00 UTC: materializa recurrentes pendientes.
- **GitHub Action `reset-demo`** — cada 6 h: resetea la cuenta del demo.
- **GitHub Action `db-backup`** — semanal: `pg_dump` cifrado con GPG y subido como artifact.

Todos los endpoints `/api/cron/*` están protegidos por `Authorization: Bearer $CRON_SECRET`.

Guía completa de despliegue (env vars, secrets, troubleshooting) en [`docs/deploy-vercel.md`](docs/deploy-vercel.md).

---

## Tests

- **Unit (Vitest)** — lógica de servicios, repositorios contra Postgres, helpers de dominio. Coverage v8.
- **E2E (Playwright)** — smoke de login, demo público y navegación de páginas. Corre contra una build de Next.js levantada en el job, con env dummy de Supabase a nivel job para no envenenar el deploy.

Ambos suites corren en cada PR y en cada push a `main`. El deploy está gateado por CI verde.

---

## Documentación

- [`PRODUCT.md`](PRODUCT.md) — visión, usuarios, principios, tono y dirección estética.
- [`DESIGN.md`](DESIGN.md) — sistema de diseño y paletas.
- [`docs/architecture.md`](docs/architecture.md) — arquitectura por capas y convenciones.
- [`docs/adr/`](docs/adr) — Architecture Decision Records.
- [`docs/deploy-vercel.md`](docs/deploy-vercel.md) — despliegue paso a paso.
- [`docs/legacy/`](docs/legacy) — documentación pre-migración (Electron + SQLite local), conservada como referencia.

---

## Histórico

La versión Electron original (v0.4.0) ya no vive en este repo: se eliminó tras la migración para reducir ruido. El flujo de **restore desde `.db` SQLite** sigue funcionando para que cualquier usuario de aquella etapa pueda subir su backup a la versión web.
