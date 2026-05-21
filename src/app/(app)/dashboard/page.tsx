import { PageHeader } from '@/components/layout/PageHeader'

export default function DashboardPage() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader section="Inicio" page="Dashboard" />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-subtext">
          Bienvenido a Vantage. Aquí se mostrarán balance, gastos del mes, tendencia y top
          categorías cuando migremos esta pantalla pixel-perfect en una iteración próxima.
        </p>
      </div>
    </div>
  )
}
