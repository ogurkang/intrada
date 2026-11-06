'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ppPerformansFaaliyetSatirSil } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/iliski-actions'
import { CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'

export type PpPerformansFaaliyetSatir = { id: number; sira: number; kod: string; ad: string; gostergeSayisi: number }

export default function PpPerformansFaaliyetListeClient({
  bagId,
  baslik,
  satirlar,
}: {
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
        <button type="button" onClick={() => window.open(`/stratejik-yonetim/performans-programi/pf/yeni?bag=${bagId}`, '_blank')} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Performans Faaliyeti Ekle
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-20 px-4 py-3 text-center">Sıra No</th>
              <th className="w-32 px-4 py-3 text-left">Kodu</th>
              <th className="px-4 py-3 text-left">Performans Faaliyeti</th>
              <th className="w-28 px-4 py-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">Henüz performans faaliyeti yok.</td></tr>
            ) : satirlar.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-center text-slate-600">{s.sira}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{s.kod}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{s.ad}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={() => window.open(`/stratejik-yonetim/performans-programi/pf/${s.id}`, '_blank')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" title="Düzenle">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <CopKutusuSilDugmesi onClick={() => sil(s)} disabled={bekliyor} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
