'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trNormalize } from '@/lib/turkce-search'

interface Personel {
  sicil_no: string
  ad_soyad: string
}

interface Props {
  personeller: Personel[]
  popup?: boolean
}

export default function PersonelHareketiEkleClient({ personeller, popup = false }: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [secilenSicil, setSecilenSicil] = useState('')

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return personeller.slice(0, 12)
    return personeller
      .filter(p => trNormalize(p.sicil_no).includes(q) || trNormalize(p.ad_soyad).includes(q))
      .slice(0, 12)
  }, [personeller, arama])

  const secilen = personeller.find(p => p.sicil_no === secilenSicil)

  function devamEt() {
    if (!secilenSicil) return
    const href = `/personel-hareketleri/${encodeURIComponent(secilenSicil)}/degistir?yeni=1${popup ? '&popup=1' : ''}`
    const w = window.open(href, '_blank')
    if (!w) router.push(href)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Personel <span className="text-red-500">*</span>
          </label>
          {secilen ? (
            <div className="flex items-center justify-between p-2.5 border border-green-300 bg-green-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-800">{secilen.ad_soyad}</span>
                <span className="text-xs text-slate-500 ml-2">{secilen.sicil_no}</span>
              </div>
              <button
                type="button"
                onClick={() => { setSecilenSicil(''); setArama('') }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Değiştir
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="İsim veya sicil no ile ara…"
                value={arama}
                onChange={e => setArama(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              {filtreli.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filtreli.map(p => (
                    <li key={p.sicil_no}>
                      <button
                        type="button"
                        onClick={() => { setSecilenSicil(p.sicil_no); setArama('') }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-800">{p.ad_soyad}</span>
                        <span className="text-slate-400 text-xs ml-2">{p.sicil_no}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Personel seçildikten sonra hareket formu yeni sekmede açılır. Aktif kadro kaydı olmasa bile yeni personel hareketi oluşturabilirsiniz.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={!secilenSicil}
            onClick={devamEt}
            className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hareket Formunu Aç
          </button>
          <Link
            href="/personel-hareketleri"
            className="border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            İptal
          </Link>
        </div>
      </div>
    </div>
  )
}
