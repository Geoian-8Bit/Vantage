# Despliegue (Vercel + GitHub Actions)

Cómo está montado el despliegue de Vantage y qué hay que configurar para reproducirlo. La app vive en `main` y se publica en Vercel sobre Supabase.

> Los valores reales (URLs, keys, connection string) **no van en este repo**: viven en `.env.local` (local) y en las env vars de Vercel / secrets de GitHub. Aquí solo hay placeholders.

## Flujo de despliegue

El despliegue **no usa la integración Git nativa de Vercel** — `vercel.json` la desactiva (`git.deploymentEnabled: false`). En su lugar lo orquesta GitHub Actions:

1. Push a `main` → workflow `CI/CD` (`.github/workflows/ci.yml`).
2. Corren en paralelo: lint + typecheck, unit (Vitest), build (Next.js) y E2E (Playwright sobre rutas públicas).
3. Si **todo** pasa, el job `deploy` ejecuta `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` con el `VERCEL_TOKEN`.

Las PRs corren el mismo CI sin desplegar. La rama de producción es `main`.

## Env vars de la app

Las mismas claves valen para `.env.local` (desarrollo) y para Vercel (Production / Preview / Development). Cómo obtener cada una está en [`.env.example`](../.env.example).

| Name | Ámbito | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Publishable key (`sb_publishable_...`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta** | Solo server-side. Nunca expuesta al cliente. |
| `DATABASE_URL` | **Secreta** | Connection string del Pooler. Ver nota abajo. |
| `CRON_SECRET` | **Secreta** | Bearer que protege los endpoints `/api/cron/*`. |

> **`DATABASE_URL` — modo según entorno.** En local usa el Pooler en **modo Session** (puerto `5432`), que va mejor para las migraciones de Drizzle. En Vercel (serverless) usa **modo Transaction** (puerto `6543`), que maneja mejor las conexiones efímeras de las funciones.
>
> En Supabase: **Project Settings → Database → Connection string**, marca *Use connection pooling*, elige el modo, copia la URI y sustituye `[YOUR-PASSWORD]`.

## Secrets y variables de GitHub Actions

En **Settings → Secrets and variables → Actions** del repo:

**Secrets**
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — para que el job `deploy` publique en Vercel.
- `CRON_SECRET` — mismo valor que en Vercel; lo usa el workflow `reset-demo`.
- `DATABASE_URL` (modo Session) y `BACKUP_PASSPHRASE` — los usa el workflow `db-backup` (pg_dump cifrado con GPG).

**Variables**
- `APP_URL` — URL pública desplegada, sin slash final (ej. `https://vantage.vercel.app`). Es variable (no secret) para que se vea en los logs.

## Configuración de auth en Supabase

Vantage usa **Supabase Auth por email + contraseña** (la confirmación de email está desactivada: el alta entra directa al dashboard). El callback `/auth/callback` se usa para el flujo de recuperación de contraseña.

En **Authentication → URL Configuration**:

1. **Site URL**: la URL de producción de Vercel, sin slash final. Se usa como base de los emails (p. ej. reset de contraseña).
2. **Redirect URLs**: añade `https://TU-APP.vercel.app/auth/callback` y mantén `http://localhost:3000/auth/callback` para desarrollo local.

> Si el **Site URL** apunta a localhost, los enlaces de los emails enviados desde producción abrirán localhost y fallarán.

## Tareas programadas (cron)

- **Recurrentes** — `vercel.json` define un Vercel Cron diario (`0 6 * * *`) que llama a `/api/cron/process-recurring`. El plan Hobby limita a 1 cron diario por proyecto.
- **Reset del demo** — workflow `reset-demo` (GitHub Actions) cada 6 h llama a `/api/cron/reset-demo`. Se hace en Actions, no en Vercel Cron, justo por el límite de 1 cron/día.
- **Backup de DB** — workflow `db-backup` (GitHub Actions) semanal: `pg_dump` cifrado con GPG y subido como artifact (retención 90 días). Las instrucciones de restauración están en la cabecera de `.github/workflows/db-backup.yml`.

Todos los endpoints `/api/cron/*` exigen el header `Authorization: Bearer $CRON_SECRET`.

## Troubleshooting

**Build falla con "Module not found: server-only"**: comprueba que `server-only` está en `dependencies` del `package.json`.

**Build falla con "DATABASE_URL no está definido"**: falta la env var en Vercel o hay un typo.

**El deploy no se dispara al pushear**: el deploy depende de que el CI esté verde (`needs: [quality, unit, build, e2e]`) y de que sea push a `main`. Revisa los jobs fallidos en Actions. Recuerda que la integración Git de Vercel está desactivada a propósito (`vercel.json`).

**Emails de recuperación abren localhost**: el **Site URL** de Supabase sigue en `http://localhost:3000`. Cámbialo a la URL de Vercel.

**Login falla con "missing_code" o similar tras un email**: la URL de producción no está en **Redirect URLs** de Supabase. Añádela.

**El proyecto Supabase se pausa**: el plan Free pausa tras 7 días de inactividad. Los crons (recurrentes/reset/backup) mantienen actividad regular y lo evitan.
