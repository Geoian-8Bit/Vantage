interface PageHeaderProps {
  section: string
  page: string
  actions?: React.ReactNode
}

export function PageHeader({ section, page, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-5 border-b border-border">
      <div>
        <div className="flex items-center gap-2 text-sm text-subtext">
          <span>{section}</span>
          <span className="text-accent">/</span>
          <span className="text-text">{page}</span>
        </div>
        <h2 className="text-xl font-bold text-text mt-1">{page}</h2>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
