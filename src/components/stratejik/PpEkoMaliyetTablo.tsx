'use client'

import { Fragment } from 'react'
import type { PpEkoMaliyetRapor, PpEkoSatir } from '@/lib/pp-eko-maliyet-rapor'
import { ppRaporPara } from '@/lib/pp-mudurluk-rapor'

const HUCRE = 'border border-slate-300 px-3 py-2.5 align-middle text-sm'
const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'

function satirSinif(tur: PpEkoSatir['tur']): string {
  if (tur === 'ekonomik' || tur === 'butce_disi_diger') return 'bg-[#F2F2F2] text-slate-800'
  return 'bg-[#C6EFCE] font-bold text-slate-900'
}

export default function PpEkoMaliyetTablo({ rapor }: { rapor: PpEkoMaliyetRapor }) {
  const yillar = [rapor.yil, rapor.yil + 1, rapor.yil + 2]
  return (
    <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] border-collapse">
        <thead>
          <tr>
            <th rowSpan={2} className={`${BASLIK} text-left`}>EKONOMİK KOD</th>
            {yillar.map(y => (
              <th key={y} colSpan={3} className={BASLIK}>{y}</th>
            ))}
          </tr>
          <tr>
            {yillar.map(y => (
              <Fragment key={y}>
                <th className={`${BASLIK} text-xs`}>HİZMET PROGRAMLARI TOPLAMI</th>
                <th className={`${BASLIK} text-xs`}>YÖNETİM VE DESTEK PROGRAMI TOPLAMI</th>
                <th className={`${BASLIK} text-xs`}>GENEL TOPLAM</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rapor.satirlar.length === 0 ? (
            <tr>
              <td colSpan={10} className={`${HUCRE} py-10 text-center text-slate-500`}>
                Seçilen yıl için ekonomik ödenek kaydı yok.
              </td>
            </tr>
          ) : rapor.satirlar.map(s => (
            <tr key={`${s.tur}-${s.ad}`}>
              <td className={`${HUCRE} whitespace-nowrap ${satirSinif(s.tur)}`}>{s.ad}</td>
              {s.yillar.map((h, i) => (
                <Fragment key={`${s.ad}-${i}`}>
                  <td className={`${HUCRE} text-center tabular-nums ${satirSinif(s.tur)}`}>{ppRaporPara(h.hizmet)}</td>
                  <td className={`${HUCRE} text-center tabular-nums ${satirSinif(s.tur)}`}>{ppRaporPara(h.yonetim)}</td>
                  <td className={`${HUCRE} text-center tabular-nums ${satirSinif(s.tur)}`}>{ppRaporPara(h.genel)}</td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
