'use client'

import { useState } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { GozDetayLink, IndirLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import {
  sendikaIstifaAuditDegerGoster,
  sendikaIstifaAuditDiffSatirlari,
} from '@/lib/sendika-istifa-audit'
import type { Tables } from '@/types/database'

export interface SendikaIstifaListeKayit {
  id: number
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  sendika_adi: string
}

interface Props {
  kayitlar: SendikaIstifaListeKayit[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
}

export default function SendikaIstifaListeClient({ kayitlar, auditLoglarByRefId }: Props) {
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">T.C. Kimlik No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Sendika Adı</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-36">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Henüz bildirim oluşturulmadı.
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
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.tckn || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[240px] truncate" title={k.sendika_adi}>
                        {k.sendika_adi}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={auditLoglar.length}
                            onClick={() => setGecmisRefId(refId)}
                            title="İşlem geçmişi"
                          />
                          <GozDetayLink href={`/bildirim/sendika-istifa/${k.id}`} title="Detay" />
                          <IndirLink
                            href={`/api/bildirim/sendika-istifa/word?id=${k.id}`}
                            title="Word İndir"
                          />
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
        baslik="Sendika İstifa Bildirimi Geçmişi"
        diffSatirlari={sendikaIstifaAuditDiffSatirlari}
        degerGoster={sendikaIstifaAuditDegerGoster}
      />
    </>
  )
}
