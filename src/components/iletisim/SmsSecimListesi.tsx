'use client'

import type { Dispatch, SetStateAction } from 'react'

export interface SecimSatir {
  key: string
  ad: string
  altMetin: string
  telefon: string
  telefonGecerli: boolean
}

interface Props {
  satirlar: SecimSatir[]
  secili: Set<string>
  setSecili: Dispatch<SetStateAction<Set<string>>>
  secilebilirKeyler: string[]
}

export default function SmsSecimListesi({ satirlar, secili, setSecili, secilebilirKeyler }: Props) {
  const tumuSecili = secilebilirKeyler.length > 0 && secilebilirKeyler.every(k => secili.has(k))
  const seciliSayi = satirlar.filter(s => secili.has(s.key)).length

  function toggle(key: string) {
    setSecili(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }
  function tumunuToggle() {
    setSecili(prev => {
      const n = new Set(prev)
      if (tumuSecili) secilebilirKeyler.forEach(k => n.delete(k))
      else secilebilirKeyler.forEach(k => n.add(k))
      return n
    })
  }

  return (
    <>
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={tumuSecili} onChange={tumunuToggle} disabled={!secilebilirKeyler.length} />
          Görünen geçerli numaraları seç ({secilebilirKeyler.length})
        </label>
        <span>{seciliSayi} seçili</span>
      </div>
      <div className="max-h-[460px] overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {satirlar.map(s => (
              <tr key={s.key} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="pl-4 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={secili.has(s.key)}
                    disabled={!s.telefonGecerli}
                    onChange={() => toggle(s.key)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <div className="font-medium text-slate-800">{s.ad}</div>
                  {s.altMetin && <div className="text-xs text-slate-400">{s.altMetin}</div>}
                </td>
                <td className="py-2 pr-4 text-right whitespace-nowrap">
                  {s.telefonGecerli ? (
                    <span className="text-slate-600">{s.telefon}</span>
                  ) : (
                    <span className="text-xs text-red-500">telefon yok</span>
                  )}
                </td>
              </tr>
            ))}
            {!satirlar.length && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400 text-sm">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
