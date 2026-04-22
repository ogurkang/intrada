import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { parseRaporPeriyot, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'

const MIN_YIL = 2000
const MAX_YIL = 2035
const AYLAR = ['YILLIK', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default async function TehlikeliSinifMudurlukListesiPage({ searchParams }: { searchParams: Promise<{ y?: string; p?: string }> }) {
  const sp = await searchParams
  const yParsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(yParsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, yParsed)) : new Date().getFullYear()
  const { periyot, D, label } = parseRaporPeriyot(yil, sp.p)
  const p = periyot === 'yillik' ? 'yillik' : String(periyot)
  const supabase = await createClient()
  const { data: mudRaw } = await supabase
    .from('tanim_mudurluk')
    .select('mudurluk_adi, tehlike_sinifi')
    .eq('aktif', true)

  const tehlikeSira: Record<TehlikeSinifi, number> = {
    'Az Tehlikeli': 1,
    Tehlikeli: 2,
    'Çok Tehlikeli': 3,
  }
  const satirlar = (mudRaw ?? [])
    .map(r => ({
      mudurluk: r.mudurluk_adi,
      tehlike_sinifi: ((r.tehlike_sinifi as TehlikeSinifi) ?? 'Az Tehlikeli') as TehlikeSinifi,
    }))
    .sort(
      (a, b) =>
        tehlikeSira[a.tehlike_sinifi] - tehlikeSira[b.tehlike_sinifi] ||
        a.mudurluk.localeCompare(b.mudurluk, 'tr'),
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700">← Rapor Yönetimi</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Tehlike Sınıfına Göre Müdürlük Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">Aktif olan müdürlükleri tehlike sınıfına göre listeler.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/api/rapor/tehlikeli-sinif-mudurluk-listesi/excel?y=${yil}&p=${p}`} className="bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">Excel İndir ({label})</Link>
          <form className="flex items-center gap-2" method="get"><input type="hidden" name="p" value={p} /><select name="y" defaultValue={String(yil)} className="px-3 py-2 border rounded-lg text-sm bg-white">{Array.from({ length: MAX_YIL - MIN_YIL + 1 }, (_, i) => MIN_YIL + i).map(y => <option key={y} value={y}>{y}</option>)}</select><button className="px-3 py-2 border rounded-lg text-sm">Git</button></form>
        </div>
      </div>
      <div className="border-b border-slate-200 overflow-x-auto"><nav className="flex min-w-max">{AYLAR.map((a, i) => { const pv = i === 0 ? 'yillik' : String(i); const aktif = pv === p; return <Link key={a} href={`?y=${yil}&p=${pv}`} className={`px-3 py-2 text-sm border-b-2 ${aktif ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600'}`}>{a}</Link> })}</nav></div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Tehlike Sınıfı</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Müdürlük</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((r, i) => (
              <tr key={`${r.mudurluk}-${i}`} className="border-b border-slate-100">
                <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.tehlike_sinifi}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.mudurluk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
