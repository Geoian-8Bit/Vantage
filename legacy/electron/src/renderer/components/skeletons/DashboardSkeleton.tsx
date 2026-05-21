import { Skeleton } from '../Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 pb-5 border-b border-border">
        <div className="space-y-2">
          <Skeleton width={140} height={14} />
          <Skeleton width={120} height={24} />
        </div>
      </div>

      {/* Balance card: 3 columnas iguales (Patrimonio · Balance · Ahorrado) */}
      <div className="rounded-xl bg-card border border-border shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {[0, 1, 2].map(i => (
            <div key={i} className={`space-y-2 ${i === 0 ? 'pb-3 sm:pb-0 sm:pr-5' : i === 1 ? 'py-3 sm:py-0 sm:px-5' : 'pt-3 sm:pt-0 sm:pl-5'}`}>
              <Skeleton width={90} height={11} />
              <Skeleton width={140} height={26} rounded="md" />
              <Skeleton width={110} height={11} />
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards row asimétrico (3+2) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-3 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <Skeleton width={120} height={12} />
            <Skeleton width={56} height={20} rounded="md" />
          </div>
          <Skeleton width={200} height={30} rounded="md" />
          <Skeleton width={170} height={11} />
        </div>
        <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-3 lg:col-span-2">
          <Skeleton width={140} height={12} />
          <Skeleton width={120} height={28} rounded="lg" />
          <Skeleton width={100} height={18} rounded="md" />
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-xl bg-card border border-border shadow-sm p-5">
        <Skeleton width={130} height={12} className="mb-4" />
        <div className="h-52 flex items-end gap-2">
          {[40, 65, 50, 80, 45, 70].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1.5 justify-end">
              <Skeleton height={`${h}%`} rounded="sm" style={{ width: '100%' }} />
              <Skeleton height={`${h * 0.7}%`} rounded="sm" style={{ width: '100%', opacity: 0.6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
