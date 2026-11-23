'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ppMudurlukFaaliyetMaliyetSirala,
  type PpMudurlukFaaliyetMaliyetRapor,
  type PpMudurlukFaaliyetMaliyetSirala,
  type PpMudurlukFaaliyetMaliyetYon,
} from '@/lib/pp-mudurluk-faaliyet-maliyet-rapor'
import { ppRaporPara } from '@/lib/pp-mudurluk-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/mudurluklerin-faaliyet-maliyetleri`
const EXCEL = '/api/performans-programi/raporlar/mudurluk-faaliyet-maliyet/excel'

const HUCRE = 'border border-slate-300 px-3 py-2.5 align-middle text-sm'
const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'

function okIsaret(aktif: boolean, yon: PpMudurlukFaaliyetMaliyetYon): string {
  if (!aktif) return '↕'
  return yon === 'asc' ? '↑' : '↓'
}

export default function PpMudurlukFaaliyetMaliyetClient({
  rapor,
}: {
  rapor: PpMudurlukFaaliyetMaliyetRapor
}) {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)
  const [sirala, setSirala] = useState<PpMudurlukFaaliyetMaliyetSirala>('ad')
  const [yon, setYon] = useState<PpMudurlukFaaliyetMaliyetYon>('asc')

  useEffect(() => {
    setYukleniyor(false)
  }, [rapor.yil, rapor.satirlar.length])

  const satirlar = useMemo(
    () => ppMudurlukFaaliyetMaliyetSirala(rapor.satirlar, sirala, yon),
    [rapor.satirlar, sirala, yon],
  )
  const toplamTutar = useMemo(
    () => satirlar.reduce((a, s) => a + (s.tutar ?? 0), 0),
    [satirlar],
  )

  function yilDegistir(y: string) {
    setYukleniyor(true)
    router.push(`${LISTE_YOL}?y=${encodeURIComponent(y)}`)
  }

  function sutunSirala(alan: PpMudurlukFaaliyetMaliyetSirala) {
    if (sirala === alan) {
      setYon(y => (y === 'asc' ? 'desc' : 'asc'))
    } else {
      setSirala(alan)
      setYon(alan === 'butce' ? 'desc' : 'asc')
    }
  }

  const excel = `${EXCEL}?yil=${rapor.yil}&sirala=${sirala}&yon=${yon}`

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
              Müdürlüklerin Faaliyet Maliyetleri Tablosu
            </h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Varsayılan olarak bir sonraki takvim yılıdır. Performans bütçesi seçili yılın ödenek teklifidir.' },
              { baslik: 'Sütunlar', metin: 'Sıra No, Müdürlük Adı ve Performans Bütçesi. Bütçe, müdürlüğe bağlı performans faaliyetlerinin t bütçe toplamıdır.' },
              { baslik: 'Sıralama', metin: 'Müdürlük Adı A–Z / Z–A; Performans Bütçesi azdan çoğa / çoktan aza. Excel indirme ekrandaki sırayı kullanır.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Her satır bir müdürlüğün toplam performans ödenek teklifidir. Sütun başlığına tıklayarak sıralayın.
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${BASLIK} w-24`}>Sıra No</th>
              <th className={BASLIK}>
                <button
                  type="button"
                  onClick={() => sutunSirala('ad')}
                  className="inline-flex items-center justify-center gap-1.5 w-full font-bold"
                  title="A–Z / Z–A sırala"
                >
                  Müdürlük Adı
                  <span className="text-xs font-normal tabular-nums" aria-hidden>
                    {okIsaret(sirala === 'ad', yon)}
                  </span>
                </button>
              </th>
              <th className={`${BASLIK} w-48`}>
                <button
                  type="button"
                  onClick={() => sutunSirala('butce')}
                  className="inline-flex items-center justify-center gap-1.5 w-full font-bold"
                  title="Azdan çoğa / çoktan aza sırala"
                >
                  Performans Bütçesi
                  <span className="text-xs font-normal tabular-nums" aria-hidden>
                    {okIsaret(sirala === 'butce', yon)}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={3} className={`${HUCRE} py-10 text-center text-slate-500`}>
                  Seçilen yıl için müdürlük ödenek kaydı yok.
                </td>
              </tr>
            ) : (
              <>
                {satirlar.map((s, i) => {
                  const zemin = i % 2 === 0 ? 'bg-[#C6EFCE]' : 'bg-[#F2F2F2]'
                  return (
                    <tr key={s.mudurluk}>
                      <td className={`${HUCRE} text-center tabular-nums ${zemin}`}>{i + 1}</td>
                      <td className={`${HUCRE} ${zemin}`}>{s.mudurluk}</td>
                      <td className={`${HUCRE} text-right tabular-nums font-medium ${zemin}`}>
                        {ppRaporPara(s.tutar)}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td className={`${HUCRE} bg-[#9DC3E6]`} />
                  <td className={`${HUCRE} bg-[#9DC3E6] text-right font-bold text-slate-900`}>
                    TOPLAM
                  </td>
                  <td className={`${HUCRE} bg-[#9DC3E6] text-right tabular-nums font-bold text-slate-900`}>
                    {ppRaporPara(toplamTutar)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
