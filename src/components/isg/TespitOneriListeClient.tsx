'use client'

import { useState } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { GozDetayLink, KalemDuzenleLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { IsgYonlendiriciDugme } from '@/components/isg/IsgYonlendiriciDugme'
import { isgDurumEtiket, tespitOneriTarihGoster } from '@/lib/isg-tespit-oneri'
import type { Tables } from '@/types/database'

export type TespitOneriListeSatir = {
  id: number
  sira_no: number
  tespit_oneri: string
  durum: string
  son_tarih: string
  isyeri_unvani: string
  sorumlu_mudurluk: string
}

type Props = {
  satirlar: TespitOneriListeSatir[]
  hata?: string | null
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

export default function TespitOneriListeClient({
  satirlar,
  hata = null,
  auditLoglarByRefId = {},
}: Props) {
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Tespit ve Öneri</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            İşyeri tespitleri, sorumlu müdürlük ve son tarih takibi
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <IsgYonlendiriciDugme href="/isg/islemler">← İşlemler</IsgYonlendiriciDugme>
          <IsgYonlendiriciDugme href="/isg/islemler/tespit-oneri/yeni">
            Tespit/Öneri Ekle
          </IsgYonlendiriciDugme>
        </div>
      </div>

      {hata ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Veri yüklenirken hata: {hata}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-24 px-4 py-3 text-left font-semibold text-slate-600">Sıra No</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">İş Yeri Unvanı</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Açıklama</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Sorumlu Müdürlük</th>
              <th className="w-40 px-4 py-3 text-left font-semibold text-slate-600">Durum</th>
              <th className="w-32 px-4 py-3 text-left font-semibold text-slate-600">Son Tarih</th>
              <th className="w-36 px-4 py-3 text-center font-semibold text-slate-600">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400">
                  Henüz tespit/öneri kaydı yok.
                </td>
              </tr>
            ) : null}
            {satirlar.map(row => (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sira_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.isyeri_unvani}</td>
                <td className="max-w-md px-4 py-3 text-slate-600">
                  <p className="line-clamp-2">{row.tespit_oneri}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.sorumlu_mudurluk}</td>
                <td className="px-4 py-3 text-slate-700">{isgDurumEtiket(row.durum)}</td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600">
                  {tespitOneriTarihGoster(row.son_tarih)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <SaatGecmisDugmesi
                      sayi={(auditLoglarByRefId[String(row.id)] ?? []).length}
                      onClick={() => setGecmisRefId(String(row.id))}
                      title="İşlem geçmişi"
                    />
                    <KalemDuzenleLink href={`/isg/islemler/tespit-oneri/${row.id}/duzenle`} title="Düzenle" />
                    <GozDetayLink href={`/isg/islemler/tespit-oneri/${row.id}`} title="Detay" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Tespit/Öneri — İşlem Geçmişi"
      />
    </div>
  )
}
