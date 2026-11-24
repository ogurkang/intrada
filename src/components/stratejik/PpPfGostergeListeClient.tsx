'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ppPfGostergeSil } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/pf/gosterge-actions'
import { ppPfKurumIciKaydet } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/pf/odenek-actions'
import { CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'
import PpSatirSaat from '@/components/stratejik/PpSatirSaat'
import { ppParaYaz } from '@/lib/pp-iliski'

export type PpMaliyetToplam = {
  t1Butce: number
  t1Haziran: number
  t1YilSonu: number
  tButce: number
  t1Tahmin: number
  t2Tahmin: number
}

export type PpPfGostergeListeSatir = {
  id: number
  sira: number
  kod: string
  ad: string
  maliyet: PpMaliyetToplam
}

const MALIYET = [
  ['t1Butce', 'bg-slate-500 text-white', -1, 'Bütçe'],
  ['t1Haziran', 'bg-slate-400 text-slate-900', -1, 'Haziran Sonu Harcama'],
  ['t1YilSonu', 'bg-slate-200 text-slate-800', -1, 'Yıl Sonu Tahmini Harcama'],
  ['tButce', 'bg-emerald-100 text-slate-800', 0, 'Bütçe'],
  ['t1Tahmin', 'bg-orange-100 text-slate-800', 1, 'Tahmin'],
  ['t2Tahmin', 'bg-sky-100 text-slate-800', 2, 'Tahmin'],
] as const

export default function PpPfGostergeListeClient({
  yil,
  faaliyetId,
  baslik,
  satirlar,
  kurumIciBaslangic = false,
}: {
  yil: number
  faaliyetId: number
  baslik: string
  satirlar: PpPfGostergeListeSatir[]
  kurumIciBaslangic?: boolean
}) {
  const router = useRouter()
  const [bekliyor, start] = useTransition()
  const [kurumIci, setKurumIci] = useState(kurumIciBaslangic)
  const [hata, setHata] = useState<string | null>(null)

  function kurumIciIsle() {
    setHata(null)
    const sonraki = !kurumIci
    start(async () => {
      const s = await ppPfKurumIciKaydet(faaliyetId, sonraki)
      if (s.hata) {
        setHata(s.hata)
        return
      }
      setKurumIci(sonraki)
      try {
        window.opener?.location.reload()
      } catch {
        /* ignore */
      }
      router.refresh()
    })
  }

  function sil(s: PpPfGostergeListeSatir) {
    const tutarVar = Object.values(s.maliyet).some(n => n > 0)
    if (tutarVar) {
      alert('Silmek istediğiniz başlığa bağlı ödenek teklifi bulunmaktadır.')
      return
    }
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return
    start(async () => {
      const sonuc = await ppPfGostergeSil(s.id, faaliyetId)
      if (sonuc.hata) alert(sonuc.hata)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={kurumIciIsle}
            disabled={bekliyor}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              kurumIci ? 'bg-orange-700 hover:bg-orange-600' : 'bg-orange-500 hover:bg-orange-400'
            }`}
          >
            {kurumIci ? 'Kurum İçi (aktif)' : 'Kurum İçi'}
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(`/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gosterge/yeni`, '_blank')
            }
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Gösterge Ekle
          </button>
        </div>
      </div>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th rowSpan={2} className="w-16 px-3 py-2 text-center">
                Sıra No
              </th>
              <th rowSpan={2} className="w-28 px-3 py-2 text-left">
                Kodu
              </th>
              <th rowSpan={2} className="px-3 py-2 text-left">
                Gösterge
              </th>
              <th colSpan={6} className="px-3 py-2 text-center">
                Ödenek Teklifi
              </th>
              <th rowSpan={2} className="w-36 px-3 py-2 text-center">
                İşlemler
              </th>
            </tr>
            <tr className="border-b border-slate-200">
              {MALIYET.map(([anahtar, renk, kayma, ad]) => (
                <th key={anahtar} className={`px-2 py-2 text-right text-xs font-medium ${renk}`}>
                  {yil + kayma} {ad}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  Henüz gösterge yok.
                </td>
              </tr>
            ) : (
              satirlar.map(s => (
                <tr key={s.id}>
                  <td className="px-3 py-3 text-center text-slate-600">{s.sira}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{s.kod}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{s.ad}</td>
                  {MALIYET.map(([anahtar, renk]) => (
                    <td key={anahtar} className={`px-2 py-3 text-right text-xs tabular-nums ${renk}`}>
                      {ppParaYaz(s.maliyet[anahtar]) || '—'}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <PpSatirSaat tablo="performans_gosterge" kayitId={s.id} />
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gosterge/${s.id}`,
                            '_blank',
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Düzenle / ödenek"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <CopKutusuSilDugmesi onClick={() => sil(s)} disabled={bekliyor} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
