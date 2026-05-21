import { Skeleton } from '../Skeleton'

export function CalendarSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 pb-5 border-b border-border">
        <div className="space-y-2">
          <Skeleton width={140} height={14} />
          <Skeleton width={160} height={24} />
        </div>
      </div>

      {/* Navigation bar */}
      <div className="rounded-xl bg-card border border-border shadow-sm px-5 py-3 flex items-center justify-between">
        <Skeleton width={28} height={28} rounded="md" />
        <div className="text-center space-y-2">
          <Skeleton width={130} height={18} />
          <Skeleton width={210} height={11} />
        </div>
        <Skeleton width={28} height={28} rounded="md" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-2 py-2 flex justify-center">
              <Skeleton width={28} height={11} />
            </div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[70px] lg:min-h-[85px] p-1.5 lg:p-2 border-b border-r border-border/40">
              <Skeleton width={20} height={14} className="mb-2" />
              {Math.random() > 0.6 && (
                <div className="space-y-1">
                  <Skeleton width="60%" height={8} />
                  {Math.random() > 0.5 && <Skeleton width="50%" height={8} />}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
