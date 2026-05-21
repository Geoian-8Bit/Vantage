import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { spaces, spaceMembers } from '@/db/schema'

import { requireUser } from './session'

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
 * Lanza si no hay usuario autenticado o si el user no tiene ningún space
 * (situación anómala — el trigger debería haber creado el personal al signup).
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

  const space = rows[0]
  if (!space) {
    throw new Error(
      `Usuario ${user.id} sin space — el trigger handle_new_user debería haber creado el personal.`
    )
  }
  return space
}
