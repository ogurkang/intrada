import { fetchAllCalisanOgrenim, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { yoneticiOgrenimDurumListeSatirlari } from '@/lib/rapor-yonetici-ogrenim-durum-liste'

export default async function YoneticiOgrenimDurumListePage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)
  const anlikTarihEtiket = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const [{ data: calisanRaw, error }, { data: kadroRaw }, { data: ogrenimRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    fetchAllKadroHareketleri(supabase, 'asil, vekil, statu, kadro_unvani, gorev_unvani, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu'),
    fetchAllCalisanOgrenim(supabase, 'sicil_no, ogrenim_turu, okul_adi, bolum, mezuniyet_tarihi, meslegi, varsayilan'),
  ])

  const satirlar = yoneticiOgrenimDurumListeSatirlari({
    D,
    calisanlar: calisanRaw ?? [],
    kadroRows: kadroRaw ?? [],
    ogrenimRows: ogrenimRaw ?? [],
  })
  const siraBySicil = new Map<string, number>()
  let sira = 0
  for (const r of satirlar) {
    if (!siraBySicil.has(r.sicil_no)) {
      sira += 1
      siraBySicil.set(r.sicil_no, sira)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-4xl">
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Yönetici Öğrenim Durum Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Kadro veya görev unvanında Müdür ifadesi geçen (asil/vekil fark etmeksizin) aktif personellerin öğrenim bilgilerinin tümü listelenir.
          </p>
          <p className="text-xs text-slate-500 mt-2">Anlık görüntü: {anlikTarihEtiket}</p>
        </div>
        <Link
          href="/api/rapor/yonetici-ogrenim-durum-liste/excel"
          className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          Excel İndir
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap w-14">Sıra No</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Sicil No</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[160px]">Adı Soyadı</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[180px]">Görev Unvanı</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Öğrenim Türü</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Okul Adı</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Bölüm</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Mezuniyet Tarihi</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Mesleği</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Varsayılan</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              satirlar.map((r, i) => (
                <tr key={`${r.sicil_no}-${i}`} className="border-b border-slate-100">
                  <td className="px-3 py-2.5 tabular-nums text-slate-600">{siraBySicil.get(r.sicil_no) ?? i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.sicil_no}</td>
                  <td className="px-3 py-2.5 text-slate-900 font-medium">{r.ad_soyad}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.gorev_unvani}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.ogrenim_turu}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.okul_adi}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.bolum}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.mezuniyet_tarihi}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.meslegi}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.varsayilan}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
