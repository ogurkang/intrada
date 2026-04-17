'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { StatuMatrisSatir } from '@/lib/rapor-statuye-gore-ogrenim-meslek'

export interface StatuyeGoreMatrisTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  kolonlar: string[]
  satirlar: StatuMatrisSatir[]
  gelenler: string[]
  ayrilanlar: string[]
  /** Öğrenim raporu: «Belirtilmemiş» sütunundaki personel adları */
  belirtilmemisListe?: string[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: StatuyeGoreMatrisTabVerisi[]
  raporBasePath: string
  excelBasePath?: string
  baslik: string
  aciklama: string
  aciklamaContainerClassName?: string
  altNot?: string
  tabloSatirBaslik?: string
  /** Meslek / yaş: sütun başlığı kaydırma; boş matris uyarısı */
  variant?: 'ogrenim' | 'meslek' | 'yas'
  /** Üstteki geri link (varsayılan: Rapor Yönetimi) */
  geriHref?: string
  geriLabel?: string
}

function satirVurgusu(etiket: string): string {
  if (etiket === 'Firma Personel') return 'bg-amber-50/80'
  if (etiket === 'Tanımda olmayan statü') return 'bg-orange-50/50'
  return ''
}

function satirVurgusuSticky(etiket: string): string {
  if (etiket === 'Firma Personel') return 'bg-amber-50/80'
  if (etiket === 'Tanımda olmayan statü') return 'bg-orange-50/50'
  return 'bg-white'
}

export default function StatuyeGoreMatrisRaporClient({
  yil,
  minYil,
  maxYil,
  tabs,
  raporBasePath,
  excelBasePath,
  baslik,
  aciklama,
  aciklamaContainerClassName,
  altNot,
  tabloSatirBaslik = 'Statü',
  variant = 'ogrenim',
  geriHref = '/rapor',
  geriLabel = '← Rapor Yönetimi',
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const aktif = tabs[sekmeIndex]

  const tablo = useMemo(() => {
    if (!aktif) {
      return {
        kolonlar: [] as string[],
        satirlar: [] as StatuMatrisSatir[],
        kolonToplam: [] as number[],
        genelToplam: 0,
      }
    }
    const { kolonlar, satirlar } = aktif
    const n = kolonlar.length
    const kolonToplam = new Array(n).fill(0)
    let genelToplam = 0
    for (const s of satirlar) {
      for (let i = 0; i < n; i++) {
        const v = s.sayilar[i] ?? 0
        kolonToplam[i] += v
        genelToplam += v
      }
    }
    return { kolonlar, satirlar, kolonToplam, genelToplam }
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
        <div className={aciklamaContainerClassName}>
          <Link
            href={geriHref}
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            {geriLabel}
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-600 mt-1">{aciklama}</p>
        </div>
        <div className="flex items-center gap-2">
          {(variant === 'yas' || variant === 'ogrenim' || variant === 'meslek') && aktif && excelBasePath && (
            <Link
              href={`${excelBasePath}?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}`}
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
              {(variant === 'meslek' || variant === 'yas') && tablo.satirlar.length === 0 ? (
                <p className="text-sm text-slate-500 px-4 py-8 text-center">
                  {variant === 'yas'
                    ? 'Bu dönem ve tarih için listelenecek personel bulunmuyor.'
                    : 'Bu dönem ve tarih için kayıtlı meslek bilgisi bulunmuyor.'}
                </p>
              ) : (
                <table className="w-full text-sm border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[140px]">
                        {tabloSatirBaslik}
                      </th>
                      {tablo.kolonlar.map(k => (
                        <th
                          key={k}
                          className={`text-center px-2 py-3 font-semibold text-slate-700 min-w-[72px] align-bottom ${
                            variant === 'meslek' || variant === 'yas'
                              ? 'max-w-[120px] whitespace-normal break-words leading-tight'
                              : 'whitespace-nowrap'
                          }`}
                        >
                          {k}
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24 border-l border-slate-200">
                        Toplam
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablo.satirlar.map((row, ri) => {
                      const satirTop = row.sayilar.reduce((s, n) => s + (n ?? 0), 0)
                      return (
                        <tr key={`${row.statuEtiket}-${ri}`} className={`border-b border-slate-100 ${satirVurgusu(row.statuEtiket)}`}>
                          <td
                            className={`px-4 py-2.5 text-slate-800 sticky left-0 z-10 font-medium ${satirVurgusuSticky(row.statuEtiket)}`}
                          >
                            {row.statuEtiket}
                          </td>
                          {tablo.kolonlar.map((_, ci) => (
                            <td key={ci} className="px-2 py-2.5 text-center tabular-nums text-slate-800">
                              {row.sayilar[ci] ?? 0}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-center tabular-nums font-medium text-slate-900 border-l border-slate-100">
                            {satirTop}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                      <td className="px-4 py-3 text-slate-900 sticky left-0 bg-slate-100 z-10">Toplam</td>
                      {tablo.kolonlar.map((_, ci) => (
                        <td key={ci} className="px-2 py-3 text-center tabular-nums text-slate-900">
                          {tablo.kolonToplam[ci] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center tabular-nums text-slate-900 border-l border-slate-200">
                        {tablo.genelToplam}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {variant === 'ogrenim' &&
            aktif.belirtilmemisListe !== undefined &&
            aktif.belirtilmemisListe.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Öğrenim durumu belirtilmemiş personel</h3>
              <p className="text-xs text-slate-600 mb-2">
                Tabloda «Belirtilmemiş» sütununda sayılan kadro/firma personelinin adları (virgülle ayrılmış).
              </p>
              <p className="text-sm text-slate-800 leading-relaxed">{aktif.belirtilmemisListe.join(', ')}</p>
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

          {altNot && <p className="text-xs text-slate-500">{altNot}</p>}
        </>
      )}
    </div>
  )
}
