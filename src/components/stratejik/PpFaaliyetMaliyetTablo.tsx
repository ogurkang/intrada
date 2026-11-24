'use client'

import type { PpFaaliyetMaliyetTablo, PpPerformansBlok } from '@/lib/pp-mudurluk-rapor'
import { ppMaliyetBaslik, ppRaporPara } from '@/lib/pp-mudurluk-rapor'

const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-3 font-bold text-slate-900'
const ETIKET = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 font-bold text-slate-900'
const DEGER = 'border border-slate-300 bg-[#F2F2F2] px-3 py-2.5 text-slate-800'
const SATIR = 'border border-slate-300 bg-[#F2F2F2] px-3 py-2.5 text-slate-800'
const TOPLAM = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 font-bold text-slate-900'

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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <tbody>
          <tr>
            <td colSpan={7} className={`${BASLIK} text-center`}>
              FAALİYET MALİYETLERİ TABLOSU
            </td>
          </tr>
          <Bilgi etiket="İdare Adı" deger={blok.veriKaynagi} />
          <Bilgi etiket="Program Adı" deger={blok.programAdi} />
          <Bilgi etiket="Alt Program Adı" deger={blok.altProgramAdi} />
          <Bilgi etiket="Alt Program Hedefi" deger={blok.hedef} />
          <Bilgi etiket="Alt Program Hedefi Açıklaması" deger={blok.hedefAciklama ?? ''} />
          <Bilgi etiket="Faaliyet Adı" deger={`PH ${tablo.kod} ${tablo.ad}`.trim()} />
          <tr>
            <td colSpan={7} className={`${DEGER} whitespace-pre-wrap`}>
              {tablo.aciklama || '—'}
            </td>
          </tr>
          <tr>
            <td className={`${BASLIK} text-left`}>Ekonomik Ad</td>
            {mBaslik.map((b, i) => (
              <td key={i} className={`${BASLIK} text-center text-xs`}>{b}</td>
            ))}
          </tr>
          {tablo.satirlar.map(s => (
            <tr key={s.ekonomikKod}>
              <td className={`${ETIKET}`}>{s.ekonomikAd}</td>
              {s.tutarlar.map((t, i) => (
                <td key={i} className={`${SATIR} text-right tabular-nums`}>{ppRaporPara(t)}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td className={TOPLAM}>FAALİYET MALİYETİ TOPLAMI</td>
            {toplam.map((t, i) => (
              <td key={i} className={`${TOPLAM} text-right tabular-nums`}>{ppRaporPara(t)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <tr>
      <td className={`${ETIKET} w-48 whitespace-nowrap`}>{etiket}</td>
      <td colSpan={6} className={`${DEGER} whitespace-pre-wrap`}>{deger}</td>
    </tr>
  )
}
