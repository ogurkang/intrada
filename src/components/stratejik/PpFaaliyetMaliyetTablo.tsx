'use client'

import type { PpFaaliyetMaliyetTablo, PpPerformansBlok } from '@/lib/pp-mudurluk-rapor'
import { ppMaliyetBaslik, ppRaporPara } from '@/lib/pp-mudurluk-rapor'

const HUCRE = 'px-3 py-2.5 align-top text-slate-700 border border-sky-300'
const BASLIK = 'bg-sky-100/80 px-3 py-2.5 font-semibold text-slate-700 border border-sky-300'

export default function PpFaaliyetMaliyetTabloGorunum({
  blok,
  tablo,
  yil,
}: {
  blok: PpPerformansBlok
  tablo: PpFaaliyetMaliyetTablo
  yil: number
}) {
  const mBaslik = ppMaliyetBaslik(yil)
  const toplam = mBaslik.map((_, i) => {
    const dolu = tablo.satirlar.map(s => s.tutarlar[i]).filter((n): n is number => n != null)
    return dolu.length ? dolu.reduce((a, b) => a + b, 0) : null
  })

  return (
    <div className="overflow-hidden rounded-xl border border-sky-200 bg-white">
      <div className="overflow-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <tbody>
            <tr>
              <td colSpan={7} className="border border-sky-400 bg-sky-600 px-3 py-3 text-center text-sm font-semibold tracking-wide text-white">
                FAALİYET MALİYETLERİ TABLOSU
              </td>
            </tr>
            <Bilgi etiket="İdare Adı" deger={blok.veriKaynagi} />
            <Bilgi etiket="Program Adı" deger={blok.programAdi} />
            <Bilgi etiket="Alt Program Adı" deger={blok.altProgramAdi} />
            <Bilgi etiket="Alt Program Hedefi" deger={blok.hedef} />
            <Bilgi etiket="Faaliyet Adı" deger={`PH ${tablo.kod} ${tablo.ad}`.trim()} />
            <tr>
              <td colSpan={7} className={`${HUCRE} whitespace-pre-wrap text-slate-800`}>
                {tablo.aciklama || '—'}
              </td>
            </tr>
            <tr>
              <td className={`${BASLIK} text-left`}>Ekonomik Ad</td>
              {mBaslik.map((b, i) => (
                <td key={i} className={`${BASLIK} text-center text-xs`}>{b}</td>
              ))}
            </tr>
            {tablo.satirlar.length === 0 ? (
              <tr>
                <td colSpan={7} className={`${HUCRE} py-8 text-center text-slate-500`}>
                  Bu faaliyet için 1. düzey ekonomik ödenek teklifi yok.
                </td>
              </tr>
            ) : tablo.satirlar.map(s => (
              <tr key={s.ekonomikKod}>
                <td className={`${HUCRE} font-medium text-slate-800`}>{s.ekonomikAd}</td>
                {s.tutarlar.map((t, i) => (
                  <td key={i} className={`${HUCRE} text-right tabular-nums`}>{ppRaporPara(t)}</td>
                ))}
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className={`${HUCRE} font-semibold text-slate-900`}>FAALİYET MALİYETİ TOPLAMI</td>
              {toplam.map((t, i) => (
                <td key={i} className={`${HUCRE} text-right font-semibold tabular-nums text-slate-900`}>{ppRaporPara(t)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <tr>
      <td className={`${HUCRE} w-48 whitespace-nowrap font-semibold text-slate-700`}>{etiket}</td>
      <td colSpan={6} className={`${HUCRE} whitespace-pre-wrap text-slate-800`}>{deger}</td>
    </tr>
  )
}
