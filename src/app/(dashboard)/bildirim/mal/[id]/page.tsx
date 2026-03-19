import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

type JsonSatir = Record<string, string>

const BOLUMLER: { key: string; baslik: string; alanlar: string[] }[] = [
  { key: 'kimlik_json', baslik: 'Bildirim Sahipleri', alanlar: ['ad_soyad', 'tckn', 'yakinlik', 'dogum_yeri'] },
  { key: 'tasinmaz_json', baslik: 'Taşınmazlar', alanlar: ['nitelik', 'il', 'ilce', 'metrekare', 'edinme', 'deger'] },
  { key: 'kooperatif_json', baslik: 'Kooperatifler', alanlar: ['tur', 'adi', 'il', 'edinme'] },
  { key: 'tasitlar_json', baslik: 'Taşıtlar', alanlar: ['tur', 'marka', 'yil', 'plaka', 'deger'] },
  { key: 'diger_tasinirlar_json', baslik: 'Diğer Taşınırlar', alanlar: ['tur', 'tanim', 'deger'] },
  { key: 'banka_menkul_json', baslik: 'Banka ve Menkul Değerler', alanlar: ['kurum', 'tur', 'tutar', 'doviz'] },
  { key: 'altin_mucevher_json', baslik: 'Altın ve Mücevher', alanlar: ['tur', 'miktar', 'birim', 'deger'] },
  { key: 'borc_alacak_json', baslik: 'Borç ve Alacaklar', alanlar: ['tur', 'taraf', 'tutar', 'aciklama'] },
  { key: 'haklar_json', baslik: 'Haklar ve Diğer Servet', alanlar: ['tur', 'tanim', 'deger'] },
]

function toArr(v: unknown): JsonSatir[] {
  return Array.isArray(v) ? (v as JsonSatir[]) : []
}

export default async function MalGoruntuPage({ params }: Props) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) notFound()

  const supabase = await createClient()

  const { data: kayit, error } = await supabase
    .from('mal_bildirimi')
    .select('*, calisan(ad_soyad)')
    .eq('id', numId)
    .single()

  if (error || !kayit) notFound()

  const adSoyad = (kayit.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mal Bildirimi - Görüntüle</h1>
        <Link href="/bildirim/mal"
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          ← Listeye Dön
        </Link>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Genel Bilgiler</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sicil No</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono">{kayit.sicil_no}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">{adSoyad ?? '—'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Beyan Türü</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">{kayit.beyan_turu ?? '—'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Onay Tarihi</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                {kayit.onay_tarihi ? new Date(kayit.onay_tarihi).toLocaleDateString('tr-TR') : '—'}
              </div>
            </div>
            {kayit.aciklama && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">{kayit.aciklama}</div>
              </div>
            )}
          </div>
        </div>

        {BOLUMLER.map(b => {
          const satirlar = toArr((kayit as Record<string, unknown>)[b.key])
          if (satirlar.length === 0) return null
          return (
            <div key={b.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">{b.baslik} ({satirlar.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-10">#</th>
                      {b.alanlar.map(alan => (
                        <th key={alan} className="text-left px-4 py-2.5 font-semibold text-slate-600 capitalize">
                          {alan.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {satirlar.map((satir, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                        {b.alanlar.map(alan => (
                          <td key={alan} className="px-4 py-3 text-slate-700">{satir[alan] ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        <div className="flex justify-end">
          <Link href="/bildirim/mal"
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
            ← Listeye Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
