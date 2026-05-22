# Despliegue en Vercel — Fase 4

Pasos exactos para llevar Vantage de local a una URL pública en Vercel. Asume que has terminado Fase 3 (auth con magic link funciona en local).

## 1. Pre-requisitos

- La rama `migration/web-rewrite` está pusheada a `origin` (GitHub).
- Tienes cuenta GitHub con el repo Vantage.
- La rama compila localmente: `npm run build`.

## 2. Crear cuenta Vercel

1. Entra a https://vercel.com → **Sign Up** → **Continue with GitHub**.
2. Autoriza Vercel a leer tus repos.
3. Cuando te pida elegir scope, elige tu cuenta personal (no equipo).

## 3. Importar el repo

1. Dashboard Vercel → **Add New...** → **Project**.
2. Verás la lista de repos GitHub. Busca **Vantage** → **Import**.
3. **Configure Project**:
   - **Framework Preset**: Next.js (detectado automáticamente).
   - **Root Directory**: `./` (raíz, no cambiar).
   - **Build Command**: dejar por defecto (`next build`).
   - **Output Directory**: dejar por defecto (`.next`).
   - **Install Command**: dejar por defecto (`npm install`).
4. **NO pulses Deploy todavía.** Antes hay que añadir las env vars.

## 4. Configurar Production Branch

Por defecto Vercel toma `main` como rama de producción. Como nuestro código vive en `migration/web-rewrite` (y `main` aún tiene Electron), hay que cambiarlo:

1. Sigue en la pantalla de **Configure Project**.
2. Despliega la sección **Git Repository** o **Branches**.
3. **Production Branch**: cambia de `main` a `migration/web-rewrite`.

Si esta opción no aparece aquí: termina el primer deploy (paso 6), luego ve a **Project Settings → Git → Production Branch** y cámbialo ahí. El siguiente push activará el nuevo branch.

## 5. Environment Variables

Despliega la sección **Environment Variables** y añade las 4 siguientes. Cada una a los tres entornos: **Production**, **Preview** y **Development**.

| Name | Value | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://syhtdsbhltfonuydfbme.supabase.co` | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_VlCQn-cByHG6MDrpshWeMw_oRbFFLXL` | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | (la `sb_secret_...` que ya tienes) | **Secreta** |
| `DATABASE_URL` | (Pooler **Transaction** modo, puerto **6543**) | **Secreta**, ver más abajo |

> ⚠️ La `DATABASE_URL` que usamos en local apunta a puerto **5432** (modo Session). Para producción serverless **conviene usar puerto 6543** (modo Transaction), que maneja mejor las conexiones de funciones serverless.

Para coger la del pooler en modo Transaction:

1. Supabase → **Project Settings** → **Database** → **Connection string**.
2. Marca **Use connection pooling**.
3. Modo: **Transaction** (puerto **6543**).
4. URI: copia, sustituye `[YOUR-PASSWORD]` por la contraseña real.
5. Quedará:
   ```
   postgresql://postgres.syhtdsbhltfonuydfbme:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres
   ```

## 6. Deploy

1. Pulsa **Deploy**.
2. Vercel hará: clone → install → build → deploy. Tarda ~2 minutos la primera vez.
3. Cuando termine te da una URL tipo `https://vantage-xxx.vercel.app`. Cópiala.

## 7. Configurar URLs en Supabase

Antes de probar el login en producción, hay que añadir la URL de Vercel a la whitelist de Supabase. Si no, los magic links te rebotarán.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: cámbialo a la URL de Vercel (sin barra final).
3. **Redirect URLs**: añade `https://vantage-xxx.vercel.app/auth/callback` (y mantén `http://localhost:3000/auth/callback` para seguir trabajando en local).
4. Guarda.

> El **Site URL** se usa para los emails de magic link. Si lo dejas en localhost, los enlaces enviados desde producción intentarán abrir localhost en el navegador de tu familiar — y fallarán.

## 8. Probar

1. Abre la URL de Vercel en una pestaña nueva (idealmente en incógnito).
2. Pulsa **Iniciar sesión**.
3. Mete tu email → te llega un magic link.
4. Pulsa el enlace → debería caer en `https://vantage-xxx.vercel.app/dashboard`.

## 9. Avísame

Cuando lo tengas funcionando, dime:
- La URL pública de Vercel (`https://...`).
- La nueva `DATABASE_URL` con el pooler en modo Transaction (la mando al `.env.local` actualizado).
- Si has tenido algún error en build o deploy.

---

## Troubleshooting

**Build falla con "Module not found: server-only"**: añadido en Fase 3, está en deps. Si pasa, mira el log y comprueba que `server-only` está en `dependencies` del `package.json`.

**Build falla con "Error: DATABASE_URL no está definido"**: te falta la env var en Vercel o el typeo es incorrecto.

**Magic link redirige a localhost en vez de Vercel**: el `Site URL` de Supabase sigue en `http://localhost:3000`. Cámbialo a la URL de Vercel.

**Login en Vercel falla con "missing_code" o similar**: la URL de Vercel no está en **Redirect URLs** de Supabase. Añádela.

**Tarda mucho en arrancar tras inactividad**: el plan Free de Vercel no duerme funciones, pero Supabase Free sí pausa proyectos tras 7 días sin actividad. Esto se resuelve en Fase 11 con un cron keep-alive.
