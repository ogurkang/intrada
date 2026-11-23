'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpMudurlukProgramSpRapor } from '@/lib/pp-mudurluk-program-sp-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/mudurluklerin-program-alt-program-stratejik-plan`
const EXCEL = '/api/performans-programi/raporlar/mudurluk-program-sp/excel'

const HUCRE = 'border border-slate-300 px-2 py-2 align-middle text-xs text-center'
const BASLIK = 'border border-slate-300 bg-[#0F766E] px-2 py-2.5 text-center text-xs font-bold text-white uppercase'

export default function PpMudurlukProgramSpClient({
  rapor,
}: {
  rapor: PpMudurlukProgramSpRapor
}) {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    setYukleniyor(false)
  }, [rapor.yil, rapor.satirlar.length])

  function yilDegistir(y: string) {
    setYukleniyor(true)
    router.push(`${LISTE_YOL}?y=${encodeURIComponent(y)}`)
  }

  const excel = `${EXCEL}?yil=${rapor.yil}`

  return (
    <div className="space-y-6 relative">
      {yukleniyor ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/75 backdrop-blur-[1px]"
          role="alert"
          aria-busy="true"
          aria-label="Rapor yükleniyor"
        >
          <IntradaLoader label="Rapor yükleniyor" />
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              Müdürlüklerin Program-Alt Program Stratejik Plan Tablosu
            </h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Performans programı yılı. Varsayılan bir sonraki takvim yılıdır.' },
              { baslik: 'Tablo', metin: 'Program / alt program / faaliyet kodları ile stratejik amaç, hedef, performans hedefi ve ilgili müdürlük.' },
              { baslik: 'Excel', metin: 'Aynı düzen ve renklerle indirir.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Program sınıflandırması ile stratejik plan ve ilgili müdürlük ilişkisi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={PP_RAPORLAR_BASE}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ← Raporlar
          </Link>
          <a
            href={excel}
            className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Excel İndir
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block font-medium">Yıl</span>
          <select
            value={rapor.yil}
            onChange={e => yilDegistir(e.target.value)}
            className="min-w-[7rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {rapor.yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse min-w-[72rem]">
          <thead>
            <tr>
              <th colSpan={3} className={BASLIK}>KOD</th>
              <th className={BASLIK}>PROGRAM</th>
              <th className={BASLIK}>ALT PROGRAM</th>
              <th className={BASLIK}>FAALİYET</th>
              <th className={BASLIK}>STRATEJİK AMAÇ</th>
              <th className={BASLIK}>HEDEF</th>
              <th className={BASLIK}>PERFORMANS HEDEFİ</th>
              <th className={BASLIK}>İLGİLİ MÜDÜRLÜK</th>
            </tr>
          </thead>
          <tbody>
            {rapor.satirlar.length === 0 ? (
              <tr>
                <td colSpan={10} className={`${HUCRE} py-10 text-slate-500`}>
                  Seçilen yıl için kayıt yok.
                </td>
              </tr>
            ) : rapor.satirlar.map((s, i) => {
              const zemin = i % 2 === 0 ? 'bg-[#C6EFCE]' : 'bg-[#F2F2F2]'
              const altKenar = i === rapor.satirlar.length - 1 ? 'border-b-2 border-b-teal-700' : ''
              return (
                <tr key={`${s.mudurluk}-${s.hedefKod}-${s.faaliyetKodu}-${i}`}>
                  <td className={`${HUCRE} w-14 tabular-nums ${zemin} ${altKenar}`}>{s.programKodu || '—'}</td>
                  <td className={`${HUCRE} w-14 tabular-nums ${zemin} ${altKenar}`}>{s.altProgramKodu || '—'}</td>
                  <td className={`${HUCRE} w-16 tabular-nums ${zemin} ${altKenar}`}>{s.faaliyetKodu || '—'}</td>
                  <td className={`${HUCRE} ${zemin} ${altKenar}`}>{s.programAdi}</td>
                  <td className={`${HUCRE} ${zemin} ${altKenar}`}>{s.altProgramAdi}</td>
                  <td className={`${HUCRE} ${zemin} ${altKenar}`}>{s.faaliyetAdi}</td>
                  <td className={`${HUCRE} text-left ${zemin} ${altKenar}`}>{s.stratejikAmac}</td>
                  <td className={`${HUCRE} text-left ${zemin} ${altKenar}`}>{s.hedef}</td>
                  <td className={`${HUCRE} text-left ${zemin} ${altKenar}`}>{s.performansHedefi}</td>
                  <td className={`${HUCRE} font-medium ${zemin} ${altKenar}`}>{s.mudurluk}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
