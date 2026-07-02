import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { periyotSonGunu, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'

const KAN_GRUPLARI = ['0 Rh+', '0 Rh-', 'A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-']
const MIN_YIL = 2000
const MAX_YIL = 2035
const AYLAR = ['YILLIK', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default async function KanGrubunaGorePersonelListePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const yParam = Array.isArray(sp.y) ? sp.y[0] : sp.y
  const pParam = Array.isArray(sp.p) ? sp.p[0] : sp.p
  const yParsed = parseInt(yParam ?? '', 10)
  const yil = Number.isFinite(yParsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, yParsed)) : new Date().getFullYear()
  const p = pParam === 'yillik' || !pParam ? 'yillik' : String(Math.min(12, Math.max(1, parseInt(pParam, 10) || 1)))
  const periyot = p === 'yillik' ? 'yillik' : Number(p)
  const D = periyotSonGunu(yil, periyot as never)
  const kParam = sp.k
  const seciliKanlar = Array.isArray(kParam)
    ? kParam.map(s => String(s).trim()).filter(Boolean)
    : String(kParam ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
  const seciliSet = new Set(seciliKanlar)
  const supabase = await createClient()
  const [{ data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
    supabase.from('kadro_hareketleri').select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu').not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad, kan_grubu, telefon'),
  ])
  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const k of (kadroRaw ?? []) as KadroRaporRow[]) {
    if (!k.asil) continue
    const list = byAsil.get(k.asil) ?? []
    list.push(k)
    byAsil.set(k.asil, list)
  }
  const calisanBySicil = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c] as const))
  const satirlar = [...byAsil.entries()]
    .map(([sicil, rows]) => {
      const sec = secilenKadroSatirAsil(rows, D)
      if (!sec) return null
      const c = calisanBySicil.get(sicil)
      if (!c) return null
      const kg = c.kan_grubu?.trim() || 'Belirtilmemiş'
      if (seciliSet.size > 0 && !seciliSet.has(kg)) return null
      return { sicil_no: sicil, ad_soyad: c.ad_soyad, telefon: c.telefon?.trim() || '—', kan_grubu: kg }
    })
    .filter(Boolean)
    .sort((a, b) => a!.sicil_no.localeCompare(b!.sicil_no, 'tr', { numeric: true })) as { sicil_no: string; ad_soyad: string; telefon: string; kan_grubu: string }[]

  const excelK = seciliKanlar.length ? `&k=${encodeURIComponent(seciliKanlar.join(','))}` : ''
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700">← Rapor Yönetimi</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Kan Grubuna Göre Personel Listesi</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/api/rapor/kan-grubuna-gore-personel-liste/excel?y=${yil}&p=${p}${excelK}`} className="bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">Excel İndir</Link>
          <details className="relative">
            <summary className="list-none cursor-pointer px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
              Kan Grubu {seciliKanlar.length ? `(${seciliKanlar.length})` : '(Tümü)'}
            </summary>
            <form method="get" className="absolute right-0 z-10 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <input type="hidden" name="y" value={yil} />
              <input type="hidden" name="p" value={p} />
              <div className="space-y-1.5 mb-2">
                {KAN_GRUPLARI.map(k => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="k" value={k} defaultChecked={seciliSet.has(k)} />
                    {k}
                  </label>
                ))}
              </div>
              <button className="px-3 py-2 border rounded-lg text-xs">Uygula</button>
            </form>
          </details>
          <form className="flex items-center gap-2" method="get"><input type="hidden" name="p" value={p} /><input type="hidden" name="k" value={seciliKanlar.join(',')} /><select name="y" defaultValue={String(yil)} className="px-3 py-2 border rounded-lg text-sm bg-white">{Array.from({ length: MAX_YIL - MIN_YIL + 1 }, (_, i) => MIN_YIL + i).map(y => <option key={y} value={y}>{y}</option>)}</select><button className="px-3 py-2 border rounded-lg text-sm">Git</button></form>
        </div>
      </div>
      <div className="border-b border-slate-200 overflow-x-auto"><nav className="flex min-w-max">{AYLAR.map((a, i) => { const pv = i === 0 ? 'yillik' : String(i); const aktif = pv === p; return <Link key={a} href={`?y=${yil}&p=${pv}&k=${encodeURIComponent(seciliKanlar.join(','))}`} className={`px-3 py-2 text-sm border-b-2 ${aktif ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600'}`}>{a}</Link> })}</nav></div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Sicil No</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Adı Soyadı</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Telefon</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Kan Grubu</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((r, i) => (
              <tr key={`${r.sicil_no}-${i}`} className="border-b border-slate-100">
                <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.sicil_no}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.ad_soyad}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.telefon}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.kan_grubu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
