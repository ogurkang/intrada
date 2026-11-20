'use client'

import type { PpFaaliyetMaliyetSatir } from '@/lib/pp-faaliyet-maliyet-rapor'
import { ppRaporPara } from '@/lib/pp-mudurluk-rapor'

const HUCRE = 'border border-slate-300 px-3 py-2.5 align-middle text-sm'
const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'

function satirSinif(tur: PpFaaliyetMaliyetSatir['tur']): string {
  if (tur === 'program') return 'bg-[#C6EFCE] font-bold text-slate-900'
  return 'bg-[#F2F2F2] font-semibold text-slate-800'
}

export default function PpFaaliyetDuzeyiMaliyetTablo({
  yil,
  satirlar,
}: {
  yil: number
  satirlar: PpFaaliyetMaliyetSatir[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th colSpan={2} rowSpan={2} className={`${BASLIK} text-left`}>
              PROGRAM SINIFLANDIRMASI
            </th>
            <th className={BASLIK}>{yil}</th>
            <th className={BASLIK}>{yil + 1}</th>
          </tr>
          <tr>
            <th className={BASLIK}>BÜTÇE İÇİ</th>
            <th className={BASLIK}>BÜTÇE İÇİ</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.length === 0 ? (
            <tr>
              <td colSpan={4} className={`${HUCRE} py-10 text-center text-slate-500`}>
                Seçilen yıl için program / faaliyet kaydı yok.
              </td>
            </tr>
          ) : satirlar.map((s, i) => (
            <tr key={`${s.tur}-${i}`}>
              <td className={`${HUCRE} w-36 whitespace-nowrap ${satirSinif(s.tur)}`}>
                {s.etiket}
              </td>
              <td className={`${HUCRE} ${satirSinif(s.tur)}`}>
                {s.ad}
              </td>
              <td className={`${HUCRE} w-36 text-center tabular-nums ${satirSinif(s.tur)}`}>
                {ppRaporPara(s.yilTutar)}
              </td>
              <td className={`${HUCRE} w-36 text-center tabular-nums ${satirSinif(s.tur)}`}>
                {ppRaporPara(s.sonrakiTutar)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
