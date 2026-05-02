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

      {/* Balance card */}
      <div className="rounded-xl bg-card border border-border shadow-sm p-6 space-y-3">
        <Skeleton width={100} height={12} />
        <Skeleton width={220} height={32} rounded="md" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-3">
          <Skeleton width={120} height={12} />
          <Skeleton width={160} height={26} rounded="md" />
          <Skeleton width={170} height={11} />
        </div>
        <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-3">
          <Skeleton width={140} height={12} />
          <Skeleton width={180} height={26} rounded="md" />
          <Skeleton width={150} height={11} />
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
