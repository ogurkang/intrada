'use client'

import ExcelJS from 'exceljs'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ISTIHDAM_SECENEKLERI,
  sihirbazBasliklari,
  sihirbazGruplari,
  type Istihdam,
  type SayfaYonu,
  type SihirbazSatir,
} from '@/lib/rapor-sihirbaz'

const TH =
  'sticky top-0 z-20 bg-slate-50 border-b border-slate-200 px-3 py-3 font-semibold text-slate-700 shadow-[0_1px_0_0_rgb(226,232,240)]'

function dosyaAdi(ham: string) {
  const s = ham.trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ')
  const govde = s.replace(/\.xlsx$/i, '').trim()
  return govde || 'Rapor'
}

export default function RaporSihirbazClient({ satirlar }: { satirlar: SihirbazSatir[] }) {
  const [istihdamlar, setIstihdamlar] = useState<Istihdam[]>([])
  const [baslikSirasi, setBaslikSirasi] = useState<string[]>([])
  const [yon, setYon] = useState<SayfaYonu>('yatay')
  const [ad, setAd] = useState('Personel raporu')
  const [suruklenen, setSuruklenen] = useState<string | null>(null)
  const [indiriliyor, setIndiriliyor] = useState(false)

  const istihdamSet = useMemo(() => new Set(istihdamlar), [istihdamlar])
  const raporSatirlari = useMemo(
    () => satirlar.filter(s => istihdamSet.has(s.istihdam)),
    [satirlar, istihdamSet],
  )
  const gruplar = useMemo(() => sihirbazGruplari(istihdamlar), [istihdamlar])
  const basliklar = useMemo(() => {
    const harita = new Map(sihirbazBasliklari(istihdamlar).map(b => [b.key, b]))
    return baslikSirasi.map(k => harita.get(k)).filter((b): b is NonNullable<typeof b> => !!b)
  }, [baslikSirasi, istihdamlar])

  function istihdamTik(id: Istihdam) {
    const sonraki = istihdamlar.includes(id) ? istihdamlar.filter(k => k !== id) : [...istihdamlar, id]
    setIstihdamlar(sonraki)
    const gecerli = new Set(sihirbazBasliklari(sonraki).map(b => b.key))
    setBaslikSirasi(once => once.filter(k => gecerli.has(k)))
  }

  function baslikTik(key: string) {
    setBaslikSirasi(once => (once.includes(key) ? once.filter(k => k !== key) : [...once, key]))
  }

  function sutunBirak(hedef: string) {
    if (!suruklenen || suruklenen === hedef) return
    setBaslikSirasi(once => {
      const kalan = once.filter(k => k !== suruklenen)
      const yer = kalan.indexOf(hedef)
      if (yer < 0) return once
      kalan.splice(yer, 0, suruklenen)
      return kalan
    })
    setSuruklenen(null)
  }

  async function indir() {
    if (!basliklar.length || !raporSatirlari.length || indiriliyor) return
    setIndiriliyor(true)
    try {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Rapor', { views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }] })
      ws.pageSetup = {
        orientation: yon === 'yatay' ? 'landscape' : 'portrait',
        paperSize: 9,
        horizontalCentered: false,
        verticalCentered: false,
      }
      ws.pageSetup.printTitlesRow = '1:1'
      const baslikSatiri = ['Sıra No', ...basliklar.map(b => b.etiket)]
      ws.addRow(baslikSatiri)
      raporSatirlari.forEach((s, i) => {
        ws.addRow([i + 1, ...basliklar.map(b => s.deger[b.key] ?? '—')])
      })
      const baslikHucreSayisi = baslikSatiri.length
      for (let c = 1; c <= baslikHucreSayisi; c++) {
        const hucre = ws.getRow(1).getCell(c)
        hucre.font = { name: 'Calibri', bold: true }
        hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      }
      ws.columns = baslikSatiri.map((h, i) => ({ width: i === 0 ? 10 : Math.min(36, Math.max(14, h.length + 4)) }))
      ws.eachRow(row => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          }
          cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
        })
      })
      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${dosyaAdi(ad)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIndiriliyor(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
          ← Rapor Yönetimi
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Rapor Sihirbazı</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          İşaretlenen istihdam türlerindeki personelin tamamı rapora girer. Seçilen başlıklar önizlemede görünür. Sıra No her zaman ilk sütundur. Yatay ve dikey, Excel sayfasının basım yönüdür.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">İstihdam türü</h2>
          <p className="text-sm text-slate-500">{raporSatirlari.length} kişi</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ISTIHDAM_SECENEKLERI.map(s => (
            <label key={s.id} className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={istihdamSet.has(s.id)}
                onChange={() => istihdamTik(s.id)}
                className="rounded border-slate-300"
              />
              {s.etiket}
            </label>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Başlıklar</h2>
        {gruplar.map(g => (
          <div key={g.grup}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{g.grup}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {g.basliklar.map(b => (
                <label key={b.key} className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={baslikSirasi.includes(b.key)}
                    onChange={() => baslikTik(b.key)}
                    className="rounded border-slate-300"
                  />
                  {b.etiket}
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium text-slate-700">Sayfa yönü</legend>
            <div className="flex gap-4 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="yon" checked={yon === 'yatay'} onChange={() => setYon('yatay')} />
                Yatay
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="yon" checked={yon === 'dikey'} onChange={() => setYon('dikey')} />
                Dikey
              </label>
            </div>
            <p className="text-xs text-slate-500">Yatay sayfa geniş basılır. Dikey sayfa dar basılır. Sütun sırası aynı kalır.</p>
          </fieldset>
          <label className="block text-sm flex-1">
            <span className="font-medium text-slate-700">Dosya adı</span>
            <input
              value={ad}
              onChange={e => setAd(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </label>
          <button
            type="button"
            onClick={indir}
            disabled={!basliklar.length || !raporSatirlari.length || !ad.trim() || indiriliyor}
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
          >
            {indiriliyor ? 'Hazırlanıyor…' : 'Excel indir'}
          </button>
        </div>

        <div className="overflow-auto max-h-[min(70vh,720px)] border border-slate-200 rounded-lg">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead>
              <tr>
                <th className={`${TH} text-center w-20`}>Sıra No</th>
                {basliklar.map(b => (
                  <th
                    key={b.key}
                    draggable
                    onDragStart={() => setSuruklenen(b.key)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => sutunBirak(b.key)}
                    className={`${TH} text-left min-w-[140px] cursor-grab`}
                    title="Sütunu sürükleyerek yerini değiştirin"
                  >
                    {b.etiket}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {basliklar.length === 0 || raporSatirlari.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(2, basliklar.length + 1)} className="px-4 py-10 text-center text-slate-500">
                    İstihdam türü ve en az bir başlık seçilince önizleme burada görünür.
                  </td>
                </tr>
              ) : (
                raporSatirlari.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                    {basliklar.map(b => (
                      <td key={b.key} className="px-3 py-2.5 text-slate-700 whitespace-normal break-words">{s.deger[b.key] ?? '—'}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
