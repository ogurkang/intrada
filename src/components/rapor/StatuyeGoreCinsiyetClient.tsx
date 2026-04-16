'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import type { RaporPeriyot, StatuCinsiyetSatir } from '@/lib/rapor-statuye-gore-cinsiyet'

export interface StatuyeGoreCinsiyetTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: StatuCinsiyetSatir[]
  gelenler: string[]
  ayrilanlar: string[]
  /** Konuma göre rapor: müdürlük eşleşmeyen kadro/firma personel (detay satırları) */
  konumAtanmamisListe?: string[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: StatuyeGoreCinsiyetTabVerisi[]
  /** Yıl seçici yönlendirmesi, örn. /rapor/konuma-gore-cinsiyet */
  raporBasePath?: string
  baslik?: string
  aciklama?: string
  tabloSatirBaslik?: string
}

export default function StatuyeGoreCinsiyetClient({
  yil,
  minYil,
  maxYil,
  tabs,
  raporBasePath = '/rapor/statuye-gore-cinsiyet',
  baslik = 'Statüye Göre Cinsiyet Raporu',
  aciklama = 'Aylık sekmelerde liste, o ayın son günü itibarıyla aktif personeli gösterir. YILLIK sekme: yıl sonu (31 Aralık) anlık görüntüsü.',
  tabloSatirBaslik = 'Statü',
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)

  const aktif = tabs[sekmeIndex]

  const tablo = useMemo(() => {
    if (!aktif) return { satirlar: [] as StatuCinsiyetSatir[], toplamK: 0, toplamE: 0, genel: 0 }
    let toplamK = 0
    let toplamE = 0
    for (const s of aktif.satirlar) {
      toplamK += s.kadin
      toplamE += s.erkek
    }
    return { satirlar: aktif.satirlar, toplamK, toplamE, genel: toplamK + toplamE }
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
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-600 mt-1">{aciklama}</p>
        </div>
        <div className="flex items-center gap-2">
          {aktif && (
            <Link
              href={`/api/rapor/statuye-gore-cinsiyet/excel?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}`}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
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
              <table className="w-full text-sm border-collapse min-w-[420px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">{tabloSatirBaslik}</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24">Kadın</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24">Erkek</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-28">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {tablo.satirlar.map((row, ri) => {
                    const satirTop = row.kadin + row.erkek
                    const vurgu =
                      row.statuEtiket === 'Firma Personel'
                        ? 'bg-amber-50/80'
                        : row.statuEtiket === 'Tanımda olmayan statü' || row.statuEtiket === 'Konum atanmamış'
                          ? 'bg-orange-50/50'
                          : ''
                    return (
                      <tr key={`${row.statuEtiket}-${ri}`} className={`border-b border-slate-100 ${vurgu}`}>
                        <td className="px-4 py-2.5 text-slate-800">{row.statuEtiket}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-800">{row.kadin}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-800">{row.erkek}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums font-medium text-slate-900">
                          {satirTop}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                    <td className="px-4 py-3 text-slate-900">Toplam</td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-900">{tablo.toplamK}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-900">{tablo.toplamE}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-900">{tablo.genel}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {aktif.konumAtanmamisListe && aktif.konumAtanmamisListe.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Konum atanmamış personel</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Tanımlar {'>'} Müdürlük listesinde eşleşmeyen görev/kadro müdürlüğü veya boş müdürlük.{' '}
                <span className="text-slate-500">(Virgülle ayrılmış)</span>
              </p>
              <p className="text-sm text-slate-800 mt-2 leading-relaxed">
                {aktif.konumAtanmamisListe.join(', ')}
              </p>
            </div>
          )}

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
            Kadın/Erkek sayıları yalnızca bu değerlerle kayıtlı personeli içerir. Gelenler: seçili dönemde kuruma giriş
            veya personel hareketlerinde işe başlama tarihi olanlar. Ayrılanlar: kadro/firma ayrılış tarihi veya
            personel hareketlerinde ayrılış tarihi (ör. «Ayrılanlar» ekranıyla uyumlu) aynı döneme düşenler.
          </p>
        </>
      )}
    </div>
  )
}
