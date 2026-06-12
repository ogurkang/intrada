'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardAnaSayfaLink from '@/components/ui/DashboardAnaSayfaLink'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { CopKutusuSilDugmesi, KalemDuzenleLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { aileAuditDegerGoster, aileAuditDiffSatirlari } from '@/lib/aile-audit'
import type { Tables } from '@/types/database'

export interface Cocuk {
  ad_soyad:      string
  tckn?:         string
  dogum_tarihi?: string
  cinsiyet?:     string
  baba_adi?:     string
  ana_adi?:      string
}

export interface AileBilgisi {
  id:            number
  sicil_no:      string
  ad_soyad?:     string | null
  medeni_hal:    string | null
  esin_ad_soyad: string | null
  esin_tckn:     string | null
  is_durumu:     string | null
  gelir_durumu:  string | null
  cocuklar_json: Cocuk[]
  kayit_zamani:  string
}

interface Props {
  kayitlar: AileBilgisi[]
  onSil:    (id: number) => Promise<{ hata?: string }>
  /** Kullanıcı: tabloda sil yok */
  kullaniciModu?: boolean
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

export default function AileClient({ kayitlar, onSil, kullaniciModu = false, auditLoglarByRefId = {} }: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    return kayitlar.filter(k =>
      !q ||
      (k.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
      k.sicil_no.toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [kayitlar, arama])

  function handleSil(id: number) {
    if (!confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const r = await onSil(id)
      if (r.hata) alert(r.hata)
      else router.refresh()
    })
  }

  function yeniSekmedeAc() {
    window.open('/bildirim/aile/yeni', '_blank')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aile Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Medeni hal, eş ve çocuk bilgileri</p>
        </div>
        <div className="flex items-center gap-2">
          {kullaniciModu && <DashboardAnaSayfaLink />}
          <button type="button" onClick={yeniSekmedeAc}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kayıt
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad veya sicil no ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Medeni Hal</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Eş Adı</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Çocuk</th>
              {!kullaniciModu && (
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={kullaniciModu ? 6 : 7} className="text-center py-14 text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {filtreli.map((k, idx) => {
              const refId = k.sicil_no
              const auditLoglar = auditLoglarByRefId[refId] ?? []
              return (
              <tr
                key={k.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/bildirim/aile/${k.id}`)}
              >
                <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{k.sicil_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{k.ad_soyad ?? '—'}</td>
                <td className="px-4 py-3">
                  {k.medeni_hal ? (
                    <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                      {k.medeni_hal}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{k.esin_ad_soyad ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    (k.cocuklar_json?.length ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {k.cocuklar_json?.length ?? 0}
                  </span>
                </td>
                {!kullaniciModu && (
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <SaatGecmisDugmesi
                      sayi={auditLoglar.length}
                      onClick={() => setGecmisRefId(refId)}
                      title="Aile bildirimi değişiklik geçmişi"
                    />
                    <KalemDuzenleLink
                      href={`/bildirim/aile/${k.id}/duzenle`}
                      title="Düzenle"
                      onClick={e => e.stopPropagation()}
                    />
                    <CopKutusuSilDugmesi
                      onClick={() => handleSil(k.id)}
                      disabled={isPending}
                      title="Sil"
                    />
                  </div>
                </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Aile Bildirimi Geçmişi"
        diffSatirlari={aileAuditDiffSatirlari}
        degerGoster={aileAuditDegerGoster}
      />
    </div>
  )
}
