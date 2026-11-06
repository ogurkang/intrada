'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import { CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'
import PpSatirSaat from '@/components/stratejik/PpSatirSaat'

export interface PpAltProgram {
  id: number
  sira_no: number | null
  kodu: string
  alt_program_adi: string
  gerekce: string | null
  aktif: boolean
  hedef_sayisi: number
}

interface Props {
  yil: number
  programId: number
  programAdi: string
  altProgramlar: PpAltProgram[]
  onEkle: (programId: number, yil: number, fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, programId: number, yil: number, fd: FormData) => Promise<{ hata?: string }>
  onSil: (id: number, programId: number, yil: number) => Promise<{ hata?: string }>
}

export default function PerformansProgramiAltProgramClient({
  yil,
  programId,
  programAdi,
  altProgramlar,
  onEkle,
  onGuncelle,
  onSil,
}: Props) {
  const router = useRouter()
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<PpAltProgram | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function sil(a: PpAltProgram) {
    if (a.hedef_sayisi > 0) {
      alert('Silmek istediğiniz başlığa bağlı veriler bulunmaktadır.')
      return
    }
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return
    startTransition(async () => {
      const res = await onSil(a.id, programId, yil)
      if (res.hata) alert(res.hata)
      else router.refresh()
    })
  }

  function kaydet(fd: FormData) {
    setHata(null)
    startTransition(async () => {
      const res = secili
        ? await onGuncelle(secili.id, programId, yil, fd)
        : await onEkle(programId, yil, fd)
      if (res.hata) setHata(res.hata)
      else {
        setFormAcik(false)
        setSecili(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{programAdi}</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Alt Program Ekle', metin: 'Bu programa alt program yazar. Gerekçe metni Excel’deki gerekçe alanına gider.' },
              { baslik: 'Göz', metin: 'Faaliyetler ekranını açar. Faaliyet Ekle ile faaliyet yazılır. Faaliyet satırındaki göz, alt program hedeflerine gider.' },
              { baslik: 'Kalem', metin: 'Alt programın kodunu, adını ve gerekçesini günceller. Bağlı hedefler durur.' },
              { baslik: 'Bilgi', metin: 'Alt programa bağlı performans hedefi sayısını gösterir.' },
            ]} />
          </div>
          <p className="text-sm text-slate-500 mt-1">Alt programları yönetebilirsiniz.</p>
        </div>
        <button
          type="button"
          onClick={() => window.open(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/yeni`, '_blank')}
          className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700"
        >
          Alt Program Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-center w-20">Sıra No</th>
              <th className="px-4 py-3 text-left w-32">Kodu</th>
              <th className="px-4 py-3 text-left">Alt Program Adı</th>
              <th className="px-4 py-3 text-left w-[260px]">Bilgi</th>
              <th className="px-4 py-3 text-center w-28">İşlemler</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {altProgramlar.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Alt program kaydı yok.</td></tr>
              ) : altProgramlar.map((a, i) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.kodu}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.alt_program_adi}</td>
                  <td className="px-4 py-3 text-slate-600">{a.hedef_sayisi} faaliyet bağlı.</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <a href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${a.id}/faaliyetler`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50" title="Faaliyetler">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </a>
                      <button onClick={() => { setSecili(a); setHata(null); setFormAcik(true) }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100" title="Düzenle">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <PpSatirSaat tablo="alt_program" kayitId={a.id} />
                      <CopKutusuSilDugmesi onClick={() => sil(a)} disabled={isPending} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formAcik} onClose={() => setFormAcik(false)} title={secili ? 'Alt Program Düzenle' : 'Alt Program Ekle'} size="lg">
        <form onSubmit={async e => { e.preventDefault(); await kaydet(new FormData(e.currentTarget)) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kodu *</label>
            <input name="kodu" required defaultValue={secili?.kodu ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Alt Program Adı *</label>
            <input name="alt_program_adi" required defaultValue={secili?.alt_program_adi ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Gerekçe ve Açıklamalar</label>
            <textarea name="gerekce" rows={5} defaultValue={secili?.gerekce ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1"><button type="button" onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">İptal</button><button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50">{isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
