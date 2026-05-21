/**
 * Verifica el estado de la DB tras aplicar migraciones y policies.
 * Uso: npm run db:verify
 */

import 'dotenv/config'
import postgres from 'postgres'

const EXPECTED_TABLES = [
  'audit_log',
  'categories',
  'debts',
  'recurring_templates',
  'savings_accounts',
  'space_invitations',
  'space_members',
  'spaces',
  'superadmins',
  'transactions',
]

const EXPECTED_HELPERS = ['is_space_member', 'is_space_owner', 'is_superadmin', 'is_demo_space']

interface TableRow {
  table_name: string
  rls_enabled: boolean
  row_count: number
  policy_count: number
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('✗ DATABASE_URL no está definido en .env.local')
  process.exit(1)
}

const sql = postgres(databaseUrl, { prepare: false, max: 1 })

async function main() {
  console.log('Conectando a Postgres...\n')

  const rows = await sql<TableRow[]>`
    SELECT
      t.table_name,
      c.relrowsecurity AS rls_enabled,
      (
        SELECT COUNT(*)::int
        FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = t.table_name
      ) AS policy_count,
      (
        SELECT n_live_tup::int
        FROM pg_stat_user_tables s
        WHERE s.relname = t.table_name
      ) AS row_count
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = 'public'::regnamespace
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'drizzle%'
    ORDER BY t.table_name;
  `

  const helpers = await sql<{ name: string }[]>`
    SELECT proname AS name
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = ANY(${EXPECTED_HELPERS})
    ORDER BY proname;
  `

  // ── Tablas ─────────────────────────────────────────────────────────────────
  console.log('Tablas en public:')
  console.log('─'.repeat(72))
  console.log(
    'name'.padEnd(28) +
      'rls'.padEnd(8) +
      'policies'.padEnd(12) +
      'rows'.padEnd(8) +
      'status'
  )
  console.log('─'.repeat(72))

  let ok = true
  for (const expected of EXPECTED_TABLES) {
    const row = rows.find((r) => r.table_name === expected)
    if (!row) {
      console.log(expected.padEnd(28) + '—'.padEnd(8) + '—'.padEnd(12) + '—'.padEnd(8) + '✗ falta')
      ok = false
      continue
    }
    const rlsOk = row.rls_enabled
    const policiesOk = row.policy_count > 0
    const status = rlsOk && policiesOk ? '✓' : '✗ ' + (!rlsOk ? 'no RLS ' : '') + (!policiesOk ? 'sin policies' : '')
    if (!rlsOk || !policiesOk) ok = false
    console.log(
      row.table_name.padEnd(28) +
        String(row.rls_enabled).padEnd(8) +
        String(row.policy_count).padEnd(12) +
        String(row.row_count).padEnd(8) +
        status
    )
  }

  // Tablas inesperadas
  const unexpected = rows.filter((r) => !EXPECTED_TABLES.includes(r.table_name))
  for (const row of unexpected) {
    console.log(
      row.table_name.padEnd(28) +
        String(row.rls_enabled).padEnd(8) +
        String(row.policy_count).padEnd(12) +
        String(row.row_count).padEnd(8) +
        '? inesperada'
    )
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  console.log()
  console.log('Helpers RLS en public:')
  console.log('─'.repeat(72))
  for (const expected of EXPECTED_HELPERS) {
    const found = helpers.some((h) => h.name === expected)
    console.log(expected.padEnd(28) + (found ? '✓' : '✗ falta'))
    if (!found) ok = false
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  console.log()
  if (ok && unexpected.length === 0) {
    console.log('✓ DB lista. Fase 2 verificada.')
    await sql.end()
    process.exit(0)
  } else {
    console.log('✗ Faltan elementos. Revisa los pasos del README.')
    await sql.end()
    process.exit(1)
  }
}

main().catch(async (err) => {
  console.error('✗ Error verificando DB:')
  console.error(err)
  await sql.end()
  process.exit(1)
})
