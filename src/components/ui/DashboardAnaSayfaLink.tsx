import Link from 'next/link'

/** Personel kartı ve kullanıcı modül ekranlarında tutarlı «Ana sayfa» düğmesi */
export default function DashboardAnaSayfaLink({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`intrada-btn intrada-btn-ust-menu ${className}`}
    >
      Ana sayfa
    </Link>
  )
}
