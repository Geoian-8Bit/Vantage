import { getActiveSpace } from '@/lib/auth/space'
import { requireUser } from '@/lib/auth/session'
import { jsonOk, jsonError } from '@/lib/api/response'
import { recurringService } from '@/features/recurring/application/recurring.service'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const user = await requireUser()
    const space = await getActiveSpace()
    const result = await recurringService.processDue(space.id, user.id)
    return jsonOk(result)
  } catch (err) {
    return jsonError(err)
  }
}
