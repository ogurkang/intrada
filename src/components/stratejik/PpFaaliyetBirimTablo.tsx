'use client'

import type { PpFaaliyetBirimBlok, PpFaaliyetBirimSatir } from '@/lib/pp-faaliyet-birim-rapor'
import { ppSatirSpanlari } from '@/lib/pp-tablo-span'

const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'
const ETIKET = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 font-bold text-slate-900 align-middle'
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

function BlokGovde({ satirlar }: { satirlar: PpFaaliyetBirimSatir[] }) {
  const programSpan = ppSatirSpanlari(satirlar, s => s.programAdi)
  const hedefSpan = ppSatirSpanlari(satirlar, s => `${s.programAdi}\0${s.hedefAdi}`)
  const sorumluSpan = ppSatirSpanlari(
    satirlar,
    s => `${s.programAdi}\0${s.hedefAdi}\0${s.sorumluBirim}`,
  )

  return (
    <>
      {satirlar.map((s, i) => (
        <tr key={`${s.faaliyetKodu}-${i}`}>
          {programSpan[i]! > 0 ? (
            <td rowSpan={programSpan[i]} className={ETIKET}>{s.programAdi}</td>
          ) : null}
          {hedefSpan[i]! > 0 ? (
            <td rowSpan={hedefSpan[i]} className={ETIKET}>{s.hedefAdi}</td>
          ) : null}
          <td className={`${DEGER} whitespace-nowrap text-center font-mono text-xs`}>{s.faaliyetKodu}</td>
          <td className={DEGER}>{s.faaliyetAdi}</td>
          {sorumluSpan[i]! > 0 ? (
            <td rowSpan={sorumluSpan[i]} className={ETIKET}>{s.sorumluBirim || '—'}</td>
          ) : null}
        </tr>
      ))}
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
              <BlokGovde satirlar={blok.satirlar} />
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
