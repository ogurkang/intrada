import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

interface Cocuk {
  ad_soyad?: string
  tckn?: string
  dogum_tarihi?: string
  cinsiyet?: string
}

function tarihFormatla(t: string | null | undefined) {
  if (!t) return '—'
  try { return new Date(t).toLocaleDateString('tr-TR') } catch { return t }
}

function cinsiyetGoster(c: string | null | undefined) {
  if (!c) return '—'
  if (c === 'E' || c === 'Erkek') return 'E'
  if (c === 'K' || c === 'Kız' || c === 'Kadın') return 'K'
  return c
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

export default async function AileGoruntuPage({ params }: Props) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) notFound()

  const supabase = await createClient()

  const { data: kayit, error } = await supabase
    .from('aile_bildirimi')
    .select('*, calisan(ad_soyad)')
    .eq('id', numId)
    .single()

  if (error || !kayit) notFound()

  const adSoyad = (kayit.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null
  const cocuklar = (Array.isArray(kayit.cocuklar_json) ? kayit.cocuklar_json : []) as Cocuk[]

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Aile Bildirimi - Görüntüle</h1>
        <div className="flex items-center gap-2">
          <Link href="/bildirim/aile"
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ← Geri
          </Link>
          <Link href={`/bildirim/aile/${numId}/duzenle`}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Düzenle
          </Link>
          <a href={`/api/bildirim/aile/excel?id=${numId}`} download
            className="flex items-center gap-2 border border-green-600 text-green-700 text-sm px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel İndir
          </a>
        </div>
      </div>

      <div className="space-y-5">
        {/* Personel + Medeni Hal */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Personel Bilgileri</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Alan etiket="Sicil No"   deger={kayit.sicil_no} />
            <Alan etiket="Ad Soyad"   deger={adSoyad} />
            <Alan etiket="Medeni Hal" deger={kayit.medeni_hal} />
          </div>
        </div>

        {/* Eş Bilgileri */}
        {(kayit.esin_ad_soyad || kayit.esin_tckn) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Eş Bilgileri</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Alan etiket="Eş Adı Soyadı"  deger={kayit.esin_ad_soyad} />
              <Alan etiket="Eş TCKN"        deger={kayit.esin_tckn} />
              <Alan etiket="İş Durumu"      deger={kayit.is_durumu} />
              <Alan etiket="Gelir Durumu"   deger={kayit.gelir_durumu} />
            </div>
          </div>
        )}

        {/* Çocuklar */}
        {cocuklar.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Çocuklar ({cocuklar.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-10">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Ad Soyad</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600">TCKN</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Doğum Tarihi</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Cinsiyet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cocuklar.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{c.ad_soyad || '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{c.tckn || '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{tarihFormatla(c.dogum_tarihi)}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{cinsiyetGoster(c.cinsiyet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {cocuklar.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center text-slate-400 text-sm">
            Çocuk kaydı bulunmamaktadır.
          </div>
        )}

      </div>
    </div>
  )
}
