'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import KadroGecmisPanel from '@/components/kadro/KadroGecmisPanel'

type Kadro = Tables<'kadro_hareketleri'>

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function Alan({ etiket, deger }: { etiket: string; deger?: string | null }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{etiket}</label>
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 min-h-[36px]">
        {deger || <span className="text-slate-400 italic">—</span>}
      </div>
    </div>
  )
}

const DURUM_RENK: Record<string, string> = {
  Dolu:  'bg-green-100 text-green-700',
  Vekil: 'bg-amber-100 text-amber-700',
  Boş:   'bg-slate-100 text-slate-500',
  İptal: 'bg-black text-white',
}

interface Props {
  row: Kadro
  adMap: Record<string, string>
  personeller?: { sicil_no: string; ad_soyad: string }[]
  statuler?: string[]
  mudurluler?: string[]
  unvanlar?: { id: number; unvan_adi: string; sinif_adi: string | null }[]
  gelisNedenleri?: string[]
  ayrilisNedenleri?: string[]
  auditLoglar?: Tables<'personel_audit_log'>[]
  onGuncelle?: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

export default function KadroDetayClient({
  row, adMap, auditLoglar = [],
}: Props) {
  const [gecmisAcik, setGecmisAcik] = useState(false)
  const kadroBaslik =
    [row.kadro_sira_no, row.kadro_unvani ?? row.gorev_unvani]
      .filter(Boolean)
      .join(' – ') || `#${row.id}`
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Kadro — {kadroBaslik}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {row.statu && <span className="mr-2">{row.statu}</span>}
            {row.durumu && (
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${DURUM_RENK[row.durumu] ?? ''}`}>
                {row.durumu}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGecmisAcik(true)}
            className="relative flex items-center justify-center border border-slate-300 text-slate-600 p-2 rounded-lg hover:bg-slate-50 hover:text-amber-600 transition-colors"
            title="Değişiklik geçmişi"
            aria-label="Değişiklik geçmişi"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75" />
            </svg>
            {auditLoglar.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-[1.1rem] h-[1.1rem] px-1 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-medium">
                {auditLoglar.length}
              </span>
            )}
          </button>
          <Link
            href={`/kadro/${row.id}/duzenle`}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            Değiştir
          </Link>
          <Link href="/kadro"
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ← Listeye Dön
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Meclis Kararı</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Alan etiket="Kadro Sıra No" deger={row.kadro_sira_no} />
              <Alan etiket="Karar No" deger={row.meclis_karar_no} />
              <Alan etiket="Karar Tarihi" deger={tarih(row.meclis_karar_tarihi)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Kadro & Görev</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Alan etiket="Statü" deger={row.statu} />
              <Alan etiket="Kadro Derecesi" deger={row.kadro_derecesi} />
              <Alan etiket="Kadro Ünvanı" deger={row.kadro_unvani} />
              <Alan etiket="Kadro Müdürlüğü" deger={row.kadro_mudurlugu} />
              <Alan etiket="Görev Ünvanı" deger={row.gorev_unvani} />
              <Alan etiket="Görev Müdürlüğü" deger={row.gorev_mudurlugu} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Personel</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Alan etiket="Asil" deger={row.asil ? (adMap[row.asil] ?? row.asil) : null} />
              <Alan etiket="Vekil" deger={row.vekil ? (adMap[row.vekil] ?? row.vekil) : null} />
              <Alan etiket="Geliş Nedeni" deger={row.gelis_nedeni} />
              <Alan etiket="Geldiği Yer" deger={row.geldigi_yer} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Durum & Ayrılış & İptal</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Alan etiket="Ayrılış Tarihi" deger={tarih(row.ayrilis_tarihi)} />
              <Alan etiket="Ayrılış Nedeni" deger={row.ayrilis_nedeni} />
              <Alan etiket="İptal Karar Tarihi" deger={tarih(row.iptal_karar_tarihi)} />
              <Alan etiket="İptal Karar No" deger={row.iptal_karar_no} />
              <Alan etiket="Gittiği Yer" deger={row.gittigi_yer} />
              <Alan etiket="Açıklama" deger={row.aciklama} />
            </div>
          </div>
        </div>
      </div>

      <KadroGecmisPanel
        acik={gecmisAcik}
        onKapat={() => setGecmisAcik(false)}
        auditLoglar={auditLoglar}
        adMap={adMap}
      />
    </div>
  )
}
