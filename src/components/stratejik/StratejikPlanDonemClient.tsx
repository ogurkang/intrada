'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'

export interface SpDonem {
  id: number
  donem_adi: string
  baslangic_tarihi: string
  bitis_tarihi: string
  aktif: boolean
}

interface Props {
  donemler: SpDonem[]
  onEkle: (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onAktifPasif: (id: number, aktif: boolean) => Promise<{ hata?: string }>
}

function tarihAralik(baslangic: string, bitis: string) {
  const b = new Date(baslangic).toLocaleDateString('tr-TR')
  const s = new Date(bitis).toLocaleDateString('tr-TR')
  return `${b} - ${s}`
}

export default function StratejikPlanDonemClient({ donemler, onEkle, onGuncelle, onAktifPasif }: Props) {
  const router = useRouter()
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<SpDonem | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniDonem() {
    setSecili(null)
    setHata(null)
    setFormAcik(true)
  }

  function duzenle(d: SpDonem) {
    setSecili(d)
    setHata(null)
    setFormAcik(true)
  }

  function submit(fd: FormData) {
    setHata(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else {
        setFormAcik(false)
        setSecili(null)
        router.refresh()
      }
    })
  }

  function aktifPasifDegistir(d: SpDonem) {
    const hedef = !d.aktif
    const onay = hedef ? 'Bu dönem aktif yapılsın mı?' : 'Bu dönem pasif yapılsın mı?'
    if (!confirm(onay)) return
    startTransition(async () => {
      const res = await onAktifPasif(d.id, hedef)
      if (res.hata) alert(res.hata)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stratejik Plan İşlemler</h1>
          <p className="text-sm text-slate-500 mt-1">Dönem ekleyip dönem içindeki amaçları yönetebilirsiniz.</p>
        </div>
        <button
          onClick={yeniDonem}
          className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Dönem Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center w-20">Sıra No</th>
                <th className="px-4 py-3 text-left">Dönem Adı</th>
                <th className="px-4 py-3 text-left">Dönem Aralığı</th>
                <th className="px-4 py-3 text-center w-56">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donemler.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Kayıtlı dönem bulunamadı.
                  </td>
                </tr>
              ) : (
                donemler.map((d, i) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.donem_adi}</td>
                    <td className="px-4 py-3 text-slate-600">{tarihAralik(d.baslangic_tarihi, d.bitis_tarihi)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/stratejik-yonetim/stratejik-plan/islemler/${d.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Detay"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/stratejik-yonetim/stratejik-plan/islemler/${d.id}/veri-giris`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Veri Giriş"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6m3 6V7m3 10v-3m5 6H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => duzenle(d)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Düzenle"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => aktifPasifDegistir(d)}
                          disabled={isPending}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40 ${
                            d.aktif ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={d.aktif ? 'Pasif Yap' : 'Aktif Yap'}
                        >
                          {d.aktif ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formAcik} onClose={() => setFormAcik(false)} title={secili ? 'Dönem Düzenle' : 'Dönem Ekle'} size="sm">
        <form
          onSubmit={async e => {
            e.preventDefault()
            await submit(new FormData(e.currentTarget))
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Adı *</label>
            <input
              name="donem_adi"
              defaultValue={secili?.donem_adi ?? ''}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Başlangıç *</label>
              <input
                name="baslangic_tarihi"
                type="date"
                defaultValue={secili?.baslangic_tarihi ?? ''}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bitiş *</label>
              <input
                name="bitis_tarihi"
                type="date"
                defaultValue={secili?.bitis_tarihi ?? ''}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">
              İptal
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

