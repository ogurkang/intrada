'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface MaasOncesiSatir {
  sicil_no:       string
  ad_soyad:       string
  unvan:          string
  ayrilis:        string
  baslama:        string
  vekil_ad_soyad: string
  _ay?:           number  // yalnızca YILLIK tabında
}

export interface MaasOncesiTabVerisi {
  ay:     number | 'yillik'
  label:  string
  satirlar: MaasOncesiSatir[]
}

interface Props {
  yil:    number
  minYil: number
  maxYil: number
  tabs:   MaasOncesiTabVerisi[]
}

const AY_TAM = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function tarihFmt(t: string) {
  try { return new Date(t + 'T00:00:00').toLocaleDateString('tr-TR') } catch { return t }
}

export default function MaasOncesiIzinliMudurlerClient({ yil, minYil, maxYil, tabs }: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)

  const aktif = tabs[sekmeIndex]
  const isYillik = aktif?.ay === 'yillik'

  async function excelIndir() {
    setExcelYukleniyor(true)
    try {
      const ayParam = isYillik ? '' : `&ay=${aktif.ay}`
      const res = await fetch(`/api/rapor/maas-oncesi-izinli-mudurler/excel?y=${yil}${ayParam}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error ?? 'Excel indirilemedi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Maas_Oncesi_Izinli_Mudurler_${yil}_${aktif.label}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Excel indirilemedi.')
    } finally {
      setExcelYukleniyor(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Maaş Öncesi İzinli Müdürler Raporu</h1>
          <p className="text-sm text-slate-600 mt-1">
            Her ayın 10–14. günlerinde izinli olan müdür unvanlı personel
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            onClick={excelIndir}
            disabled={excelYukleniyor || (aktif?.satirlar.length ?? 0) === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {excelYukleniyor ? 'Hazırlanıyor…' : `Excel İndir (${aktif?.label ?? ''})`}
          </button>

          {/* Yıl seçici */}
          <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
          <select
            value={yil}
            onChange={e => router.push(`/rapor/maas-oncesi-izinli-mudurler?y=${e.target.value}`)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {Array.from({ length: maxYil - minYil + 1 }, (_, i) => minYil + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sekme navigasyonu */}
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center px-3 py-3 font-semibold text-slate-700 w-14">Sıra</th>
                  {isYillik && (
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-24">Ay</th>
                  )}
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 w-24">Sicil No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Adı Soyadı</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Unvanı</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">Ayrılış</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">Başlama</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Vekalet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aktif.satirlar.length === 0 ? (
                  <tr>
                    <td colSpan={isYillik ? 8 : 7} className="px-4 py-10 text-center text-slate-500">
                      {isYillik
                        ? `${yil} yılında 10–14 tarih aralığında izinli müdür bulunamadı.`
                        : `${aktif.label} ${yil} ayında 10–14 tarih aralığında izinli müdür bulunamadı.`}
                    </td>
                  </tr>
                ) : (
                  aktif.satirlar.map((s, i) => (
                    <tr key={`${s.sicil_no}-${s.ayrilis}-${i}`} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-500">{i + 1}</td>
                      {isYillik && (
                        <td className="px-4 py-2.5 text-slate-600 text-xs font-medium">
                          {s._ay ? AY_TAM[s._ay - 1] : ''}
                        </td>
                      )}
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.sicil_no}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{s.ad_soyad}</td>
                      <td className="px-4 py-2.5 text-slate-600">{s.unvan}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">{tarihFmt(s.ayrilis)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">{tarihFmt(s.baslama)}</td>
                      <td className="px-4 py-2.5 text-slate-700">{s.vekil_ad_soyad}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
