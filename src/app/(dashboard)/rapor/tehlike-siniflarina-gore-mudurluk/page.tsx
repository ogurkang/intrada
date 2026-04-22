import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { gelenlerAyrilanlar, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { aktifPersonelTehlikeSatirlari, parseRaporPeriyot, tehlikeMudurlukOzet, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'

const MIN_YIL = 2000
const MAX_YIL = 2035
const AYLAR = ['YILLIK', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default async function TehlikeSiniflarinaGoreMudurlukPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; p?: string }> }) {
  const sp = await searchParams
  const yParsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(yParsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, yParsed)) : new Date().getFullYear()
  const { periyot, D, label } = parseRaporPeriyot(yil, sp.p)
  const p = periyot === 'yillik' ? 'yillik' : String(periyot)

  const supabase = await createClient()
  const [
    { data: mudRaw },
    { data: kadroRaw },
    { data: calisanRaw },
    { data: phAyrRaw },
    { data: phIseRaw },
  ] = await Promise.all([
    supabase.from('tanim_mudurluk').select('mudurluk_adi, tehlike_sinifi').eq('aktif', true),
    supabase.from('kadro_hareketleri').select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu').not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi').not('ayrilis_tarihi', 'is', null).gte('ayrilis_tarihi', `${yil}-01-01`).lte('ayrilis_tarihi', `${yil}-12-31`),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi').not('ise_baslama_tarihi', 'is', null).gte('ise_baslama_tarihi', `${yil}-01-01`).lte('ise_baslama_tarihi', `${yil}-12-31`),
  ])
  const tehlikeByMudurluk = new Map<string, TehlikeSinifi>()
  for (const m of mudRaw ?? []) tehlikeByMudurluk.set(m.mudurluk_adi, (m.tehlike_sinifi as TehlikeSinifi) ?? 'Az Tehlikeli')
  const calisanBySicil = new Map<string, { ad_soyad: string }>()
  for (const c of calisanRaw ?? []) calisanBySicil.set(c.sicil_no, { ad_soyad: c.ad_soyad })
  const personelSatirlar = aktifPersonelTehlikeSatirlari({
    D,
    kadro: (kadroRaw ?? []) as KadroRaporRow[],
    calisanBySicil,
    tehlikeByMudurluk,
  })
  const satirlar = tehlikeMudurlukOzet(personelSatirlar)

  const phSeen = new Set<string>()
  const ph = []
  for (const r of [...(phAyrRaw ?? []), ...(phIseRaw ?? [])]) {
    const key = `${r.sicil_no}|${r.ayrilis_tarihi ?? ''}|${r.ise_baslama_tarihi ?? ''}`
    if (phSeen.has(key)) continue
    phSeen.add(key)
    ph.push(r)
  }
  const { gelenler, ayrilanlar } = gelenlerAyrilanlar({
    periyot: periyot === 'yillik' ? 'yillik' : (periyot as 1),
    yil,
    kadro: (kadroRaw ?? []) as KadroRaporRow[],
    calisanBySicil: new Map([...calisanBySicil.entries()].map(([sicil_no, v]) => [sicil_no, { sicil_no, ad_soyad: v.ad_soyad, cinsiyet: null }])),
    firma: [],
    personelHareketleri: ph,
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700">← Rapor Yönetimi</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Tehlike Sınıflarına Göre Müdürlük Raporu</h1>
          <p className="text-sm text-slate-600">ADABEL Personeli hariç aktif personel üzerinden müdürlük tehlike sınıfı özeti.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/api/rapor/tehlike-siniflarina-gore-mudurluk/excel?y=${yil}&p=${p}`} className="bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">Excel İndir ({label})</Link>
          <form className="flex items-center gap-2" method="get">
            <input type="hidden" name="p" value={p} />
            <select name="y" defaultValue={String(yil)} className="px-3 py-2 border rounded-lg text-sm bg-white">
              {Array.from({ length: MAX_YIL - MIN_YIL + 1 }, (_, i) => MIN_YIL + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="px-3 py-2 border rounded-lg text-sm">Git</button>
          </form>
        </div>
      </div>
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex min-w-max">
          {AYLAR.map((a, i) => {
            const pv = i === 0 ? 'yillik' : String(i)
            const aktif = pv === p
            return <Link key={a} href={`?y=${yil}&p=${pv}`} className={`px-3 py-2 text-sm border-b-2 ${aktif ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600'}`}>{a}</Link>
          })}
        </nav>
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b"><th className="px-3 py-2 text-left">Müdürlük</th><th className="px-3 py-2 text-left">Tehlike Sınıfı</th><th className="px-3 py-2 text-center">Personel Sayısı</th></tr></thead>
          <tbody className="divide-y">
            {satirlar.map((r, i) => <tr key={`${r.mudurluk}-${i}`}><td className="px-3 py-2">{r.mudurluk}</td><td className="px-3 py-2">{r.tehlike_sinifi}</td><td className="px-3 py-2 text-center">{r.personel_sayisi}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-white"><h3 className="font-semibold text-sm mb-2">Gelenler</h3><p className="text-sm text-slate-700">{gelenler.length ? gelenler.join(', ') : '—'}</p></div>
        <div className="border rounded-xl p-4 bg-white"><h3 className="font-semibold text-sm mb-2">Ayrılanlar</h3><p className="text-sm text-slate-700">{ayrilanlar.length ? ayrilanlar.join(', ') : '—'}</p></div>
      </div>
    </div>
  )
}
