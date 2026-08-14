'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import Modal from '@/components/ui/Modal'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { denetimKararBelgeYukle } from '@/app/(dashboard)/denetim/actions'
import { DENETIM_AYLAR_TR, type DenetimKararTuru } from '@/lib/denetim'
import {
  denetimKararAuditDegerGoster,
  denetimKararAuditDiffSatirlari,
} from '@/lib/denetim-audit'
import type { Tables } from '@/types/database'

export type DenetimKararAySatir = {
  ay: number
  belge_id: number | null
  sorumlu_birim: string | null
  dosya_adi: string | null
  created_by_email: string | null
  created_at: string | null
}

export type DenetimMudurlukSecenek = { id: number; mudurluk_adi: string }

interface Props {
  donemId: number
  donemAdi: string
  kararTuru: DenetimKararTuru
  baslik: string
  donemKapali: boolean
  satirlar: DenetimKararAySatir[]
  mudurlukler: DenetimMudurlukSecenek[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
}

const IKON =
  'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40'

export default function DenetimKararAylarClient({
  donemId,
  donemAdi,
  kararTuru,
  baslik,
  donemKapali,
  satirlar,
  mudurlukler,
  auditLoglarByRefId,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [yukleAy, setYukleAy] = useState<number | null>(null)
  const [sorumluBirim, setSorumluBirim] = useState('')
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)

  function yukleAc(ay: number, mevcutBirim: string | null) {
    setYukleAy(ay)
    setSorumluBirim(mevcutBirim ?? '')
    setHata(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function yukleKaydet() {
    if (yukleAy == null) return
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setHata('Dosya seçin.')
      return
    }
    setHata(null)
    const fd = new FormData()
    fd.set('donem_id', String(donemId))
    fd.set('ay', String(yukleAy))
    fd.set('karar_turu', kararTuru)
    fd.set('sorumlu_birim', sorumluBirim)
    fd.set('file', file)
    startTransition(async () => {
      const res = await denetimKararBelgeYukle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setYukleAy(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/denetim/donemler/${donemId}/karar-bilgileri`}
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Karar Bilgileri
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <p className="text-sm text-slate-600 mt-1">
          Dönem: <strong className="text-slate-800">{donemAdi}</strong>
          {donemKapali ? (
            <span className="ml-2 text-xs text-slate-500">(Kapalı — yükleme yapılamaz)</span>
          ) : null}
        </p>
      </div>

      {hata && !yukleAy && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{hata}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Ay Bilgisi</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Sorumlu Birim</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-36">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.map(s => {
                const logKey = s.belge_id != null ? String(s.belge_id) : ''
                const loglar = logKey ? auditLoglarByRefId[logKey] ?? [] : []
                return (
                  <tr key={s.ay} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{s.ay}</td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{DENETIM_AYLAR_TR[s.ay - 1]}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {s.sorumlu_birim || '—'}
                      {s.created_by_email ? (
                        <div className="text-[11px] text-slate-400 mt-0.5">{s.created_by_email}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <SaatGecmisDugmesi
                          sayi={loglar.length}
                          onClick={() => {
                            if (s.belge_id != null) setGecmisRefId(String(s.belge_id))
                          }}
                          title={s.belge_id ? 'Yükleme geçmişi' : 'Henüz belge yok'}
                        />
                        {s.belge_id != null ? (
                          <a
                            href={`/api/denetim/karar-belge?id=${s.belge_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`${IKON} text-indigo-600 hover:bg-indigo-50`}
                            title="Önizle"
                            aria-label="Önizle"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="11" cy="11" r="7" />
                              <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                            </svg>
                          </a>
                        ) : (
                          <span className={`${IKON} text-slate-300`} title="Belge yok" aria-hidden>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="11" cy="11" r="7" />
                              <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                            </svg>
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={isPending || donemKapali}
                          onClick={() => yukleAc(s.ay, s.sorumlu_birim)}
                          className={`${IKON} text-emerald-700 hover:bg-emerald-50`}
                          title={donemKapali ? 'Kapalı dönem' : s.belge_id ? 'Belgeyi değiştir' : 'Belge ekle'}
                          aria-label="Yükle"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={yukleAy != null}
        onClose={() => setYukleAy(null)}
        title={yukleAy != null ? `${DENETIM_AYLAR_TR[yukleAy - 1]} — Belge Yükle` : 'Belge Yükle'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sorumlu Birim</label>
            <select
              value={sorumluBirim}
              onChange={e => setSorumluBirim(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Dosya (PDF / Word / Excel)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,application/pdf"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </div>
          {hata && <p className="text-sm text-red-600">{hata}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setYukleAy(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={yukleKaydet}
              className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? 'Yükleniyor…' : 'Yükle'}
            </button>
          </div>
        </div>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []}
        baslik="Karar Belgesi Geçmişi"
        diffSatirlari={denetimKararAuditDiffSatirlari}
        degerGoster={denetimKararAuditDegerGoster}
      />
    </div>
  )
}
