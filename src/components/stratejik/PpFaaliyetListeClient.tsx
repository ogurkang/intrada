'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ppFaaliyetEkle, ppFaaliyetSil } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/iliski-actions'
import { CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'
import PpSatirSaat from '@/components/stratejik/PpSatirSaat'

export type PpFaaliyetSatirListe = { id: number; sira: number; ad: string; hedefSayisi: number }

export default function PpFaaliyetListeClient({
  yil,
  programId,
  altProgramId,
  baslik,
  faaliyetler,
}: {
  yil: number
  programId: number
  altProgramId: number
  baslik: string
  faaliyetler: PpFaaliyetSatirListe[]
}) {
  const router = useRouter()
  const [acik, setAcik] = useState(false)
  const [ad, setAd] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()

  function sil(f: PpFaaliyetSatirListe) {
    if (f.hedefSayisi > 0) {
      alert('Silmek istediğiniz başlığa bağlı veriler bulunmaktadır.')
      return
    }
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return
    start(async () => {
      const s = await ppFaaliyetSil(f.id, altProgramId, yil, programId)
      if (s.hata) alert(s.hata)
      else router.refresh()
    })
  }

  function kaydet() {
    setHata(null)
    start(async () => {
      const s = await ppFaaliyetEkle(altProgramId, yil, programId, ad)
      if (s.hata) setHata(s.hata)
      else {
        setAd('')
        setAcik(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="mt-1 text-sm text-slate-500">Bu alt programın faaliyetleri.</p>
        </div>
        <button type="button" onClick={() => { setAd(''); setHata(null); setAcik(true) }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Faaliyet Ekle
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-20 px-4 py-3 text-center">Sıra No</th>
              <th className="px-4 py-3 text-left">Faaliyet</th>
              <th className="w-24 px-4 py-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {faaliyetler.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-500">Henüz faaliyet yok.</td></tr>
            ) : faaliyetler.map((f, i) => (
              <tr key={f.id}>
                <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{f.ad}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Link href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/faaliyetler/${f.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50" title="Alt program hedefleri">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </Link>
                    <PpSatirSaat tablo="faaliyet" kayitId={f.id} />
                    <CopKutusuSilDugmesi onClick={() => sil(f)} disabled={bekliyor} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={acik} onClose={() => setAcik(false)} title="Faaliyet Ekle" size="sm">
        <div className="space-y-3">
          <label className="block text-sm text-slate-700">Faaliyet adı
            <input value={ad} onChange={e => setAd(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          {hata ? <p className="text-sm text-red-700">{hata}</p> : null}
          <button type="button" onClick={kaydet} disabled={bekliyor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50">Kaydet</button>
        </div>
      </Modal>
    </div>
  )
}
