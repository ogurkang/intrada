import Link from 'next/link'

/** Tanımlar ekle sayfalarında liste ekranına dönüş — metin + ‹ sağda hizalı */
export default function TanimEkleListeGeriLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mb-4 flex justify-end">
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-800 font-medium"
      >
        <span>{label}</span>
        <span aria-hidden className="text-lg leading-none font-normal">
          ‹
        </span>
      </Link>
    </div>
  )
}
