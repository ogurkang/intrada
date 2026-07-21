'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { StatuSayiSatir } from '@/lib/rapor-statuye-gore-sayi'

export interface StatuyeGoreSayiTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: StatuSayiSatir[]
  gelenler: string[]
  ayrilanlar: string[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: StatuyeGoreSayiTabVerisi[]
  raporBasePath?: string
  baslik?: string
  aciklama?: string
}

function satirVurgusu(etiket: string): string {
  if (etiket === FIRMA_STATU_ETIKET) return 'bg-amber-50/80'
  if (etiket === 'Tanımda olmayan statü') return 'bg-orange-50/50'
  return ''
}

export default function StatuyeGoreSayiClient({
  yil,
  minYil,
  maxYil,
  tabs,
  raporBasePath = '/rapor/statuye-gore-sayi',
  baslik = 'Statüye Göre Sayı Durumu Raporu',
  aciklama = 'Anlık görüntü tarihinde aktif kadro asıl personeli ve ADABEL Personeli; statü başına toplam sayı.',
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const aktif = tabs[sekmeIndex]

  const tablo = useMemo(() => {
    if (!aktif) return { satirlar: [] as StatuSayiSatir[], genel: 0 }
    let genel = 0
    for (const s of aktif.satirlar) genel += s.sayi
    return { satirlar: aktif.satirlar, genel }
  }, [aktif])

  const yilDegistir = useCallback(
    (y: number) => {
      router.push(`${raporBasePath}?y=${y}`)
    },
    [router, raporBasePath],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/rapor"
            className="intrada-btn intrada-btn-ust-menu mb-2"
          >
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-600 mt-1">{aciklama}</p>
        </div>
        <div className="flex items-center gap-2">
          {aktif && (
            <Link
              href={`/api/rapor/statuye-gore-sayi/excel?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}`}
              className="intrada-btn intrada-btn-excel"
            >
              Excel İndir ({aktif.label})
            </Link>
          )}
          <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
          <select
            value={yil}
            onChange={e => yilDegistir(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {Array.from({ length: maxYil - minYil + 1 }, (_, i) => minYil + i).map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" aria-label="Dönem sekmeleri">
          {tabs.map((t, i) => (
            <button
              key={`${t.label}-${i}`}
              type="button"
              onClick={() => setSekmeIndex(i)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                sekmeIndex === i
                  ? 'border-teal-600 text-teal-800 bg-teal-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {aktif && (
        <>
          <p className="text-xs text-slate-500">
            Anlık görüntü tarihi: <strong className="text-slate-700">{aktif.sonGunuEtiket}</strong>
          </p>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[360px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Statü</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-28">Sayı</th>
                  </tr>
                </thead>
                <tbody>
                  {tablo.satirlar.map((row, ri) => (
                    <tr key={`${row.statuEtiket}-${ri}`} className={`border-b border-slate-100 ${satirVurgusu(row.statuEtiket)}`}>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{row.statuEtiket}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-800">{row.sayi}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                    <td className="px-4 py-3 text-slate-900">Toplam</td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-900">{tablo.genel}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Gelenler:</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {aktif.gelenler.length > 0 ? aktif.gelenler.join(', ') : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Ayrılanlar:</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {aktif.ayrilanlar.length > 0 ? aktif.ayrilanlar.join(', ') : '—'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Sayılar, seçili anlık görüntü tarihinde aktif olan kadro asıl personeli ve ADABEL Personeli kayıtlarını kapsar. Yaş hesabı bu
            raporda kullanılmaz. Gelenler / ayrılanlar diğer statü raporlarıyla aynı dönem mantığındadır.
          </p>
        </>
      )}
    </div>
  )
}
