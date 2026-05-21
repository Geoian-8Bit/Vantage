import { Skeleton } from '../Skeleton'

export function StatsSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 pb-5 border-b border-border">
        <div className="space-y-2">
          <Skeleton width={120} height={14} />
          <Skeleton width={110} height={24} />
        </div>
        <Skeleton width={120} height={32} rounded="md" />
      </div>

      {/* Control bar */}
      <div className="rounded-xl bg-card border border-border shadow-sm px-5 py-3.5 flex items-center gap-3 flex-wrap">
        <Skeleton width={300} height={32} rounded="md" />
        <div className="w-px h-5 bg-border" />
        <Skeleton width={180} height={28} rounded="md" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-3">
            <Skeleton width={70} height={11} />
            <Skeleton width={140} height={26} rounded="md" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <Skeleton width={220} height={14} className="mb-4" />
          <div className="h-60 flex items-end gap-2">
            {[60, 80, 50, 70, 90, 65].map((h, i) => (
              <div key={i} className="flex-1 flex gap-1 justify-end items-end">
                <Skeleton height={`${h}%`} rounded="sm" style={{ width: '45%' }} />
                <Skeleton height={`${h * 0.6}%`} rounded="sm" style={{ width: '45%', opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <Skeleton width={130} height={14} className="mb-4" />
          <div className="flex justify-center mb-3">
            <Skeleton width={140} height={140} rounded="full" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton width={`${50 + Math.random() * 30}%`} height={11} />
                <Skeleton width={28} height={11} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
