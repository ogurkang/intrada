'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { CopKutusuSilDugmesi, GozDetayLink, KalemDuzenleLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import { kisiBorcuAuditDegerGoster, kisiBorcuAuditDiffSatirlari } from '@/lib/kisi-borcu'
import type { Tables } from '@/types/database'

export type KisiBorcuListeSatir = {
  id: number
  ad_soyad: string
  sicil_no: string
  tckn: string | null
  faiz: string
  tutar: number
}

export default function KisiBorcuListe({
  kayitlar,
  auditLoglarByRefId,
  canDelete,
  onSil,
}: {
  kayitlar: KisiBorcuListeSatir[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  canDelete?: boolean
  onSil?: (id: number) => Promise<{ hata?: string }>
}) {
  const router = useRouter()
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSil(id: number) {
    if (!onSil) return
    if (!confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const r = await onSil(id)
      if (r.hata) alert(r.hata)
      else router.refresh()
    })
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-20 px-4 py-3 text-left font-semibold text-slate-700">Sıra No</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Adı Soyadı</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">T.C. Kimlik No</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Faiz</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Toplam ödeme</th>
              <th className="w-36 px-4 py-3 text-center font-semibold text-slate-700">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {kayitlar.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Henüz kişi borcu formu oluşturulmadı.</td>
              </tr>
            ) : kayitlar.map((k, idx) => {
              const refId = String(k.id)
              const auditLoglar = auditLoglarByRefId[refId] ?? []
              return (
                <tr key={k.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 tabular-nums text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-800">
                    <span className="font-medium">{k.ad_soyad}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{k.sicil_no}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.tckn || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{k.faiz}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">{paraTr(k.tutar)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <SaatGecmisDugmesi sayi={auditLoglar.length} onClick={() => setGecmisRefId(refId)} title="İşlem geçmişi" />
                      <GozDetayLink href={`/hesaplama/kisi-borcu/${k.id}`} title="Önizleme" />
                      <KalemDuzenleLink href={`/hesaplama/kisi-borcu/${k.id}/duzenle`} title="Düzenle" />
                      {canDelete && onSil ? (
                        <CopKutusuSilDugmesi onClick={() => handleSil(k.id)} disabled={isPending} title="Sil" />
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []}
        baslik="Kişi Borcu Geçmişi"
        diffSatirlari={kisiBorcuAuditDiffSatirlari}
        degerGoster={kisiBorcuAuditDegerGoster}
      />
    </>
  )
}
