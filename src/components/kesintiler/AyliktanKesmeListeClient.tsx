'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import {
  CopKutusuSilDugmesi,
  GozDetayLink,
  IndirLink,
  KalemDuzenleLink,
  SaatGecmisDugmesi,
} from '@/components/ui/TabloIslemIkonlari'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import {
  ayliktanKesmeAuditDegerGoster,
  ayliktanKesmeAuditDiffSatirlari,
} from '@/lib/ayliktan-kesme-audit'
import type { Tables } from '@/types/database'

export interface AyliktanKesmeListeKayit {
  id: number
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  unvan: string
  payda: number
  toplam: number
  yarim_zamanli: boolean
}

interface Props {
  kayitlar: AyliktanKesmeListeKayit[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  canDelete?: boolean
  onSil?: (id: number) => Promise<{ hata?: string }>
}

export default function AyliktanKesmeListeClient({
  kayitlar,
  auditLoglarByRefId,
  canDelete = false,
  onSil,
}: Props) {
  const router = useRouter()
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSil(id: number) {
    if (!onSil) return
    if (!confirm('Bu bordro kaydı silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const r = await onSil(id)
      if (r.hata) alert(r.hata)
      else router.refresh()
    })
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">T.C. Kimlik No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Unvan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Oran</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Kesinti</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-44">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Henüz bordro oluşturulmadı.
                  </td>
                </tr>
              ) : (
                kayitlar.map((k, idx) => {
                  const refId = String(k.id)
                  const auditLoglar = auditLoglarByRefId[refId] ?? []
                  return (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-800">
                        <span className="font-medium">{k.ad_soyad}</span>
                        <span className="text-slate-500 font-mono text-xs ml-2">{k.sicil_no}</span>
                        {k.yarim_zamanli ? (
                          <span className="ml-2 text-xs text-amber-800">Yarım zamanlı</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.tckn || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{k.unvan || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{`1/${k.payda}`}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">{paraTr(Number(k.toplam))}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={auditLoglar.length}
                            onClick={() => setGecmisRefId(refId)}
                            title="İşlem geçmişi"
                          />
                          <GozDetayLink href={`/kesintiler/ayliktan-kesme/${k.id}`} title="Detay" />
                          <KalemDuzenleLink href={`/kesintiler/ayliktan-kesme/${k.id}/duzenle`} title="Düzenle" />
                          <IndirLink href={`/api/kesintiler/ayliktan-kesme/pdf?id=${k.id}`} title="PDF İndir" />
                          {canDelete && onSil ? (
                            <CopKutusuSilDugmesi
                              onClick={() => handleSil(k.id)}
                              disabled={isPending}
                              title="Sil"
                            />
                          ) : null}
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

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []}
        baslik="Aylıktan Kesme Bordrosu Geçmişi"
        diffSatirlari={ayliktanKesmeAuditDiffSatirlari}
        degerGoster={ayliktanKesmeAuditDegerGoster}
      />
    </>
  )
}
