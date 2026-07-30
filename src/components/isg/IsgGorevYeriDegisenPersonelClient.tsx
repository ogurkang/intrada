'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import IsgRaporUstBaslik from '@/components/isg/IsgRaporUstBaslik'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { GorevYeriDegisenPersonelSatir } from '@/lib/rapor-gorev-yeri-degisen-personel'

export interface GorevYeriDegisenTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: GorevYeriDegisenPersonelSatir[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: GorevYeriDegisenTabVerisi[]
  raporBasePath: string
  excelBasePath: string
}

export default function IsgGorevYeriDegisenPersonelClient({
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
      <IsgRaporUstBaslik
        baslik="Görev Yeri Değişen Personel Listesi"
        aciklama="ADABEL personeli hariç, görev müdürlüğü değişen veya kurumdan ayrılan personel hareketleri. Ayrılışta yeni müdürlük sütununda ayrılış nedeni gösterilir."
        geriHref="/isg/raporlar"
        geriLabel="← İSG Raporları"
        excelHref={
          aktif
            ? `${excelBasePath}?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}`
            : undefined
        }
        excelLabel={aktif ? `Excel İndir (${aktif.label})` : 'Excel İndir'}
        yil={yil}
        minYil={minYil}
        maxYil={maxYil}
        onYilChange={yilDegistir}
      />

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" aria-label="Dönem sekmeleri">
          {tabs.map((t, i) => (
            <button
              key={`${t.label}-${i}`}
              type="button"
              onClick={() => setSekmeIndex(i)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                sekmeIndex === i
                  ? 'border-amber-600 text-amber-800 bg-amber-50/50'
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
            Dönem: <strong className="text-slate-700">{aktif.sonGunuEtiket}</strong>
          </p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 w-28">Sicil No</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[180px]">Adı Soyadı</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[160px]">Eski Müdürlüğü</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[160px]">Yeni Müdürlüğü</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-36">Değişiklik Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aktif.satirlar.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    aktif.satirlar.map((r, i) => (
                      <tr key={`${r.sicil_no}-${r.degisiklik_tarihi_iso}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.sicil_no}</td>
                        <td className="px-3 py-2.5 text-slate-800">{r.ad_soyad}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.eski_mudurluk}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.yeni_mudurluk}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{r.degisiklik_tarihi}</td>
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
