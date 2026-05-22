interface PageHeaderProps {
  section: string
  page: string
  actions?: React.ReactNode
}

export function PageHeader({ section, page, actions }: PageHeaderProps) {
  return (
    <div className="page-header-sticky sticky top-0 z-20 -mx-4 -mt-4 bg-surface/85 px-4 pt-3 backdrop-blur-md sm:static sm:m-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:backdrop-blur-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-b border-border pb-3 sm:items-start sm:pb-5">
        <div className="min-w-0">
          <div className="hidden items-center gap-2 text-xs text-subtext sm:flex sm:text-sm">
            <span>{section}</span>
            <span className="text-accent">/</span>
            <span className="text-text">{page}</span>
          </div>
          <h2 className="truncate text-base font-bold text-text sm:mt-1 sm:text-xl">
            {page}
          </h2>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
