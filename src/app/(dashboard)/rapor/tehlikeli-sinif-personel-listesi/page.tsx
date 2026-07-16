import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  fetchMudurlukYerleskeKonumTanimlari,
  mudurlukKonumMetniHaritasi,
} from '@/lib/mudurluk-konum'
import { type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { aktifPersonelTehlikeSatirlari, parseRaporPeriyot, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'

const MIN_YIL = 2000
const MAX_YIL = 2035
const AYLAR = ['YILLIK', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function normMud(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

export default async function TehlikeliSinifPersonelListesiPage({ searchParams }: { searchParams: Promise<{ y?: string; p?: string; t?: string }> }) {
  const sp = await searchParams
  const yParsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(yParsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, yParsed)) : new Date().getFullYear()
  const { periyot, D, label } = parseRaporPeriyot(yil, sp.p)
  const p = periyot === 'yillik' ? 'yillik' : String(periyot)
  const seciliTehlikeler = String(sp.t ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean) as TehlikeSinifi[]
  const supabase = await createClient()
  const [{ data: mudRaw }, { data: kadroRaw }, { data: calisanRaw }, konumTanimlar] = await Promise.all([
    supabase.from('tanim_mudurluk').select('mudurluk_adi, tehlike_sinifi').eq('aktif', true),
    supabase.from('kadro_hareketleri').select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu').not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    fetchMudurlukYerleskeKonumTanimlari(supabase),
  ])
  const konumByMud = mudurlukKonumMetniHaritasi(konumTanimlar)
  const tehlikeByMudurluk = new Map<string, TehlikeSinifi>()
  for (const m of mudRaw ?? []) tehlikeByMudurluk.set(m.mudurluk_adi, (m.tehlike_sinifi as TehlikeSinifi) ?? 'Az Tehlikeli')
  const calisanBySicil = new Map<string, { ad_soyad: string }>()
  for (const c of calisanRaw ?? []) calisanBySicil.set(c.sicil_no, { ad_soyad: c.ad_soyad })
  const tehlikeSira: Record<TehlikeSinifi, number> = {
    'Az Tehlikeli': 1,
    Tehlikeli: 2,
    'Çok Tehlikeli': 3,
  }
  const satirlar = aktifPersonelTehlikeSatirlari({
    D,
    kadro: (kadroRaw ?? []) as KadroRaporRow[],
    calisanBySicil,
    tehlikeByMudurluk,
  })
    .filter(r => (seciliTehlikeler.length ? seciliTehlikeler.includes(r.tehlike_sinifi) : true))
    .map(r => ({ ...r, konum: konumByMud.get(normMud(r.mudurluk)) ?? '—' }))
    .sort(
      (a, b) =>
        tehlikeSira[a.tehlike_sinifi] - tehlikeSira[b.tehlike_sinifi] ||
        a.mudurluk.localeCompare(b.mudurluk, 'tr') ||
        a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }),
    )
  const tehlikeQ = seciliTehlikeler.length ? `&t=${encodeURIComponent(seciliTehlikeler.join(','))}` : ''

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700">← Rapor Yönetimi</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Tehlike Sınıfına Göre Personel Listesi</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/api/rapor/tehlikeli-sinif-personel-listesi/excel?y=${yil}&p=${p}${tehlikeQ}`} className="bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">Excel İndir ({label})</Link>
          <details className="relative">
            <summary className="list-none cursor-pointer px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
              Tehlike Sınıfı {seciliTehlikeler.length ? `(${seciliTehlikeler.length})` : '(Tümü)'}
            </summary>
            <form method="get" className="absolute right-0 z-10 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <input type="hidden" name="y" value={yil} />
              <input type="hidden" name="p" value={p} />
              <div className="space-y-1.5 mb-2">
                {(['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'] as TehlikeSinifi[]).map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="t" value={t} defaultChecked={seciliTehlikeler.includes(t)} />
                    {t}
                  </label>
                ))}
              </div>
              <button className="px-3 py-2 border rounded-lg text-xs">Uygula</button>
            </form>
          </details>
          <form className="flex items-center gap-2" method="get"><input type="hidden" name="p" value={p} /><input type="hidden" name="t" value={seciliTehlikeler.join(',')} /><select name="y" defaultValue={String(yil)} className="px-3 py-2 border rounded-lg text-sm bg-white">{Array.from({ length: MAX_YIL - MIN_YIL + 1 }, (_, i) => MIN_YIL + i).map(y => <option key={y} value={y}>{y}</option>)}</select><button className="px-3 py-2 border rounded-lg text-sm">Git</button></form>
        </div>
      </div>
      <div className="border-b border-slate-200 overflow-x-auto"><nav className="flex min-w-max">{AYLAR.map((a, i) => { const pv = i === 0 ? 'yillik' : String(i); const aktif = pv === p; return <Link key={a} href={`?y=${yil}&p=${pv}${tehlikeQ}`} className={`px-3 py-2 text-sm border-b-2 ${aktif ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600'}`}>{a}</Link> })}</nav></div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Tehlike Sınıfı</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Sicil No</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Adı Soyadı</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Müdürlük</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700">Konum</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((r, i) => (
              <tr key={`${r.sicil_no}-${i}`} className="border-b border-slate-100">
                <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.tehlike_sinifi}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.sicil_no}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.ad_soyad}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.mudurluk}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.konum}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
