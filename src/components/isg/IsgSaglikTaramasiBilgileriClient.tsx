'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import IsgRaporUstBaslik from '@/components/isg/IsgRaporUstBaslik'
import type { IsgSaglikTaramasiBilgiSatir } from '@/lib/rapor-isg-saglik-taramasi-bilgileri'

interface Props {
  yil: number
  minYil: number
  maxYil: number
  satirlar: IsgSaglikTaramasiBilgiSatir[]
  raporBasePath: string
  excelBasePath: string
}

export default function IsgSaglikTaramasiBilgileriClient({
  yil,
  minYil,
  maxYil,
  satirlar,
  raporBasePath,
  excelBasePath,
}: Props) {
  const router = useRouter()

  const yilDegistir = useCallback(
    (y: number) => {
      router.push(`${raporBasePath}?y=${y}`)
    },
    [router, raporBasePath],
  )

  return (
    <div className="space-y-6">
      <IsgRaporUstBaslik
        baslik="Sağlık Taraması Bilgileri"
        aciklama="Seçilen yıldaki sağlık taraması dönemlerine göre aktif personelin tarama ve muayene durumu (Evet/Hayır)."
        geriHref="/isg/raporlar"
        geriLabel="← İSG Raporları"
        excelHref={`${excelBasePath}?y=${yil}`}
        excelLabel="Excel İndir"
        yil={yil}
        minYil={minYil}
        maxYil={maxYil}
        onYilChange={yilDegistir}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-700 w-28">Sicil No</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[180px]">Adı Soyadı</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[180px]">Müdürlüğü</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-700 min-w-[120px]">Tehlike Sınıfı</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24">Tarama</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24">Muayene</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                satirlar.map((r, i) => (
                  <tr key={r.sicil_no} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.sicil_no}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.ad_soyad}</td>
                    <td className="px-3 py-2.5 text-slate-700">{r.mudurluk}</td>
                    <td className="px-3 py-2.5 text-slate-700">{r.tehlike_sinifi}</td>
                    <td className="px-3 py-2.5 text-center text-slate-700">{r.tarama}</td>
                    <td className="px-3 py-2.5 text-center text-slate-700">{r.muayene}</td>
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
