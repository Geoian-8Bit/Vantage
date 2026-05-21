import { Skeleton } from '@/components/ui/Skeleton'

export function StatsSkeleton() {
  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-5">
        <div className="space-y-2">
          <Skeleton width={120} height={14} />
          <Skeleton width={110} height={24} />
        </div>
        <Skeleton width={120} height={32} rounded="md" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 shadow-sm">
        <Skeleton width={300} height={32} rounded="md" />
        <div className="h-5 w-px bg-border" />
        <Skeleton width={180} height={28} rounded="md" />
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <Skeleton width={70} height={11} />
            <Skeleton width={140} height={26} rounded="md" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Skeleton width={220} height={14} className="mb-4" />
          <div className="flex h-60 items-end gap-2">
            {[60, 80, 50, 70, 90, 65].map((h, i) => (
              <div key={i} className="flex flex-1 items-end justify-end gap-1">
                <Skeleton height={`${h}%`} rounded="sm" style={{ width: '45%' }} />
                <Skeleton
                  height={`${h * 0.6}%`}
                  rounded="sm"
                  style={{ width: '45%', opacity: 0.6 }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Skeleton width={130} height={14} className="mb-4" />
          <div className="mb-3 flex justify-center">
            <Skeleton width={140} height={140} rounded="full" />
          </div>
          <div className="space-y-2">
            {[60, 75, 50, 80].map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton width={`${w}%`} height={11} />
                <Skeleton width={28} height={11} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
