'use client'

import { useState } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { GozDetayLink, IndirLink, KalemDuzenleLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { yzcAuditDegerGoster, yzcAuditDiffSatirlari } from '@/lib/yari-zamanli-calisma-audit'
import { yzcTarihGoster } from '@/lib/yari-zamanli-calisma-belge'
import type { Tables } from '@/types/database'

export interface YzcListeKayit {
  id: number
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  unvan: string
  mudurluk: string
  cocuk_dogum_tarihi: string
  yari_zamanli_baslangic_tarihi: string
  normal_zamanli_donus_tarihi: string
}

interface Props {
  kayitlar: YzcListeKayit[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
}

export default function YariZamanliCalismaListeClient({ kayitlar, auditLoglarByRefId }: Props) {
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Doğum Tarihi</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Yarı Zamanlı Dönem</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-44">İşlemler</th>
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
                        <div className="text-xs text-slate-500 mt-0.5">{k.unvan} · {k.mudurluk}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 tabular-nums text-xs">
                        {yzcTarihGoster(k.cocuk_dogum_tarihi)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 tabular-nums text-xs">
                        {yzcTarihGoster(k.yari_zamanli_baslangic_tarihi)} –{' '}
                        {yzcTarihGoster(k.normal_zamanli_donus_tarihi)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={auditLoglar.length}
                            onClick={() => setGecmisRefId(refId)}
                            title="İşlem geçmişi"
                          />
                          <GozDetayLink href={`/bildirim/yari-zamanli-calisma/${k.id}`} title="Detay" />
                          <KalemDuzenleLink href={`/bildirim/yari-zamanli-calisma/${k.id}/duzenle`} title="Düzenle" />
                          <IndirLink
                            href={`/api/bildirim/yari-zamanli-calisma/pdf?id=${k.id}`}
                            title="PDF İndir"
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
        baslik="Yarı Zamanlı Çalışma Talebi Geçmişi"
        diffSatirlari={yzcAuditDiffSatirlari}
        degerGoster={yzcAuditDegerGoster}
      />
    </>
  )
}
