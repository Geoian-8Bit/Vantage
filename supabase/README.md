# Setup Supabase — Fase 2

Pasos exactos para llevar Vantage a Supabase la primera vez. **Ejecutar todo contra `vantage-dev` primero**. La copia prod (`vantage`) se hace al final cuando todo va bien.

## 1. Crear cuenta y proyectos

1. Entra a https://supabase.com → **Start your project** → login con GitHub.
2. Pulsa **New project**. Repítelo dos veces, una por proyecto:

   | Campo | `vantage-dev` | `vantage` (prod) |
   | --- | --- | --- |
   | Name | `vantage-dev` | `vantage` |
   | Organization | la tuya personal | la tuya personal |
   | Database Password | (genera y guarda en tu gestor) | (otra distinta) |
   | Region | `Central EU (Frankfurt)` | `Central EU (Frankfurt)` |
   | Plan | Free | Free |

3. Espera ~2 min a que cada proyecto termine de provisionar.

## 2. Obtener credenciales del proyecto `vantage-dev`

En el dashboard del proyecto:

- **URL del proyecto**: `Project Settings → API → Project URL`
- **Anon key**: `Project Settings → API → Project API keys → anon public`
- **Service role key**: `Project Settings → API → Project API keys → service_role`
  - ⚠️ Esta clave da acceso total a la DB saltándose RLS. **No la pegues nunca en código del cliente.**
- **Connection string para Drizzle**: `Project Settings → Database → Connection string → URI`
  - Marca **Use connection pooling**.
  - Modo **Session** (puerto 5432) → para migraciones desde tu máquina.
  - Modo **Transaction** (puerto 6543) → para producción serverless.

## 3. Configurar `.env.local`

En la raíz del repo:

```bash
cp .env.example .env.local
```

Rellena con las credenciales del paso 2. **`.env.local` está en `.gitignore` y nunca se commitea.**

## 4. Aplicar la migración del esquema

Desde la raíz del repo, contra `vantage-dev`:

```bash
npm run db:migrate
```

Esto ejecuta el SQL de `src/db/migrations/0000_*.sql` y crea todas las tablas. Si todo va bien, el comando termina sin error.

> Si te aparece un error sobre `auth.users` ya existente o sobre permisos, revisa que el SQL de migración no contenga `CREATE TABLE "auth"."users"` (debe estar eliminado tras `db:generate`; ver `src/db/README.md`).

## 5. Aplicar las RLS policies

Las policies viven en `src/db/policies.sql` y NO las aplica `db:migrate`. Pega su contenido en el SQL Editor de Supabase y ejecuta:

1. Dashboard del proyecto → **SQL Editor** → **New query**.
2. Pega el contenido completo de `src/db/policies.sql`.
3. Pulsa **Run**.

Deberías ver "Success. No rows returned."

## 6. Verificar

Desde la raíz del repo:

```bash
npm run db:verify
```

El script se conecta, lista las tablas, comprueba que RLS está activada en cada una y muestra el recuento de filas. Espera 10 tablas y 0 filas todas.

## 7. (Opcional) Inspeccionar con Drizzle Studio

```bash
npm run db:studio
```

Abre `https://local.drizzle.studio` en el navegador para explorar la DB.

## 8. Cuando todo OK en `vantage-dev`

Repite los pasos **3 a 6** apuntando a `vantage` (prod) cambiando temporalmente `DATABASE_URL` en `.env.local` por la del proyecto de producción. Devuelve después el valor a `vantage-dev` para el día a día.

---

## Troubleshooting

**Migración falla con "permission denied for schema auth"**: olvidaste limpiar el `CREATE TABLE "auth"."users"` de la migración. Bórralo del SQL y vuelve a correr.

**Policies fallan con "function auth.uid() does not exist"**: Supabase no ha terminado de provisionar la extensión `pgsodium` o `pgjwt`. Espera 1 min y reintenta.

**`db:migrate` cuelga sin output**: probable problema de conectividad o `DATABASE_URL` incorrecta. Comprueba con `npm run db:verify` que la conexión funciona.

**Has aplicado las policies dos veces**: el script es idempotente (usa `DROP POLICY IF EXISTS`). No hay daño.
