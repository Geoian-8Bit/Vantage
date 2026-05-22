interface PageHeaderProps {
  section: string
  page: string
  actions?: React.ReactNode
}

export function PageHeader({ section, page, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-y-3 border-b border-border pb-4 sm:pb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-subtext sm:text-sm">
          <span>{section}</span>
          <span className="text-accent">/</span>
          <span className="text-text">{page}</span>
        </div>
        <h2 className="mt-1 text-lg font-bold text-text sm:text-xl">{page}</h2>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
