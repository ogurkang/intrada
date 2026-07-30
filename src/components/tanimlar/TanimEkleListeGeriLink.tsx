import Link from 'next/link'

/** Tanımlar ekle sayfalarında liste ekranına dönüş — Sendika Bilgileri Ekle düğmesi ile aynı stil */
export default function TanimEkleListeGeriLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium shrink-0"
    >
      <span aria-hidden className="text-base leading-none font-normal">
        ‹
      </span>
      {label}
    </Link>
  )
}
