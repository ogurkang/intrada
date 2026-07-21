'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import IzinGecmisPanel from '@/components/izin/IzinGecmisPanel'

function tarihFormatla(t: string | null | undefined) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function Alan({ etiket, deger, tam }: { etiket: string; deger?: string | null; tam?: boolean }) {
  return (
    <div className={tam ? 'col-span-full' : ''}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{etiket}</label>
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 min-h-[36px] whitespace-pre-wrap">
        {deger || <span className="text-slate-400 italic">—</span>}
      </div>
    </div>
  )
}

const DURUM_RENK: Record<string, string> = {
  Onaylandı: 'bg-green-100 text-green-700',
  Taslak: 'bg-slate-100 text-slate-600',
  Değiştirildi: 'bg-amber-100 text-amber-700',
  'İptal Edildi': 'bg-red-100 text-red-600',
}

interface Props {
  h: Tables<'izin_hareketleri'>
  adSoyad?: string | null
  listeyeYil: number
  duzenleHref?: string
  auditLoglar?: Tables<'personel_audit_log'>[]
}

/** İzin hareketi görüntüleme ( `/izin/[id]` ve `/link/...` ortak ) */
export default function IzinHareketDetayView({
  h,
  adSoyad,
  listeyeYil,
  duzenleHref,
  auditLoglar = [],
}: Props) {
  const [gecmisAcik, setGecmisAcik] = useState(false)
  const editLink = duzenleHref ?? `/izin/${h.id}/duzenle`
  const siraEtiket = h.sira_no ? `${h.yil}/${h.sira_no}` : '—'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">İzin Hareketi - Görüntüle</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGecmisAcik(true)}
            className="relative flex items-center justify-center border border-slate-300 text-slate-600 p-2 rounded-lg hover:bg-slate-50 hover:text-amber-600 transition-colors"
            title="Değişiklik geçmişi"
            aria-label="Değişiklik geçmişi">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75"
              />
            </svg>
            {auditLoglar.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-[1.1rem] h-[1.1rem] px-1 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-medium">
                {auditLoglar.length}
              </span>
            )}
          </button>
          <Link
            href={editLink}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            Değiştir
          </Link>
          <Link
            href={`/izin?yil=${listeyeYil}`}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ← Listeye Dön
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-4 gap-4">
          <Alan etiket="Sıra No" deger={siraEtiket} />
          <Alan etiket="İşlem Yapan" deger={h.islem_yapan} />
          <Alan etiket="Sicil No" deger={h.sicil_no} />
          <Alan etiket="Adı Soyadı" deger={adSoyad} />
          <Alan etiket="Tür" deger={h.tur} />
          <Alan etiket="Ayrılış" deger={tarihFormatla(h.ayrilis)} />
          <Alan etiket="Başlama" deger={tarihFormatla(h.baslama)} />
          <Alan etiket="Gün" deger={String(h.gun)} />
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
            <div className="px-3 py-2 min-h-[36px] flex items-center">
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${DURUM_RENK[h.durum] ?? 'bg-slate-100 text-slate-600'}`}>
                {h.durum}
              </span>
            </div>
          </div>
          <Alan etiket="Vekalet" deger={h.vekalet} />
          <Alan etiket="Açıklama" deger={h.aciklama} tam />
          <Alan etiket="Bilgi" deger={h.bilgi} tam />
        </div>
      </div>

      <IzinGecmisPanel
        acik={gecmisAcik}
        onKapat={() => setGecmisAcik(false)}
        auditLoglar={auditLoglar}
        baslik={`İzin Geçmişi — ${siraEtiket}${adSoyad ? ` · ${adSoyad}` : ''}`}
      />
    </div>
  )
}
