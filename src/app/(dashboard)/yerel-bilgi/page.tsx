import Link from 'next/link'

export default function YerelBilgiYonetimiPage() {
  const linkClass =
    'block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors w-full max-w-sm text-right'

  return (
    <div className="max-w-3xl space-y-6 ml-auto">
      <div className="text-right sm:text-left">
        <h1 className="text-2xl font-bold text-slate-800">Yerel Bilgi Yönetimi</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          İşlemler, raporlar ve tanımlar bu modül altında toplanır. Menüden alt başlıklara geçebilirsiniz.
        </p>
      </div>
      <ul className="flex flex-col gap-3 items-end">
        <li className="w-full max-w-sm">
          <Link href="/yerel-bilgi/islemler" className={linkClass}>
            İşlemler
          </Link>
        </li>
        <li className="w-full max-w-sm">
          <Link href="/yerel-bilgi/raporlar" className={linkClass}>
            Raporlar
          </Link>
        </li>
        <li className="w-full max-w-sm">
          <Link href="/yerel-bilgi/tanimlar" className={linkClass}>
            Tanımlar
          </Link>
        </li>
      </ul>
    </div>
  )
}
