import { logout } from '../actions'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
