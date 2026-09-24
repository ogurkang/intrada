import Link from 'next/link'
import type { ReactNode } from 'react'

/** İSG modülü yönlendirici düğmeleri: lacivert zemin, beyaz yazı (aksi belirtilmedikçe). */
export const ISG_YONLENDIRICI_BTN =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors shrink-0'

export function IsgYonlendiriciDugme({
  href,
  children,
  className = '',
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={`${ISG_YONLENDIRICI_BTN} ${className}`.trim()}>
      {children}
    </Link>
  )
}
