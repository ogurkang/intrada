import Link from 'next/link'
import type { Tables } from '@/types/database'

function tarihFmt(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function routeSegment(row: Tables<'firma_calisanlar'>) {
  return encodeURIComponent(row.public_id ?? String(row.id))
}

export default function FirmaCalisanDetayView({ row }: { row: Tables<'firma_calisanlar'> }) {
  const seg = routeSegment(row)
  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/firma-calisanlar" className="hover:text-slate-800 transition-colors">
          Firma Personel
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{row.ad_soyad}</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Firma Personel — {row.ad_soyad}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/firma-calisanlar/${seg}/duzenle`}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            Değiştir
          </Link>
          <Link
            href="/firma-calisanlar"
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ← Listeye Dön
          </Link>
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
              <Alan etiket="Görev Müdürlüğü" deger={row.gorev_mudurlugu} />
              <Alan etiket="Görevi" deger={row.gorevi} />
              <Alan etiket="Mesleği" deger={row.meslegi} />
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
