'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { denetimBolumBaslikEkle } from '@/app/(dashboard)/denetim/actions'
import type { DenetimBelgeBolumu } from '@/lib/denetim'

export type DenetimBolumBaslikSatir = {
  id: number
  baslik: string
  aciklama: string | null
  sira_no: number
  belgeVar: boolean
  yukleyen: string | null
}

interface Props {
  donemId: number
  donemAdi: string
  bolum: DenetimBelgeBolumu
  bolumLabel: string
  bolumHref: string
  altBolum: string
  altBolumLabel: string
  aciklama: string
  donemKapali: boolean
  basliklar: DenetimBolumBaslikSatir[]
}

export default function DenetimBolumBaslikListeClient({
  donemId,
  donemAdi,
  bolum,
  bolumLabel,
  bolumHref,
  altBolum,
  altBolumLabel,
  aciklama,
  donemKapali,
  basliklar,
}: Props) {
  const router = useRouter()
  const [modalAcik, setModalAcik] = useState(false)
  const [baslik, setBaslik] = useState('')
  const [baslikAciklama, setBaslikAciklama] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function kaydet() {
    const fd = new FormData()
    fd.set('donem_id', String(donemId))
    fd.set('bolum', bolum)
    fd.set('alt_bolum', altBolum)
    fd.set('baslik', baslik)
    fd.set('aciklama', baslikAciklama)
    setHata(null)
    startTransition(async () => {
      const res = await denetimBolumBaslikEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setModalAcik(false)
      setBaslik('')
      setBaslikAciklama('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={bolumHref} className="mb-2 inline-flex text-sm text-slate-500 hover:text-slate-700">
            ← {bolumLabel}
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{altBolumLabel}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {donemAdi} · {aciklama}
          </p>
        </div>
        <button
          type="button"
          disabled={donemKapali || isPending}
          onClick={() => {
            setHata(null)
            setModalAcik(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          title={donemKapali ? 'Kapalı döneme başlık eklenemez' : 'Yeni başlık ekle'}
        >
          <span className="text-lg leading-none">+</span>
          Başlık Ekle
        </button>
      </div>

      {donemKapali ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Dönem kapalıdır; belgeler görüntülenebilir ancak başlık veya belge eklenemez.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-20 px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Başlık</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Belge Durumu</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Yükleyen</th>
                <th className="w-28 px-3 py-3 text-center font-semibold text-slate-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {basliklar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Bu menüde henüz başlık yok. “Başlık Ekle” ile oluşturabilirsiniz.
                  </td>
                </tr>
              ) : (
                basliklar.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3 text-center tabular-nums text-slate-600">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{item.baslik}</span>
                      {item.aciklama ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{item.aciklama}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          item.belgeVar ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.belgeVar ? 'Belge yüklendi' : 'Belge bekleniyor'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.yukleyen ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        <Link
                          href={`/denetim/donemler/${donemId}/basliklar/${item.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                          title="Aç"
                          aria-label="Aç"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title={`${altBolumLabel} — Başlık Ekle`} size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
            <input
              value={baslik}
              onChange={e => setBaslik(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (isteğe bağlı)</label>
            <textarea
              value={baslikAciklama}
              onChange={e => setBaslikAciklama(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalAcik(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={kaydet} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
