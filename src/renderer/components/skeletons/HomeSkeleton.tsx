import { Skeleton } from '../Skeleton'

export function HomeSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      {/* Page header con actions */}
      <div className="flex items-start justify-between gap-3 pb-5 border-b border-border">
        <div className="space-y-2">
          <Skeleton width={120} height={14} />
          <Skeleton width={100} height={24} />
        </div>
        <div className="flex gap-2">
          <Skeleton width={120} height={32} rounded="md" />
          <Skeleton width={90} height={32} rounded="md" />
          <Skeleton width={80} height={36} rounded="md" />
          <Skeleton width={88} height={36} rounded="md" />
        </div>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-3">
            <Skeleton width={80} height={12} />
            <Skeleton width={130} height={26} rounded="md" />
          </div>
        ))}
      </div>

      {/* Control bar */}
      <div className="rounded-xl bg-card border border-border shadow-sm px-5 py-3 flex items-center gap-3 flex-wrap">
        <Skeleton width={130} height={20} />
        <div className="w-px h-5 bg-border" />
        <Skeleton width={280} height={32} rounded="md" />
        <div className="flex-1" />
        <Skeleton width={180} height={32} rounded="md" />
        <Skeleton width={140} height={32} rounded="md" />
        <Skeleton width={150} height={32} rounded="md" />
      </div>

      {/* Transaction list */}
      <div className="rounded-xl bg-card border border-border shadow-sm divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton width={36} height={36} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton width={`${50 + Math.random() * 30}%`} height={14} />
              <Skeleton width={`${20 + Math.random() * 20}%`} height={11} />
            </div>
            <Skeleton width={88} height={18} rounded="md" />
          </div>
        ))}
      </div>
    </div>
  )
}
