import Link from 'next/link'

export default function IsgYonetimiPage() {
  const linkClass =
    'block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-300 hover:bg-amber-50/50 transition-colors w-full max-w-sm text-right'

  return (
    <div className="max-w-3xl space-y-6 ml-auto">
      <div className="text-right sm:text-left">
        <h1 className="text-2xl font-bold text-slate-800">İSG Yönetimi</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          İş sağlığı ve güvenliği süreçleri, raporları ve tanımları bu modül altında toplanır.
        </p>
      </div>
      <ul className="flex flex-col gap-3 items-end">
        <li className="w-full max-w-sm">
          <Link href="/isg/islemler" className={linkClass}>
            İşlemler
          </Link>
        </li>
        <li className="w-full max-w-sm">
          <Link href="/isg/raporlar" className={linkClass}>
            Raporlar
          </Link>
        </li>
        <li className="w-full max-w-sm">
          <Link href="/isg/tanimlar" className={linkClass}>
            Tanımlar
          </Link>
        </li>
      </ul>
    </div>
  )
}
