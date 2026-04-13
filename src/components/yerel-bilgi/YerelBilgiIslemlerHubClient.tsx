'use client'

import Link from 'next/link'

export type YerelBilgiIslemHubSatir = {
  id: string
  donemAdi: string
  aciklama: string
  href: string
  /** Opsiyonel kart rengi (tanimlar hub ile uyumlu) */
  renk?: string
}

type Props = {
  satirlar: YerelBilgiIslemHubSatir[]
}

const DEFAULT_RENK = 'border-teal-200 bg-teal-50 text-teal-900'

export default function YerelBilgiIslemlerHubClient({ satirlar }: Props) {
  const geriBtn =
    'inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">İşlemler</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dönem kartına tıklayarak veri giriş ekranına gidin (Tanımlar ekranındaki widget düzeni ile aynı mantık).
          </p>
        </div>
        <Link href="/yerel-bilgi" className={`${geriBtn} shrink-0 self-start sm:self-center`}>
          ← Yerel Bilgi Yönetimi
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {satirlar.map(r => (
          <Link
            key={r.id}
            href={r.href}
            className={`rounded-xl border p-5 ${r.renk ?? DEFAULT_RENK} hover:shadow-md transition-shadow`}
          >
            <h2 className="font-semibold text-slate-800 leading-snug">{r.donemAdi}</h2>
            <p className="text-xs opacity-80 mt-3 mb-4 leading-relaxed">{r.aciklama}</p>
            <span className="text-xs font-medium opacity-90">Yönet →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
