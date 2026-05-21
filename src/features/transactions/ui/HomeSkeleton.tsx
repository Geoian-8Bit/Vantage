import { Skeleton } from '@/components/ui/Skeleton'

export function HomeSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-y-3 border-b border-border pb-5">
        <div className="space-y-2">
          <Skeleton width={140} height={14} rounded="sm" />
          <Skeleton width={180} height={24} rounded="sm" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton width={130} height={32} rounded="lg" />
          <Skeleton width={110} height={32} rounded="lg" />
          <Skeleton width={84} height={36} rounded="lg" />
          <Skeleton width={88} height={36} rounded="lg" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
            style={{ height: 92 }}
          >
            <Skeleton width={100} height={16} rounded="sm" />
            <div className="mt-3">
              <Skeleton width="60%" height={28} rounded="sm" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton width="100%" height={48} rounded="xl" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_140px_110px_140px_88px] items-center gap-3 border-b border-border/40 px-5 py-3.5 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <Skeleton width={36} height={36} rounded="lg" />
              <div className="space-y-1.5">
                <Skeleton width={140} height={14} rounded="sm" />
                <Skeleton width={90} height={10} rounded="sm" />
              </div>
            </div>
            <Skeleton width={88} height={22} rounded="full" />
            <Skeleton width={70} height={14} rounded="sm" />
            <Skeleton width={80} height={18} rounded="sm" />
            <div className="flex justify-end gap-1.5">
              <Skeleton width={32} height={32} rounded="md" />
              <Skeleton width={32} height={32} rounded="md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
