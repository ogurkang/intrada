'use client'

import type { ReactNode } from 'react'
import type { PpMudSatir } from '@/lib/pp-mudurluk-program-rapor'
import { ppRaporPara } from '@/lib/pp-mudurluk-rapor'

const HUCRE = 'border border-slate-400 px-2 py-1.5 align-middle text-sm text-slate-800'
const ORTA = 'text-center'
const SOL = 'text-left'

function kodHucreleri(s: PpMudSatir) {
  return [2, 3, 4, 5, 6, 7, 8].map(col => (
    <td key={col} className={`${HUCRE} ${ORTA} w-12 font-mono text-xs`}>
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

    if (s.tur === 'amac_baslik' || s.tur === 'amac_metin') {
      rows.push(
        <tr key={`a-${i}`}>
          <td colSpan={10} className={`${HUCRE} ${ORTA} font-semibold bg-slate-50`}>
            {s.aciklama || s.etiket}
          </td>
        </tr>,
      )
      continue
    }

    if (s.tur === 'kolon_baslik') {
      rows.push(
        <tr key={`h-${i}`} className="bg-slate-100">
          <th className={`${HUCRE} ${ORTA} font-bold`}>Türü</th>
          <th colSpan={7} className={`${HUCRE} ${ORTA} font-bold`}>Kodu</th>
          <th className={`${HUCRE} ${ORTA} font-bold`}>Açıklama</th>
          <th className={`${HUCRE} ${ORTA} font-bold w-28`}>Tutar</th>
        </tr>,
      )
      continue
    }

    if (s.tur === 'mudurluk') {
      rows.push(
        <tr key={`m-${i}`}>
          <td className={`${HUCRE} ${SOL} font-medium whitespace-nowrap`}>{s.etiket}</td>
          <td colSpan={8} className={`${HUCRE} ${ORTA} font-medium`}>{s.aciklama}</td>
          <td className={HUCRE} />
        </tr>,
      )
      continue
    }

    if (s.tur === 'gosterge' && satirlar[i + 1]?.tur === 'butce') {
      const b = satirlar[i + 1]
      rows.push(
        <tr key={`g-${i}`}>
          <td rowSpan={2} colSpan={7} className={`${HUCRE} ${SOL} font-medium align-middle`}>
            Gösterge
          </td>
          <td className={`${HUCRE} ${ORTA} font-mono text-xs`}>{s.kod}</td>
          <td className={`${HUCRE} ${SOL}`}>{s.aciklama}</td>
          <td className={HUCRE} />
        </tr>,
      )
      rows.push(
        <tr key={`b-${i}`}>
          <td className={`${HUCRE} ${ORTA} font-mono text-xs`}>{b.kod}</td>
          <td className={`${HUCRE} ${SOL} font-semibold`}>BÜTÇE</td>
          <td className={`${HUCRE} ${ORTA} tabular-nums`}>
            {b.tutar != null ? ppRaporPara(b.tutar) : ''}
          </td>
        </tr>,
      )
      i += 1
      continue
    }

    rows.push(
      <tr key={`r-${i}`}>
        <td className={`${HUCRE} ${SOL} font-medium whitespace-nowrap`}>{s.etiket}</td>
        {kodHucreleri(s)}
        <td className={`${HUCRE} ${SOL}`}>{s.aciklama}</td>
        <td className={`${HUCRE} ${ORTA} tabular-nums`}>
          {s.tutar != null ? ppRaporPara(s.tutar) : ''}
        </td>
      </tr>,
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] border-collapse">
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}
