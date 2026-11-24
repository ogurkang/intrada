'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ppPerformansFaaliyetSatirSil } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/iliski-actions'
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

export type PpPerformansFaaliyetSatir = {
  id: number
  sira: number
  kod: string
  ad: string
  gostergeSayisi: number
  maliyet: PpMaliyetToplam
}

const MALIYET = [
  ['t1Butce', -1, 'Bütçe'],
  ['t1Haziran', -1, 'Haziran Sonu Harcama'],
  ['t1YilSonu', -1, 'Yıl Sonu Tahmini Harcama'],
  ['tButce', 0, 'Bütçe'],
  ['t1Tahmin', 1, 'Tahmin'],
  ['t2Tahmin', 2, 'Tahmin'],
] as const

export default function PpPerformansFaaliyetListeClient({
  yil,
  bagId,
  baslik,
  satirlar,
}: {
  yil: number
  bagId: number
  baslik: string
  satirlar: PpPerformansFaaliyetSatir[]
}) {
  const router = useRouter()
  const [bekliyor, start] = useTransition()

  function sil(s: PpPerformansFaaliyetSatir) {
    if (s.gostergeSayisi > 0) {
      alert('Silmek istediğiniz başlığa bağlı veriler bulunmaktadır.')
      return
    }
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return
    start(async () => {
      const sonuc = await ppPerformansFaaliyetSatirSil(s.id, bagId)
      if (sonuc.hata) alert(sonuc.hata)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <button
          type="button"
          onClick={() => window.open(`/stratejik-yonetim/performans-programi/pf/yeni?bag=${bagId}`, '_blank')}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Performans Faaliyeti Ekle
        </button>
      </div>
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
                Performans Faaliyeti
              </th>
              <th colSpan={6} className="px-3 py-2 text-center font-semibold text-slate-700">
                Performans Faaliyet Maliyeti
              </th>
              <th rowSpan={2} className="w-40 px-3 py-2 text-center">
                İşlemler
              </th>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              {MALIYET.map(([anahtar, kayma, ad]) => (
                <th key={anahtar} className="px-2 py-2 text-right text-xs font-medium text-slate-600">
                  {yil + kayma} {ad}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  Henüz performans faaliyeti yok.
                </td>
              </tr>
            ) : (
              satirlar.map(s => (
                <tr key={s.id}>
                  <td className="px-3 py-3 text-center text-slate-600">{s.sira}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{s.kod}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{s.ad}</td>
                  {MALIYET.map(([anahtar]) => (
                    <td key={anahtar} className="px-2 py-3 text-right text-xs tabular-nums text-slate-700">
                      {ppParaYaz(s.maliyet[anahtar]) || '—'}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <PpSatirSaat tablo="performans_faaliyet" kayitId={s.id} />
                      <button
                        type="button"
                        onClick={() => window.open(`/stratejik-yonetim/performans-programi/pf/${s.id}`, '_blank')}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Düzenle"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(`/stratejik-yonetim/performans-programi/pf/${s.id}/gostergeler`, '_blank')
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                        title="Göstergeler / ödenek teklifi"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
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
