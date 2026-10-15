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
import { EvrakImzaAlanlari, pdfImzaSorgu } from '@/components/hesaplama/EvrakImzaSecimi'
import type { IkImzaPersonel } from '@/lib/ik-imza-personel'
import {
  emeklilikAuditDegerGoster,
  emeklilikAuditDiffSatirlari,
} from '@/lib/emeklilik-tazminati-hesap'
import { olumAuditDegerGoster, olumAuditDiffSatirlari } from '@/lib/olum-yardimi-hesap'
import type { Tables } from '@/types/database'

export type HesaplamaListeSatir = {
  id: number
  ad_soyad: string
  sicil_no: string
  tckn: string | null
  orta: string
  tutar: number
}

export default function HesaplamaKayitListe({
  kayitlar,
  ortaBaslik,
  tutarBaslik,
  bosMetin,
  detayKok,
  pdfKok,
  gecmisBaslik,
  auditLoglarByRefId,
  tur,
  canDelete,
  onSil,
  imzaPersonel = [],
}: {
  kayitlar: HesaplamaListeSatir[]
  ortaBaslik: string
  tutarBaslik: string
  bosMetin: string
  detayKok: string
  pdfKok: string
  gecmisBaslik: string
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  tur: 'emeklilik' | 'olum'
  canDelete?: boolean
  onSil?: (id: number) => Promise<{ hata?: string }>
  imzaPersonel?: IkImzaPersonel[]
}) {
  const [duzenleyen, setDuzenleyen] = useState('')
  const [gorevli, setGorevli] = useState('')
  const diffSatirlari = tur === 'emeklilik' ? emeklilikAuditDiffSatirlari : olumAuditDiffSatirlari
  const degerGoster = tur === 'emeklilik' ? emeklilikAuditDegerGoster : olumAuditDegerGoster
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
      <EvrakImzaAlanlari
        personel={imzaPersonel}
        duzenleyen={duzenleyen}
        gorevli={gorevli}
        onDuzenleyen={setDuzenleyen}
        onGorevli={setGorevli}
      />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[880px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">T.C. Kimlik No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">{ortaBaslik}</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">{tutarBaslik}</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-44">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">{bosMetin}</td>
                </tr>
              ) : kayitlar.map((k, idx) => {
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
                    <td className="px-4 py-3 text-slate-700">{k.orta}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{paraTr(k.tutar)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <SaatGecmisDugmesi sayi={auditLoglar.length} onClick={() => setGecmisRefId(refId)} title="İşlem geçmişi" />
                        <GozDetayLink href={`${detayKok}/${k.id}`} title="Önizleme" />
                        <KalemDuzenleLink href={`${detayKok}/${k.id}/duzenle`} title="Düzenle" />
                        <IndirLink href={`${pdfKok}?id=${k.id}${pdfImzaSorgu(duzenleyen, gorevli)}`} title="PDF İndir" />
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
      </div>
      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []}
        baslik={gecmisBaslik}
        diffSatirlari={diffSatirlari}
        degerGoster={degerGoster}
      />
    </>
  )
}
