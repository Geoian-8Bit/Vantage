import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-4 lg:space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-5">
        <div className="space-y-2">
          <Skeleton width={140} height={14} />
          <Skeleton width={120} height={24} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`space-y-2 ${
                i === 0
                  ? 'pb-3 sm:pr-5 sm:pb-0'
                  : i === 1
                    ? 'py-3 sm:px-5 sm:py-0'
                    : 'pt-3 sm:pt-0 sm:pl-5'
              }`}
            >
              <Skeleton width={90} height={11} />
              <Skeleton width={140} height={26} rounded="md" />
              <Skeleton width={110} height={11} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <Skeleton width={120} height={12} />
            <Skeleton width={56} height={20} rounded="md" />
          </div>
          <Skeleton width={200} height={30} rounded="md" />
          <Skeleton width={170} height={11} />
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <Skeleton width={140} height={12} />
          <Skeleton width={120} height={28} rounded="lg" />
          <Skeleton width={100} height={18} rounded="md" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <Skeleton width={130} height={12} className="mb-4" />
        <div className="flex h-52 items-end gap-2">
          {[40, 65, 50, 80, 45, 70].map((h, i) => (
            <div key={i} className="flex flex-1 flex-col justify-end gap-1.5">
              <Skeleton height={`${h}%`} rounded="sm" style={{ width: '100%' }} />
              <Skeleton
                height={`${h * 0.7}%`}
                rounded="sm"
                style={{ width: '100%', opacity: 0.6 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
