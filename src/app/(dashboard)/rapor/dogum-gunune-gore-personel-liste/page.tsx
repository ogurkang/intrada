import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'

const MIN_YIL = 2000
const MAX_YIL = 2035
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function parseYil(v: string | undefined): number {
  const n = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(n)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, n))
}

function parseAy(v: string | undefined): number {
  const n = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(n) || n < 1 || n > 12) return new Date().getMonth() + 1
  return n
}

function formatDogumGunu(tarih: string | null): string {
  const s = String(tarih ?? '')
  if (s.length < 10) return '—'
  const ay = s.slice(5, 7)
  const gun = s.slice(8, 10)
  if (!gun || !ay) return '—'
  return `${gun}.${ay}`
}

export default async function DogumGununeGorePersonelListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const sp = await searchParams
  const yil = parseYil(sp.y)
  const ay = parseAy(sp.m)
  const periyotTarih = new Date(yil, ay, 0).toISOString().slice(0, 10)
  const supabase = await createClient()
  const [{ data: calisanRaw }, { data: kadroRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad, dogum_tarihi'),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
  ])
  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const k of (kadroRaw ?? []) as KadroRaporRow[]) {
    if (!k.asil) continue
    const list = kadroByAsil.get(k.asil) ?? []
    list.push(k)
    kadroByAsil.set(k.asil, list)
  }

  const satirlar = (calisanRaw ?? [])
    .filter(c => {
      const dt = String(c.dogum_tarihi ?? '')
      if (!dt || dt.length < 7) return false
      const dogumAy = Number.parseInt(dt.slice(5, 7), 10)
      if (dogumAy !== ay) return false
      const sec = secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], periyotTarih)
      return !!sec
    })
    .sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Doğum Gününe Göre Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">Seçili ayda doğan aktif personeller listelenir.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Link
            href={`/api/rapor/dogum-gunune-gore-personel-liste/excel?y=${yil}&m=${ay}`}
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Excel İndir ({AYLAR[ay - 1]})
          </Link>
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="m" value={String(ay)} />
            <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
            <select name="y" defaultValue={String(yil)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {Array.from({ length: MAX_YIL - MIN_YIL + 1 }, (_, i) => MIN_YIL + i).map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="submit" className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
              Uygula
            </button>
          </form>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" aria-label="Aylık sekmeler">
          {AYLAR.map((a, i) => {
            const m = i + 1
            const aktif = m === ay
            return (
              <Link
                key={a}
                href={`?y=${yil}&m=${m}`}
                className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  aktif
                    ? 'border-teal-600 text-teal-800 bg-teal-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {a}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-36">Sicil No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">Doğum Günü</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    Seçili ay için kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                satirlar.map((r, i) => (
                  <tr key={`${r.sicil_no}-${i}`} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.sicil_no}</td>
                    <td className="px-4 py-2.5 text-slate-800">{r.ad_soyad}</td>
                    <td className="px-4 py-2.5 text-slate-700">{formatDogumGunu(r.dogum_tarihi)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
