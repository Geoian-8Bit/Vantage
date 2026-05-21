import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

// DATABASE_URL solo es obligatorio para push/migrate/studio; generate no lo necesita.
const databaseUrl = process.env.DATABASE_URL ?? ''

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
  schemaFilter: ['public'],
})
