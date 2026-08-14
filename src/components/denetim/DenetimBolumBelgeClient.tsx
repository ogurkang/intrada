'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import DenetimBelgeGecmisPanel from '@/components/denetim/DenetimBelgeGecmisPanel'
import { denetimBolumBelgeYukle } from '@/app/(dashboard)/denetim/actions'
import { DENETIM_BELGE_MAX_BOYUT } from '@/lib/denetim'
import {
  denetimBolumBelgeAuditDegerGoster,
  denetimBolumBelgeAuditDiffSatirlari,
} from '@/lib/denetim-audit'
import type { DenetimGoruntulemeGrubu } from '@/lib/denetim-goruntuleme'
import type { Tables } from '@/types/database'

type Mudurluk = { id: number; mudurluk_adi: string }
type Belge = {
  id: number
  sorumlu_birim: string | null
  dosya_adi: string
  created_by_email: string | null
  updated_at: string
}

interface Props {
  donemAdi: string
  geriHref: string
  geriLabel: string
  baslikId: number
  baslik: string
  aciklama: string | null
  donemKapali: boolean
  belge: Belge | null
  mudurlukler: Mudurluk[]
  auditLoglar: Tables<'personel_audit_log'>[]
  goruntulemeler: DenetimGoruntulemeGrubu[]
}

export default function DenetimBolumBelgeClient({
  donemAdi,
  geriHref,
  geriLabel,
  baslikId,
  baslik,
  aciklama,
  donemKapali,
  belge,
  mudurlukler,
  auditLoglar,
  goruntulemeler,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [modalAcik, setModalAcik] = useState(false)
  const [gecmisAcik, setGecmisAcik] = useState(false)
  const [sorumluBirim, setSorumluBirim] = useState(belge?.sorumlu_birim ?? '')
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function kaydet() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setHata('Dosya seçin.')
      return
    }
    if (file.size > DENETIM_BELGE_MAX_BOYUT) {
      setHata('Dosya en fazla 15 MB olabilir.')
      return
    }
    const fd = new FormData()
    fd.set('baslik_id', String(baslikId))
    fd.set('sorumlu_birim', sorumluBirim)
    fd.set('file', file)
    setHata(null)
    startTransition(async () => {
      try {
        const res = await denetimBolumBelgeYukle(fd)
        if (res.hata) {
          setHata(res.hata)
          return
        }
        setModalAcik(false)
        router.refresh()
      } catch {
        setHata('Belge yüklenemedi. Dosya boyutunu kontrol edip tekrar deneyin.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={geriHref} className="mb-2 inline-flex text-sm text-slate-500 hover:text-slate-700">
          ← {geriLabel}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {donemAdi}{aciklama ? ` · ${aciklama}` : ''}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Belge</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Sorumlu Birim</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Yükleyen</th>
              <th className="w-40 px-4 py-3 text-center font-semibold text-slate-700">İşlem</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-4 font-medium text-slate-800">{belge?.dosya_adi ?? 'Henüz belge yüklenmedi'}</td>
              <td className="px-4 py-4 text-slate-600">{belge?.sorumlu_birim ?? '—'}</td>
              <td className="px-4 py-4 text-slate-600">{belge?.created_by_email ?? '—'}</td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-center gap-1">
                  <SaatGecmisDugmesi
                    sayi={auditLoglar.length + goruntulemeler.reduce((n, g) => n + g.tarihler.length, 0)}
                    onClick={() => setGecmisAcik(true)}
                    title="İşlem ve görüntüleme geçmişi"
                  />
                  {belge ? (
                    <Link
                      href={`/denetim/onizle?tur=bolum&id=${belge.id}`}
                      target="_blank"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-700 hover:bg-indigo-50"
                      title="Yalnızca görüntüle"
                      aria-label="Yalnızca görüntüle"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="7" />
                        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                      </svg>
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={donemKapali || isPending}
                    onClick={() => {
                      setHata(null)
                      setModalAcik(true)
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                    title={donemKapali ? 'Kapalı dönem' : belge ? 'Belgeyi değiştir' : 'Belge yükle'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title={`${baslik} — Belge Yükle`} size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim</label>
            <select
              value={sorumluBirim}
              onChange={e => setSorumluBirim(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Seçiniz</option>
              {mudurlukler.map(m => <option key={m.id} value={m.mudurluk_adi}>{m.mudurluk_adi}</option>)}
              {sorumluBirim && !mudurlukler.some(m => m.mudurluk_adi === sorumluBirim) ? (
                <option value={sorumluBirim}>{sorumluBirim} (pasif / eski)</option>
              ) : null}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dosya (PDF / Word / Excel)</label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,application/pdf" className="block w-full text-sm" />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalAcik(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">İptal</button>
            <button type="button" disabled={isPending} onClick={kaydet} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Yükleniyor…' : 'Yükle'}
            </button>
          </div>
        </div>
      </Modal>

      <DenetimBelgeGecmisPanel
        acik={gecmisAcik}
        onKapat={() => setGecmisAcik(false)}
        auditLoglar={auditLoglar}
        goruntulemeler={goruntulemeler}
        baslik={`${baslik} — Geçmiş`}
        diffSatirlari={denetimBolumBelgeAuditDiffSatirlari}
        degerGoster={denetimBolumBelgeAuditDegerGoster}
      />
    </div>
  )
}
