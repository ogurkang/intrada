'use client'

import Link from 'next/link'
import { IsgYonlendiriciDugme } from '@/components/isg/IsgYonlendiriciDugme'

type Props = {
  baslik: string
  aciklama?: string
  geriHref?: string
  geriLabel?: string
  excelHref?: string
  excelLabel?: string
  yil?: number
  minYil?: number
  maxYil?: number
  onYilChange?: (y: number) => void
}

export default function IsgRaporUstBaslik({
  baslik,
  aciklama,
  geriHref = '/isg/raporlar',
  geriLabel = '← İSG Raporları',
  excelHref,
  excelLabel = 'Excel İndir',
  yil,
  minYil = 2000,
  maxYil = 2035,
  onYilChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        {aciklama ? <p className="mt-1 text-sm text-slate-600">{aciklama}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {geriHref ? <IsgYonlendiriciDugme href={geriHref}>{geriLabel}</IsgYonlendiriciDugme> : null}
        {excelHref ? (
          <Link
            href={excelHref}
            className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            {excelLabel}
          </Link>
        ) : null}
        {yil != null && onYilChange ? (
          <>
            <label className="whitespace-nowrap text-sm text-slate-600">Yıl</label>
            <select
              value={yil}
              onChange={e => onYilChange(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              {Array.from({ length: maxYil - minYil + 1 }, (_, i) => minYil + i).map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>
    </div>
  )
}
