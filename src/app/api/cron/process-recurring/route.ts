import { type NextRequest } from 'next/server'

import { db } from '@/db/client'
import { spaces } from '@/db/schema'
import { recurringService } from '@/features/recurring/application/recurring.service'

export const runtime = 'nodejs'
// Las DBs grandes con muchos spaces pueden tardar. 60s es el máximo del plan
// hobby de Vercel; si nos quedamos cortos lo subiremos a un plan superior.
export const maxDuration = 60

/**
 * Vercel Cron diario. Materializa todas las recurrentes vencidas de todos los
 * spaces sin esperar a que un usuario abra la app.
 *
 * Auth: Vercel inyecta `Authorization: Bearer ${CRON_SECRET}` solo cuando el
 * cron lo dispara su scheduler. Si alguien hace GET a esta ruta desde fuera
 * sin el secreto, devolvemos 401.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Si no hay secret configurado, no permitimos ejecución desde fuera.
    return new Response('CRON_SECRET no configurado', { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const allSpaces = await db
    .select({ id: spaces.id, createdBy: spaces.createdBy })
    .from(spaces)

  const stats = {
    spacesProcessed: 0,
    spacesSkipped: 0,
    transactionsCreated: 0,
    errors: [] as { spaceId: string; error: string }[],
  }

  for (const space of allSpaces) {
    // Sin un createdBy no podemos atribuir la transacción a nadie. Saltamos
    // ese space — el usuario lo materializará al abrir Movimientos.
    if (!space.createdBy) {
      stats.spacesSkipped++
      continue
    }
    try {
      const result = await recurringService.processDue(space.id, space.createdBy)
      stats.transactionsCreated += result.count
      stats.spacesProcessed++
    } catch (err) {
      stats.errors.push({
        spaceId: space.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return Response.json({ data: stats })
}
