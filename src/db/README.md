# Base de datos

Esquema de Postgres gestionado por **Drizzle ORM** y aplicado a **Supabase**.

## Archivos

```
src/db/
├── schema.ts           Schema canónico (tipos TS + DDL)
├── client.ts           Cliente Drizzle (server-only, lee DATABASE_URL)
├── migrations/         SQL generado por drizzle-kit
│   └── 0000_*.sql
└── policies.sql        RLS policies (aplicar manualmente tras migraciones)
```

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run db:generate` | Genera nueva migración SQL comparando schema.ts vs el último estado |
| `npm run db:migrate` | Aplica migraciones pendientes al DATABASE_URL configurado |
| `npm run db:push` | (solo desarrollo) Sincroniza schema sin migración intermedia |
| `npm run db:studio` | UI web para inspeccionar la DB en localhost:4983 |

## Tras cada `db:generate`

Drizzle-kit incluye en el SQL un `CREATE TABLE "auth"."users"` porque referenciamos esa tabla con FKs (la gestiona Supabase Auth, ya existe). **Hay que eliminar ese CREATE TABLE manualmente de la nueva migración** antes de aplicarla, dejando solo las FKs. El comentario `-- auth.users es gestionada por Supabase Auth` marca el sitio.

## Tras aplicar una migración

Ejecutar también `src/db/policies.sql` en el SQL Editor de Supabase. Las policies no las maneja drizzle-kit; viven aparte porque dependen de funciones específicas de Supabase Auth (`auth.uid()`).

## Conexión

`DATABASE_URL` apunta al **pooler** de Supabase, no al host directo:

- **Local / migraciones**: modo Session (puerto 5432).
- **Producción serverless (Vercel)**: modo Transaction (puerto 6543).

La diferencia: Transaction reusa conexiones por transacción (mejor para serverless), Session las mantiene abiertas por el cliente (necesario para `LISTEN`, prepared statements persistentes, etc).
