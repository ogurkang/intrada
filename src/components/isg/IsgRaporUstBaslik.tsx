'use client'

import Link from 'next/link'

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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        {aciklama ? <p className="text-sm text-slate-600 mt-1">{aciklama}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
        {geriHref ? (
          <Link
            href={geriHref}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {geriLabel}
          </Link>
        ) : null}
        {excelHref ? (
          <Link
            href={excelHref}
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            {excelLabel}
          </Link>
        ) : null}
        {yil != null && onYilChange ? (
          <>
            <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
            <select
              value={yil}
              onChange={e => onYilChange(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
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
