'use client'

import Link from 'next/link'
import { IsgYonlendiriciDugme } from '@/components/isg/IsgYonlendiriciDugme'

export type IsgIslemHubSatir = {
  id: string
  baslik: string
  aciklama: string
  href: string
  renk?: string
}

type Props = {
  satirlar: IsgIslemHubSatir[]
  baslik?: string
  aciklama?: string
  geriHref?: string
  geriLabel?: string
}

const DEFAULT_RENK = 'border-amber-200 bg-amber-50 text-amber-900'

export default function IsgIslemlerHubClient({
  satirlar,
  baslik = 'İSG — İşlemler',
  aciklama = 'İşlem kartına tıklayarak ilgili ekrana gidin.',
  geriHref = '/isg',
  geriLabel = '← İSG Yönetimi',
}: Props) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{aciklama}</p>
        </div>
        <IsgYonlendiriciDugme href={geriHref}>{geriLabel}</IsgYonlendiriciDugme>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {satirlar.map(r => (
          <Link
            key={r.id}
            href={r.href}
            className={`rounded-xl border p-5 ${r.renk ?? DEFAULT_RENK} transition-shadow hover:shadow-md`}
          >
            <h2 className="font-semibold leading-snug text-slate-800">{r.baslik}</h2>
            <p className="mb-4 mt-3 text-xs leading-relaxed opacity-80">{r.aciklama}</p>
            <span className="text-xs font-medium opacity-90">Yönet →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
