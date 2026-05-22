import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { spaces, spaceMembers } from '@/db/schema'

import { requireUser, isAnonymous } from './session'

export interface ActiveSpace {
  id: string
  type: 'personal' | 'household' | 'demo'
  name: string
  role: 'owner' | 'member'
}

/**
 * Devuelve el space activo del usuario autenticado.
 * Hoy: el personal del user (siempre existe por el trigger handle_new_user).
 * Futuro Fase 5+: leer cookie `vantage_active_space` y validar pertenencia.
 *
 * Lanza si no hay usuario autenticado. Si el user es anonymous y por algún
 * motivo no tiene space (trigger viejo, race condition), lo añade al demo
 * en tiempo de request como red de seguridad.
 */
export async function getActiveSpace(): Promise<ActiveSpace> {
  const user = await requireUser()

  const rows = await db
    .select({
      id: spaces.id,
      type: spaces.type,
      name: spaces.name,
      role: spaceMembers.role,
    })
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .where(eq(spaceMembers.userId, user.id))
    .orderBy(spaceMembers.joinedAt)
    .limit(1)

  let space = rows[0]

  if (!space && isAnonymous(user)) {
    // Red de seguridad: anonymous user sin space → unir al demo.
    space = await joinDemoSpaceFallback(user.id)
  }

  if (!space) {
    throw new Error(
      `Usuario ${user.id} sin space — el trigger handle_new_user debería haber creado el personal.`
    )
  }
  return space
}

/**
 * Inserta al anonymous user en el space demo. Usado solo si el trigger
 * handle_new_user no lo hizo (caso anómalo). Idempotente: si ya es miembro
 * por una race, no falla. Si no existe space demo, devuelve undefined y el
 * caller decide.
 */
async function joinDemoSpaceFallback(userId: string): Promise<ActiveSpace | undefined> {
  const demoRows = await db
    .select({ id: spaces.id, type: spaces.type, name: spaces.name })
    .from(spaces)
    .where(eq(spaces.type, 'demo'))
    .limit(1)
  const demo = demoRows[0]
  if (!demo) return undefined

  try {
    await db
      .insert(spaceMembers)
      .values({ spaceId: demo.id, userId, role: 'member' })
      .onConflictDoNothing({ target: [spaceMembers.spaceId, spaceMembers.userId] })
  } catch {
    // Si la restrictive policy bloqueara (no debería desde server con
    // service-role-equivalent connection), seguimos para devolver el space.
  }

  return { id: demo.id, type: 'demo', name: demo.name, role: 'member' }
}
