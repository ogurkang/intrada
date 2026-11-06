'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import { ppAltProgramHedefiEkle, ppAltProgramHedefiGuncelle, ppAltProgramHedefiSil } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/iliski-actions'
import { CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'
import type { PpPhSecenek } from '@/lib/pp-iliski'

export type PpFaaliyetHedefSatir = { id: number; kod: string; ad: string; altHedefId: number; mudurluk: string; faaliyetSayisi: number }

export default function PpFaaliyetHedefListeClient({
  yil,
  programId,
  altProgramId,
  faaliyetId,
  faaliyetAdi,
  hedefler,
  secenekler,
  mudurlukler,
}: {
  yil: number
  programId: number
  altProgramId: number
  faaliyetId: number
  faaliyetAdi: string
  hedefler: PpFaaliyetHedefSatir[]
  secenekler: PpPhSecenek[]
  mudurlukler: string[]
}) {
  const router = useRouter()
  const [acik, setAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState<PpFaaliyetHedefSatir | null>(null)
  const [gorunen, setGorunen] = useState<PpFaaliyetHedefSatir | null>(null)
  const [altHedefId, setAltHedefId] = useState('')
  const [mudurluk, setMudurluk] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()

  function silHedef(h: PpFaaliyetHedefSatir) {
    if (h.faaliyetSayisi > 0) {
      alert('Silmek istediğiniz başlığa bağlı veriler bulunmaktadır.')
      return
    }
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return
    start(async () => {
      const s = await ppAltProgramHedefiSil(h.id, faaliyetId, yil, programId, altProgramId)
      if (s.hata) alert(s.hata)
      else router.refresh()
    })
  }

  function kaydet() {
    setHata(null)
    start(async () => {
      const s = duzenlenen
        ? await ppAltProgramHedefiGuncelle(duzenlenen.id, faaliyetId, altProgramId, yil, programId, Number(altHedefId), mudurluk)
        : await ppAltProgramHedefiEkle(faaliyetId, altProgramId, yil, programId, Number(altHedefId), mudurluk)
      if (s.hata) setHata(s.hata)
      else {
        setAltHedefId('')
        setMudurluk('')
        setDuzenlenen(null)
        setAcik(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{faaliyetAdi}</h1>
          <p className="mt-1 text-sm text-slate-500">Bu faaliyetin alt program hedefleri.</p>
        </div>
        <button type="button" onClick={() => { setHata(null); setDuzenlenen(null); setAltHedefId(''); setMudurluk(''); setAcik(true) }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Alt Program Hedefi Ekle
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-20 px-4 py-3 text-center">Sıra No</th>
              <th className="w-32 px-4 py-3 text-left">Kodu</th>
              <th className="px-4 py-3 text-left">Performans Hedefi</th>
              <th className="px-4 py-3 text-left">Müdürlük</th>
              <th className="w-36 px-4 py-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hedefler.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Henüz alt program hedefi yok.</td></tr>
            ) : hedefler.map((h, i) => (
              <tr key={h.id}>
                <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{h.kod}</td>
                <td className="px-4 py-3 text-slate-800">{h.ad}</td>
                <td className="px-4 py-3 text-slate-700">{h.mudurluk}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Link href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/faaliyetler/${faaliyetId}/hedef/${h.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50" title="Performans faaliyetleri">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </Link>
                    <button type="button" onClick={() => { setDuzenlenen(h); setAltHedefId(String(h.altHedefId)); setMudurluk(h.mudurluk); setHata(null); setAcik(true) }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" title="Düzenle">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <CopKutusuSilDugmesi onClick={() => silHedef(h)} disabled={bekliyor} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={gorunen != null} onClose={() => setGorunen(null)} title="Alt Program Hedefi" size="sm">
        {gorunen ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="text-slate-500">Kod</span> {gorunen.kod}</p>
            <p><span className="text-slate-500">Hedef</span> {gorunen.ad}</p>
            <p><span className="text-slate-500">Müdürlük</span> {gorunen.mudurluk}</p>
          </div>
        ) : null}
      </Modal>
      <Modal open={acik} onClose={() => setAcik(false)} title={duzenlenen ? 'Alt Program Hedefi Düzenle' : 'Alt Program Hedefi Ekle'} size="lg">
        <div className="space-y-3">
          <label className="block text-sm text-slate-700">Performans hedefi
            <select value={altHedefId} onChange={e => setAltHedefId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Seçin</option>
              {secenekler.map(s => <option key={s.id} value={s.id}>{s.etiket}</option>)}
            </select>
          </label>
          <label className="block text-sm text-slate-700">Müdürlük
            <select value={mudurluk} onChange={e => setMudurluk(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Seçin</option>
              {mudurlukler.map(m => <option key={m}>{m}</option>)}
            </select>
          </label>
          {hata ? <p className="text-sm text-red-700">{hata}</p> : null}
          <button type="button" onClick={kaydet} disabled={bekliyor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50">Kaydet</button>
        </div>
      </Modal>
    </div>
  )
}
