'use client'

import type { PpGostergeBirimSatir } from '@/lib/pp-gosterge-birim-rapor'

const HUCRE = 'border border-slate-300 px-3 py-2.5 align-middle text-sm'
const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'
const ETIKET = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 font-bold text-slate-900'
const DEGER = 'border border-slate-300 bg-[#F2F2F2] px-3 py-2.5 text-slate-800'

export default function PpGostergeBirimTablo({ satirlar }: { satirlar: PpGostergeBirimSatir[] }) {
  return (
    <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr>
            <th rowSpan={2} className={`${BASLIK} text-left`}>PROGRAM</th>
            <th rowSpan={2} className={`${BASLIK} text-left`}>ALT PROGRAM</th>
            <th colSpan={2} className={BASLIK}>PERFORMANS GÖSTERGELERİ</th>
            <th rowSpan={2} className={BASLIK}>İLGİLİ MÜDÜRLÜK</th>
          </tr>
          <tr>
            <th className={BASLIK}>Kodu</th>
            <th className={BASLIK}>Adı</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.length === 0 ? (
            <tr>
              <td colSpan={5} className={`${HUCRE} py-10 text-center text-slate-500`}>
                Seçilen yıl için gösterge kaydı yok.
              </td>
            </tr>
          ) : satirlar.map((s, i) => (
            <tr key={`${s.gostergeKodu}-${i}`}>
              <td className={ETIKET}>{s.programAdi}</td>
              <td className={ETIKET}>{s.altProgramAdi}</td>
              <td className={`${DEGER} whitespace-nowrap text-center font-mono text-xs`}>{s.gostergeKodu}</td>
              <td className={DEGER}>{s.gostergeAdi}</td>
              <td className={ETIKET}>{s.ilgiliMudurluk || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
