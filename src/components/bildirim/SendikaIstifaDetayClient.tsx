'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: number
  satirlar: { etiket: string; deger: string }[]
  istifaTarihi: string
  onGuncelle: (id: number, tarih: string) => Promise<{ hata?: string }>
}

export default function SendikaIstifaDetayClient({
  id,
  satirlar,
  istifaTarihi,
  onGuncelle,
}: Props) {
  const router = useRouter()
  const [duzenle, setDuzenle] = useState(false)
  const [tarih, setTarih] = useState(istifaTarihi)
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()

  function vazgec() {
    setDuzenle(false)
    setHata(null)
    setTarih(istifaTarihi)
  }

  function kaydet() {
    setHata(null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
      setHata('İstifa tarihi seçilmelidir.')
      return
    }
    start(async () => {
      const res = await onGuncelle(id, tarih)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setDuzenle(false)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-sm text-slate-600">
          Yalnızca istifa tarihi düzenlenir. Tarih, dilekçedeki tarihi ve bu kaydın kapattığı üyeliğin bitişini
          birlikte değiştirir.
        </p>
        {!duzenle && (
          <button
            type="button"
            onClick={() => {
              setTarih(istifaTarihi)
              setHata(null)
              setDuzenle(true)
            }}
            className="shrink-0 ml-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Düzenle
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {satirlar.map(s => (
            <tr key={s.etiket} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-600 w-44 align-top">{s.etiket}</td>
              <td className="px-4 py-3 text-slate-800">
                {duzenle && s.etiket === 'İstifa Tarihi' ? (
                  <input
                    type="date"
                    value={tarih}
                    onChange={e => setTarih(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  s.deger
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {duzenle && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {hata && <p className="mr-auto text-sm text-red-600">{hata}</p>}
          <button type="button" onClick={vazgec} disabled={bekliyor} className="px-3 py-1.5 text-sm text-slate-600">
            Vazgeç
          </button>
          <button
            type="button"
            onClick={kaydet}
            disabled={bekliyor}
            className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg disabled:opacity-50"
          >
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      )}
    </div>
  )
}
