import { Skeleton } from '@/components/ui/Skeleton'

export function RecurringSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {[0, 1].map((col) => (
        <div
          key={col}
          className="flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-border bg-surface/60 px-5 py-3">
            <Skeleton width={8} height={8} rounded="full" />
            <Skeleton width={130} height={14} />
            <Skeleton width={20} height={11} className="ml-auto" />
          </div>
          <div className="divide-y divide-border/40">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <Skeleton width={28} height={28} rounded="md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width={`${60 + i * 10}%`} height={13} />
                  <Skeleton width="40%" height={11} />
                </div>
                <Skeleton width={64} height={20} rounded="full" />
                <Skeleton width={70} height={14} />
                <Skeleton width={36} height={20} rounded="full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
