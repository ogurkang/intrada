'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { BelediyeGeneliPersonelSatir } from '@/lib/rapor-belediye-geneli-personel-liste'

export interface BelediyeGeneliPersonelTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: BelediyeGeneliPersonelSatir[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: BelediyeGeneliPersonelTabVerisi[]
  raporBasePath: string
  excelBasePath: string
}

export default function BelediyeGeneliPersonelListeClient({
  yil,
  minYil,
  maxYil,
  tabs,
  raporBasePath,
  excelBasePath,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const aktif = tabs[sekmeIndex]

  const yilDegistir = useCallback(
    (y: number) => {
      router.push(`${raporBasePath}?y=${y}`)
    },
    [router, raporBasePath],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-4xl">
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Belediye Geneli Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Belediye genelindeki aktif personelin kimlik, statü, kadro ve görev bilgileri.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {aktif && (
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
              <table className="w-full text-sm border-collapse min-w-[2200px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 w-28">Sicil No</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[180px]">Adı Soyadı</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 w-24">Cinsiyeti</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[120px]">Statüsü</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[160px]">Kadro Unvanı</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[160px]">Görev Unvanı</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[180px]">Kadro Müdürlüğü</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[180px]">Görev Müdürlüğü</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 w-36">TC Kimlik No</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-28">Kuruma Giriş Tarihi</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-28">Doğum Tarihi</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[140px]">Doğum Yeri</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[120px]">Baba Adı</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[120px]">Anne Adı</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[240px]">Adres</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 w-32">Cep Telefonu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aktif.satirlar.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="px-4 py-10 text-center text-slate-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    aktif.satirlar.map((r, i) => (
                      <tr key={`${r.sicil_no}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.sicil_no}</td>
                        <td className="px-3 py-2.5 text-slate-800">{r.ad_soyad}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.cinsiyet}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.statu}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.kadro_unvani}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.gorev_unvani}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.kadro_mudurlugu}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.gorev_mudurlugu}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.tckn}</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">{r.kuruma_giris_tarihi}</td>
                        <td className="px-3 py-2.5 text-center text-slate-700">{r.dogum_tarihi}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.dogum_yeri}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.baba_adi}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.anne_adi}</td>
                        <td className="px-3 py-2.5 text-slate-700 whitespace-normal break-words">{r.adres}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.cep_telefonu}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
