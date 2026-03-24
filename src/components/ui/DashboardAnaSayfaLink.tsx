import Link from 'next/link'

/** Personel kartı ve kullanıcı modül ekranlarında tutarlı «Ana sayfa» düğmesi */
export default function DashboardAnaSayfaLink({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors ${className}`}
    >
      Ana sayfa
    </Link>
  )
}
