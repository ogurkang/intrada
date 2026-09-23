import Link from 'next/link'

export default function IsgYonetimiPage() {
  const linkClass =
    'block rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-300 hover:bg-amber-50/60 transition-colors text-right'

  return (
    <div className="flex min-h-[60vh] justify-end">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-slate-800">İSG Yönetimi</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            İş sağlığı ve güvenliği süreçleri, raporları ve tanımları bu modül altında toplanır.
          </p>
        </div>
        <ul className="mt-6 flex flex-col gap-3">
          <li>
            <Link href="/isg/islemler" className={linkClass}>
              İşlemler
            </Link>
          </li>
          <li>
            <Link href="/isg/raporlar" className={linkClass}>
              Raporlar
            </Link>
          </li>
          <li>
            <Link href="/isg/tanimlar" className={linkClass}>
              Tanımlar
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
