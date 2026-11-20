'use client'

import type { PpFaaliyetBirimBlok } from '@/lib/pp-faaliyet-birim-rapor'

const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'
const ETIKET = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 font-bold text-slate-900'
const DEGER = 'border border-slate-300 bg-[#F2F2F2] px-3 py-2.5 text-slate-800'

function BaslikSatirlari() {
  return (
    <>
      <tr>
        <th rowSpan={2} className={`${BASLIK} text-left`}>PROGRAM</th>
        <th rowSpan={2} className={`${BASLIK} text-left`}>PERFORMANS HEDEFİ</th>
        <th colSpan={2} className={BASLIK}>PERFORMANS FAALİYETİ</th>
        <th rowSpan={2} className={BASLIK}>SORUMLU BİRİMLER</th>
      </tr>
      <tr>
        <th className={BASLIK}>Kodu</th>
        <th className={BASLIK}>Adı</th>
      </tr>
    </>
  )
}

export default function PpFaaliyetBirimTablo({ bloklar }: { bloklar: PpFaaliyetBirimBlok[] }) {
  if (!bloklar.length) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Seçilen yıl için performans faaliyeti / sorumlu birim kaydı yok.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {bloklar.map((blok, bi) => (
        <div key={`${blok.programAdi}-${bi}`} className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <BaslikSatirlari />
            </thead>
            <tbody>
              {blok.satirlar.map((s, i) => (
                <tr key={`${s.faaliyetKodu}-${i}`}>
                  <td className={`${ETIKET}`}>{s.programAdi}</td>
                  <td className={`${ETIKET}`}>{s.hedefAdi}</td>
                  <td className={`${DEGER} whitespace-nowrap text-center font-mono text-xs`}>{s.faaliyetKodu}</td>
                  <td className={DEGER}>{s.faaliyetAdi}</td>
                  <td className={ETIKET}>{s.sorumluBirim || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
