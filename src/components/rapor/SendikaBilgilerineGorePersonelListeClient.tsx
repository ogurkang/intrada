'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { SendikaPersonelListeSatir } from '@/lib/rapor-sendika-bilgileri'

export interface SendikaPersonelListeTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: SendikaPersonelListeSatir[]
}

interface SendikaSecenek {
  id: number
  kisa_ad: string
  statu: string
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: SendikaPersonelListeTabVerisi[]
  tumSendikalar: SendikaSecenek[]
  tumStatuler: string[]
  initialSendikaIds: number[]
  initialStatuIds: string[]
}

function filtreUrlParcalari(sendikaFiltreler: number[], statuFiltreler: string[]): string {
  const p: string[] = []
  if (sendikaFiltreler.length) p.push(`s=${sendikaFiltreler.join(',')}`)
  if (statuFiltreler.length) p.push(`st=${statuFiltreler.map(encodeURIComponent).join(',')}`)
  return p.length ? `&${p.join('&')}` : ''
}

export default function SendikaBilgilerineGorePersonelListeClient({
  yil,
  minYil,
  maxYil,
  tabs,
  tumSendikalar,
  tumStatuler,
  initialSendikaIds,
  initialStatuIds,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const [sendikaFiltreler, setSendikaFiltreler] = useState<number[]>(initialSendikaIds)
  const [statuFiltreler, setStatuFiltreler] = useState<string[]>(initialStatuIds)
  const aktif = tabs[sekmeIndex]

  const gorunenSatirlar = useMemo(() => {
    if (!aktif) return []
    let rows = aktif.satirlar
    if (sendikaFiltreler.length) {
      const secili = new Set(sendikaFiltreler)
      rows = rows.filter(r => secili.has(r.sendika_id))
    }
    if (statuFiltreler.length) {
      const secili = new Set(statuFiltreler)
      rows = rows.filter(r => secili.has(r.statu))
    }
    return rows
  }, [aktif, sendikaFiltreler, statuFiltreler])

  const yilDegistir = useCallback(
    (y: number) => {
      const ek = filtreUrlParcalari(sendikaFiltreler, statuFiltreler)
      router.push(`/rapor/sendika-bilgilerine-gore-personel-liste?y=${y}${ek}`)
    },
    [router, sendikaFiltreler, statuFiltreler],
  )

  const excelFiltre = filtreUrlParcalari(sendikaFiltreler, statuFiltreler)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-4xl">
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Sendika Bilgilerine Göre Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">Seçili anlık görüntü tarihinde sendika üyeliği olan aktif personel listesi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {aktif && (
            <Link
              href={`/api/rapor/sendika-bilgilerine-gore-personel-liste/excel?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}${excelFiltre}`}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Excel İndir ({aktif.label})
            </Link>
          )}
          <label className="text-sm text-slate-600 whitespace-nowrap">Sendika</label>
          <details className="relative">
            <summary className="list-none cursor-pointer min-w-[220px] max-w-[min(100vw-2rem,340px)] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
              {sendikaFiltreler.length ? `${sendikaFiltreler.length} sendika seçili` : 'Tümü'}
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-80 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">Checkbox ile seçiniz</p>
                <button type="button" onClick={() => setSendikaFiltreler([])} className="text-xs text-slate-500 hover:text-slate-700">
                  Temizle
                </button>
              </div>
              <div className="space-y-1.5">
                {tumSendikalar.map(s => (
                  <label key={s.id} className="inline-flex items-center gap-2 text-xs text-slate-700 w-full">
                    <input
                      type="checkbox"
                      checked={sendikaFiltreler.includes(s.id)}
                      onChange={e =>
                        setSendikaFiltreler(prev =>
                          e.target.checked ? Array.from(new Set([...prev, s.id])) : prev.filter(x => x !== s.id),
                        )
                      }
                    />
                    [{s.statu}] {s.kisa_ad}
                  </label>
                ))}
              </div>
            </div>
          </details>
          <label className="text-sm text-slate-600 whitespace-nowrap">Statü</label>
          <details className="relative">
            <summary className="list-none cursor-pointer min-w-[160px] max-w-[min(100vw-2rem,240px)] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
              {statuFiltreler.length ? `${statuFiltreler.length} statü seçili` : 'Tümü'}
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-56 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">Checkbox ile seçiniz</p>
                <button type="button" onClick={() => setStatuFiltreler([])} className="text-xs text-slate-500 hover:text-slate-700">
                  Temizle
                </button>
              </div>
              <div className="space-y-1.5">
                {tumStatuler.map(st => (
                  <label key={st} className="inline-flex items-center gap-2 text-xs text-slate-700 w-full">
                    <input
                      type="checkbox"
                      checked={statuFiltreler.includes(st)}
                      onChange={e =>
                        setStatuFiltreler(prev =>
                          e.target.checked ? Array.from(new Set([...prev, st])) : prev.filter(x => x !== st),
                        )
                      }
                    />
                    {st}
                  </label>
                ))}
              </div>
            </div>
          </details>
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
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Adı Soyadı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Müdürlüğü</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-28">Statü</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-36">Cep Telefonu</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-40">Sendika Kısa Adı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gorunenSatirlar.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    gorunenSatirlar.map((row, i) => (
                      <tr key={`${row.sicil_no}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{row.sicil_no}</td>
                        <td className="px-4 py-2.5 text-slate-800">{row.ad_soyad}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.mudurluk}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.statu}</td>
                        <td className="px-4 py-2.5 text-slate-700 tabular-nums">{row.telefon}</td>
                        <td className="px-4 py-2.5 text-slate-800 font-medium">{row.kisa_ad}</td>
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
