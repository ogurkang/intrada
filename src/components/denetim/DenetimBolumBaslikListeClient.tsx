'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import DenetimBelgeGecmisPanel from '@/components/denetim/DenetimBelgeGecmisPanel'
import {
  denetimBolumBaslikEkle,
  denetimBolumBelgeYukle,
} from '@/app/(dashboard)/denetim/actions'
import {
  denetimBolumBelgeAuditDegerGoster,
  denetimBolumBelgeAuditDiffSatirlari,
} from '@/lib/denetim-audit'
import { DENETIM_BELGE_MAX_BOYUT, type DenetimBelgeBolumu } from '@/lib/denetim'
import type { DenetimGoruntulemeGrubu } from '@/lib/denetim-goruntuleme'
import type { Tables } from '@/types/database'

export type DenetimBolumBaslikSatir = {
  id: number
  baslik: string
  aciklama: string | null
  sira_no: number
  belge_id: number | null
  sorumlu_birim: string | null
  dosya_adi: string | null
  yukleyen: string | null
}

export type DenetimMudurlukSecenek = { id: number; mudurluk_adi: string }

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
  mudurlukler: DenetimMudurlukSecenek[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  goruntulemelerByRefId: Record<string, DenetimGoruntulemeGrubu[]>
}

const IKON =
  'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40'

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
  mudurlukler,
  auditLoglarByRefId,
  goruntulemelerByRefId,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [modalAcik, setModalAcik] = useState(false)
  const [baslik, setBaslik] = useState('')
  const [baslikAciklama, setBaslikAciklama] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [yukleSatir, setYukleSatir] = useState<DenetimBolumBaslikSatir | null>(null)
  const [sorumluBirim, setSorumluBirim] = useState('')
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
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

  function yukleAc(satir: DenetimBolumBaslikSatir) {
    setYukleSatir(satir)
    setSorumluBirim(satir.sorumlu_birim ?? '')
    setHata(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function yukleKaydet() {
    if (!yukleSatir) return
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
    fd.set('baslik_id', String(yukleSatir.id))
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
        setYukleSatir(null)
        router.refresh()
      } catch {
        setHata('Belge yüklenemedi. Dosya boyutunu kontrol edip tekrar deneyin.')
      }
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

      {hata && !modalAcik && !yukleSatir ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{hata}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-20 px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Başlık</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Sorumlu Birim</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Belge Durumu</th>
                <th className="w-36 px-3 py-3 text-center font-semibold text-slate-700">İşlem</th>
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
                basliklar.map((item, i) => {
                  const logKey = item.belge_id != null ? String(item.belge_id) : ''
                  const loglar = logKey ? auditLoglarByRefId[logKey] ?? [] : []
                  const goruntulemeler = logKey ? goruntulemelerByRefId[logKey] ?? [] : []
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-3 text-center tabular-nums text-slate-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{item.baslik}</span>
                        {item.aciklama ? (
                          <span className="mt-0.5 block text-xs text-slate-500">{item.aciklama}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.sorumlu_birim || '—'}
                        {item.yukleyen ? (
                          <span className="mt-0.5 block text-[11px] text-slate-400">{item.yukleyen}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            item.belge_id != null
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                          title={item.dosya_adi ?? undefined}
                        >
                          {item.belge_id != null ? 'Belge yüklendi' : 'Belge bekleniyor'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={loglar.length + goruntulemeler.reduce((n, g) => n + g.tarihler.length, 0)}
                            onClick={() => {
                              if (logKey) setGecmisRefId(logKey)
                            }}
                            title={logKey ? 'İşlem ve görüntüleme geçmişi' : 'Henüz belge yok'}
                          />
                          {item.belge_id != null ? (
                            <a
                              href={`/denetim/onizle?tur=bolum&id=${item.belge_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`${IKON} text-indigo-600 hover:bg-indigo-50`}
                              title="Önizle"
                              aria-label="Önizle"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="11" cy="11" r="7" />
                                <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                              </svg>
                            </a>
                          ) : (
                            <span className={`${IKON} text-slate-300`} title="Belge yok" aria-hidden>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="11" cy="11" r="7" />
                                <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                              </svg>
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={donemKapali || isPending}
                            onClick={() => yukleAc(item)}
                            className={`${IKON} text-emerald-700 hover:bg-emerald-50`}
                            title={
                              donemKapali ? 'Kapalı dönem' : item.belge_id != null ? 'Belgeyi değiştir' : 'Belge ekle'
                            }
                            aria-label="Yükle"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
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

      <Modal
        open={yukleSatir != null}
        onClose={() => setYukleSatir(null)}
        title={yukleSatir ? `${yukleSatir.baslik} — Belge Yükle` : 'Belge Yükle'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim</label>
            <select
              value={sorumluBirim}
              onChange={e => setSorumluBirim(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Seçiniz</option>
              {mudurlukler.map(m => (
                <option key={m.id} value={m.mudurluk_adi}>
                  {m.mudurluk_adi}
                </option>
              ))}
              {sorumluBirim && !mudurlukler.some(m => m.mudurluk_adi === sorumluBirim) ? (
                <option value={sorumluBirim}>{sorumluBirim} (pasif / eski)</option>
              ) : null}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dosya (PDF / Word / Excel)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,application/pdf"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setYukleSatir(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={yukleKaydet}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? 'Yükleniyor…' : 'Yükle'}
            </button>
          </div>
        </div>
      </Modal>

      <DenetimBelgeGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []}
        goruntulemeler={gecmisRefId ? goruntulemelerByRefId[gecmisRefId] ?? [] : []}
        baslik={`${altBolumLabel} — Belge Geçmişi`}
        diffSatirlari={denetimBolumBelgeAuditDiffSatirlari}
        degerGoster={denetimBolumBelgeAuditDegerGoster}
      />
    </div>
  )
}
