'use client'

import type { ReactNode } from 'react'
import type { PpMudSatir, PpMudSatirTur } from '@/lib/pp-mudurluk-program-rapor'
import { ppRaporPara } from '@/lib/pp-mudurluk-rapor'

/** Diğer PP raporlarıyla aynı palet + iki uyumlu grup. */
const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'
const STRATEJIK = 'border border-slate-300 bg-[#BDD7EE] px-3 py-2.5 text-slate-900'
const PROGRAM = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 text-slate-900'
const ARA = 'border border-slate-300 bg-[#E2F0D9] px-3 py-2.5 text-slate-900'
const DEGER = 'border border-slate-300 bg-[#F2F2F2] px-3 py-2.5 text-slate-800'
const ORTA = 'text-center'
const SOL = 'text-left'

function satirSinif(tur: PpMudSatirTur): string {
  if (tur === 'amac_baslik' || tur === 'amac_metin' || tur === 'stratejik_hedef') return STRATEJIK
  if (tur === 'program' || tur === 'alt_program' || tur === 'performans_hedefi') return PROGRAM
  if (tur === 'faaliyet' || tur === 'mudurluk' || tur === 'performans_faaliyeti') return ARA
  if (tur === 'kolon_baslik') return BASLIK
  return DEGER
}

function kodHucreleri(s: PpMudSatir, zemin: string) {
  return [2, 3, 4, 5, 6, 7, 8].map(col => (
    <td key={col} className={`${zemin} ${ORTA} w-12 font-mono text-xs`}>
      {s.kodCol === col ? (s.kod || '') : ''}
    </td>
  ))
}

export default function PpMudurlukProgramTablo({
  satirlar,
}: {
  satirlar: PpMudSatir[]
}) {
  if (!satirlar.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
        Bu müdürlük için performans programı satırı yok.
      </p>
    )
  }

  const rows: ReactNode[] = []
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i]
    const zemin = satirSinif(s.tur)

    if (s.tur === 'amac_baslik' || s.tur === 'amac_metin') {
      rows.push(
        <tr key={`a-${i}`}>
          <td colSpan={10} className={`${zemin} ${ORTA} font-bold`}>
            {s.aciklama || s.etiket}
          </td>
        </tr>,
      )
      continue
    }

    if (s.tur === 'kolon_baslik') {
      rows.push(
        <tr key={`h-${i}`}>
          <th className={`${BASLIK}`}>Türü</th>
          <th colSpan={7} className={BASLIK}>Kodu</th>
          <th className={BASLIK}>Açıklama</th>
          <th className={`${BASLIK} w-28`}>Tutar</th>
        </tr>,
      )
      continue
    }

    if (s.tur === 'mudurluk') {
      rows.push(
        <tr key={`m-${i}`}>
          <td className={`${zemin} ${SOL} font-bold whitespace-nowrap`}>{s.etiket}</td>
          <td colSpan={8} className={`${zemin} ${ORTA} font-semibold`}>{s.aciklama}</td>
          <td className={zemin} />
        </tr>,
      )
      continue
    }

    if (s.tur === 'gosterge' && satirlar[i + 1]?.tur === 'butce') {
      const b = satirlar[i + 1]
      rows.push(
        <tr key={`g-${i}`}>
          <td rowSpan={2} colSpan={7} className={`${DEGER} ${SOL} font-bold align-middle`}>
            Gösterge
          </td>
          <td className={`${DEGER} ${ORTA} font-mono text-xs`}>{s.kod}</td>
          <td className={`${DEGER} ${SOL}`}>{s.aciklama}</td>
          <td className={`${DEGER} ${ORTA} tabular-nums`}>
            {s.tutar != null ? ppRaporPara(s.tutar) : ''}
          </td>
        </tr>,
      )
      rows.push(
        <tr key={`b-${i}`}>
          <td className={`${DEGER} ${ORTA} font-mono text-xs`}>{b.kod}</td>
          <td className={`${DEGER} ${SOL} font-bold`}>BÜTÇE</td>
          <td className={`${DEGER} ${ORTA} tabular-nums`}>
            {b.tutar != null ? ppRaporPara(b.tutar) : ''}
          </td>
        </tr>,
      )
      i += 1
      continue
    }

    rows.push(
      <tr key={`r-${i}`}>
        <td className={`${zemin} ${SOL} font-bold whitespace-nowrap`}>{s.etiket}</td>
        {kodHucreleri(s, zemin)}
        <td className={`${zemin} ${SOL}`}>{s.aciklama}</td>
        <td className={`${zemin} ${ORTA} tabular-nums`}>
          {s.tutar != null ? ppRaporPara(s.tutar) : ''}
        </td>
      </tr>,
    )
  }

  return (
    <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] border-collapse">
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}
