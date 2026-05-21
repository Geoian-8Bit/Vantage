import { Skeleton } from '@/components/ui/Skeleton'

export function CalendarSkeleton() {
  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-5">
        <div className="space-y-2">
          <Skeleton width={140} height={14} />
          <Skeleton width={160} height={24} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
        <Skeleton width={28} height={28} rounded="md" />
        <div className="space-y-2 text-center">
          <Skeleton width={130} height={18} />
          <Skeleton width={210} height={11} />
        </div>
        <Skeleton width={28} height={28} rounded="md" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex justify-center px-2 py-2">
              <Skeleton width={28} height={11} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[70px] border-r border-b border-border/40 p-1.5 lg:min-h-[85px] lg:p-2"
            >
              <Skeleton width={20} height={14} className="mb-2" />
              {i % 3 === 1 && (
                <div className="space-y-1">
                  <Skeleton width="60%" height={8} />
                  {i % 7 === 2 && <Skeleton width="50%" height={8} />}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
