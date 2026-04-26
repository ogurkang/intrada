import Link from 'next/link'

interface Item {
  label: string
  href?: string
}

export default function StratejikPlanBreadcrumb({ items }: { items: Item[] }) {
  return (
    <nav className="text-sm text-slate-500" aria-label="Stratejik plan konumu">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 && <span className="text-slate-300">&gt;</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-slate-800 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-800">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
