'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import FirmaGecmisPanel from '@/components/personel/FirmaGecmisPanel'

function tarihFmt(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function routeSegment(row: Tables<'firma_calisanlar'>) {
  return encodeURIComponent(row.public_id ?? String(row.id))
}

interface Props {
  row: Tables<'firma_calisanlar'>
  auditLoglar?: Tables<'personel_audit_log'>[]
  yerleskeMap?: Record<number, string>
  /** Kullanıcının kendi kartı (/personel/{sicil}): düzenleme ve liste navigasyonu gizlenir. */
  saltOkunur?: boolean
}

export default function FirmaCalisanDetayView({
  row,
  auditLoglar = [],
  yerleskeMap = {},
  saltOkunur = false,
}: Props) {
  const [gecmisAcik, setGecmisAcik] = useState(false)
  const seg = routeSegment(row)
  const yerleskeAdi = row.yerleske_adresi_id ? yerleskeMap[row.yerleske_adresi_id] : null

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        {saltOkunur ? (
          <span className="text-slate-500">Personel Kartım</span>
        ) : (
          <Link href="/firma-calisanlar" className="hover:text-slate-800 transition-colors">
            ADABEL Personeli
          </Link>
        )}
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{row.ad_soyad}</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          ADABEL Personeli — {row.ad_soyad}
        </h1>
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
          {!saltOkunur && (
            <>
              <Link
                href={`/firma-calisanlar/${seg}/duzenle`}
                className="intrada-btn intrada-btn-duzenle">
                Değiştir
              </Link>
              <Link
                href="/firma-calisanlar"
                className="intrada-btn intrada-btn-ust-menu">
                ← Listeye Dön
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Kimlik</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Alan etiket="Sicil No" deger={row.sicil_no} />
              <Alan etiket="Ad Soyad" deger={row.ad_soyad} />
              <Alan etiket="TCKN" deger={row.tckn} />
              <Alan etiket="Cinsiyet" deger={row.cinsiyet} />
              <Alan etiket="Doğum Tarihi" deger={tarihFmt(row.dogum_tarihi)} />
              <Alan etiket="Öğrenim" deger={row.ogrenim} />
              <Alan etiket="Telefon" deger={row.telefon} />
              <Alan etiket="E-posta" deger={row.e_posta} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">İş Bilgileri</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Alan etiket="Kuruma Giriş Tarihi" deger={tarihFmt(row.kuruma_giris_tarihi)} />
              <Alan etiket="Görev Yeri" deger={row.gorev_mudurlugu} />
              <Alan etiket="Görevi" deger={row.gorevi} />
              <Alan etiket="Mesleği" deger={row.meslegi} />
              <Alan etiket="Yerleşke Adresi" deger={yerleskeAdi} />
            </div>
          </div>
          {(row.ayrilis_tarihi || row.ayrilis_nedeni) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Ayrılış</p>
              <div className="grid grid-cols-2 gap-3">
                <Alan etiket="Ayrılış Tarihi" deger={tarihFmt(row.ayrilis_tarihi)} />
                <Alan etiket="Ayrılış Nedeni" deger={row.ayrilis_nedeni} />
              </div>
            </div>
          )}
        </div>
      </div>

      <FirmaGecmisPanel
        acik={gecmisAcik}
        onKapat={() => setGecmisAcik(false)}
        auditLoglar={auditLoglar}
        yerleskeMap={yerleskeMap}
      />
    </div>
  )
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
