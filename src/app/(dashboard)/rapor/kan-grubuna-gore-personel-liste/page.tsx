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
    supabase.from('calisan').select('sicil_no, ad_soyad, kan_grubu'),
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
      return { sicil_no: sicil, ad_soyad: c.ad_soyad, kan_grubu: kg }
    })
    .filter(Boolean)
    .sort((a, b) => a!.ad_soyad.localeCompare(b!.ad_soyad, 'tr')) as { sicil_no: string; ad_soyad: string; kan_grubu: string }[]

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
          <form className="flex items-center gap-2" method="get"><input type="hidden" name="p" value={p} /><input type="hidden" name="k" value={seciliKanlar.join(',')} /><select name="y" defaultValue={String(yil)} className="px-3 py-2 border rounded-lg text-sm bg-white">{Array.from({ length: MAX_YIL - MIN_YIL + 1 }, (_, i) => MIN_YIL + i).map(y => <option key={y} value={y}>{y}</option>)}</select><button className="px-3 py-2 border rounded-lg text-sm">Git</button></form>
        </div>
      </div>
      <div className="border-b border-slate-200 overflow-x-auto"><nav className="flex min-w-max">{AYLAR.map((a, i) => { const pv = i === 0 ? 'yillik' : String(i); const aktif = pv === p; return <Link key={a} href={`?y=${yil}&p=${pv}&k=${encodeURIComponent(seciliKanlar.join(','))}`} className={`px-3 py-2 text-sm border-b-2 ${aktif ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600'}`}>{a}</Link> })}</nav></div>
      <form method="get" className="bg-white border rounded-xl p-4 space-y-3">
        <input type="hidden" name="y" value={yil} />
        <input type="hidden" name="p" value={p} />
        <p className="text-sm font-medium text-slate-700 mb-2">Kan Grubu Seçimi (Checkbox)</p>
        <div className="flex flex-wrap gap-3">
          {KAN_GRUPLARI.map(k => <label key={k} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="k" value={k} defaultChecked={seciliSet.has(k)} />{k}</label>)}
        </div>
        <button type="submit" className="px-3 py-2 border rounded-lg text-sm">Filtreyi Uygula</button>
      </form>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b"><th className="px-3 py-2 text-center">Sıra No</th><th className="px-3 py-2 text-left">Sicil No</th><th className="px-3 py-2 text-left">Adı Soyadı</th><th className="px-3 py-2 text-left">Kan Grubu</th></tr></thead><tbody className="divide-y">{satirlar.map((r, i) => <tr key={`${r.sicil_no}-${i}`}><td className="px-3 py-2 text-center">{i + 1}</td><td className="px-3 py-2">{r.sicil_no}</td><td className="px-3 py-2">{r.ad_soyad}</td><td className="px-3 py-2">{r.kan_grubu}</td></tr>)}</tbody></table>
      </div>
    </div>
  )
}
