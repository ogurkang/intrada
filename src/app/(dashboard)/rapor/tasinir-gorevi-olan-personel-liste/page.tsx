import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { periyotSonGunu, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { tasinirGoreviListeFiltrele, tasinirGoreviListeSnapshot } from '@/lib/rapor-tasinir-gorevi-liste'
import { tasinirGoreviNormalize } from '@/lib/tasinir-gorevi'
import TasinirGoreviListeFiltreler from '@/components/rapor/TasinirGoreviListeFiltreler'

const MIN_YIL = 2000
const MAX_YIL = 2035
const AYLAR = [
  'YILLIK',
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

function gorevQuery(g: string): string {
  return g ? `&g=${encodeURIComponent(g)}` : ''
}

export default async function TasinirGoreviOlanPersonelListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; p?: string; g?: string }>
}) {
  const sp = await searchParams
  const yParsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(yParsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, yParsed)) : new Date().getFullYear()
  const p = sp.p === 'yillik' || !sp.p ? 'yillik' : String(Math.min(12, Math.max(1, parseInt(sp.p, 10) || 1)))
  const periyot = p === 'yillik' ? 'yillik' : Number(p)
  const D = periyotSonGunu(yil, periyot as never)
  const g = tasinirGoreviNormalize(sp.g) ?? ''

  const supabase = await createClient()
  const [{ data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
    fetchAllKadroHareketleri(
      supabase,
      'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu',
      q => q.not('asil', 'is', null),
    ),
    supabase.from('calisan').select('sicil_no, ad_soyad, tasinir_gorevi'),
  ])

  const satirlar = tasinirGoreviListeFiltrele(
    tasinirGoreviListeSnapshot({
      D,
      kadro: (kadroRaw ?? []) as KadroRaporRow[],
      calisanlar: calisanRaw ?? [],
    }),
    g,
  )
  const gq = gorevQuery(g)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Taşınır Görevi Olan Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Görevlendirme Bilgileri’nde Taşınır Görevi dolu olan aktif kadro personeli. YILLIK ve aylık sekmeler diğer
            raporlarla aynı anlık görüntü tarihini kullanır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Link
            href={`/api/rapor/tasinir-gorevi-olan-personel-liste/excel?y=${yil}&p=${p}${gq}`}
            className="bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-600"
          >
            Excel İndir
          </Link>
          <TasinirGoreviListeFiltreler yil={yil} p={p} g={g} minYil={MIN_YIL} maxYil={MAX_YIL} />
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex min-w-max">
          {AYLAR.map((a, i) => {
            const pv = i === 0 ? 'yillik' : String(i)
            const aktif = pv === p
            return (
              <Link
                key={a}
                href={`?y=${yil}&p=${pv}${gq}`}
                className={`px-3 py-2 text-sm border-b-2 ${
                  aktif ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600'
                }`}
              >
                {a}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Sicil No</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Adı Soyadı</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Taşınır Görevi</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Unvan</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Müdürlük</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                  Bu dönemde taşınır görevi olan aktif personel bulunamadı.
                </td>
              </tr>
            ) : (
              satirlar.map((r, i) => (
                <tr key={r.sicil_no} className="border-b border-slate-100">
                  <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.sicil_no}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.ad_soyad}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.tasinir_gorevi}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.gorev_unvani}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.gorev_mudurlugu}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
