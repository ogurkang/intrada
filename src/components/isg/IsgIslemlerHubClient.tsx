'use client'

import Link from 'next/link'

export type IsgIslemHubSatir = {
  id: string
  baslik: string
  aciklama: string
  href: string
  renk?: string
}

type Props = {
  satirlar: IsgIslemHubSatir[]
}

const DEFAULT_RENK = 'border-amber-200 bg-amber-50 text-amber-900'

export default function IsgIslemlerHubClient({ satirlar }: Props) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <Link
            href="/isg"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← İSG Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">İSG — İşlemler</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            İşlem kartına tıklayarak ilgili ekrana gidin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {satirlar.map(r => (
          <Link
            key={r.id}
            href={r.href}
            className={`rounded-xl border p-5 ${r.renk ?? DEFAULT_RENK} hover:shadow-md transition-shadow`}
          >
            <h2 className="font-semibold text-slate-800 leading-snug">{r.baslik}</h2>
            <p className="text-xs opacity-80 mt-3 mb-4 leading-relaxed">{r.aciklama}</p>
            <span className="text-xs font-medium opacity-90">Yönet →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
