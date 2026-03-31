'use client'

import { useMemo, useState, useTransition } from 'react'
import ExcelJS from 'exceljs'
import type { TerfiEttirOnizlemeSatir } from '@/lib/terfi-ettir-hesap'
import { terfiEttirKaydet, type TerfiEttirKayitSatir } from '@/app/(dashboard)/terfi/donem/actions'

interface Props {
  donemId: number
  donemAdi: string
  terfiBas: string
  terfiBit: string
  initialRows: TerfiEttirOnizlemeSatir[]
}

function fmt(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR')
  } catch {
    return iso
  }
}

/** Liste önizlemesi (locale) */
function fmtTarih(iso: string | null | undefined) {
  if (iso == null || !String(iso).trim()) return '—'
  const d = String(iso).slice(0, 10)
  return fmt(d)
}

/** Excel: gg.aa.yyyy */
function fmtTarihGGAA(iso: string | null | undefined): string {
  if (iso == null || !String(iso).trim() || String(iso).trim() === '—') return '—'
  const s = String(iso).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

function puanGoster(v: string | null | undefined) {
  return v ?? '—'
}

function durumHucreClass(durum: string): string {
  if (durum === 'Derece İlerledi') return 'bg-green-100 text-green-800'
  if (durum === 'Sadece Kademe') return 'bg-slate-100 text-slate-700'
  if (durum === 'Kıdem Yılı İlerledi') return 'bg-blue-100 text-blue-700'
  if (durum.includes('Tavan')) return 'bg-amber-100 text-amber-900'
  if (durum === 'Eğitim Sınırında') return 'bg-red-100 text-red-800'
  return 'bg-slate-50 text-slate-600'
}

function durumExcelStyle(durum: string): Partial<ExcelJS.Style> {
  if (durum === 'Derece İlerledi')
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }, font: { color: { argb: 'FF166534' } } }
  if (durum === 'Sadece Kademe')
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, font: { color: { argb: 'FF334155' } } }
  if (durum === 'Kıdem Yılı İlerledi')
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }, font: { color: { argb: 'FF1D4ED8' } } }
  if (durum.includes('Tavan'))
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, font: { color: { argb: 'FF78350F' } } }
  if (durum === 'Eğitim Sınırında')
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE2E2' } }, font: { color: { argb: 'FF991B1B' } } }
  return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, font: { color: { argb: 'FF475569' } } }
}

function richOk(eski: string, yeni: string): ExcelJS.CellRichTextValue {
  return {
    richText: [
      { text: `${eski} → ` },
      { font: { bold: true }, text: yeni },
    ],
  }
}

export default function TerfiEttirClient({ donemId, donemAdi, terfiBas, terfiBit, initialRows }: Props) {
  const [satirlar, setSatirlar] = useState<TerfiEttirOnizlemeSatir[]>(initialRows)
  const [secili, setSecili] = useState<Record<string, boolean>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const tumSecili = useMemo(() => {
    if (!satirlar.length) return false
    return satirlar.every((r) => secili[r.sicil_no])
  }, [satirlar, secili])

  function toggleHepsi() {
    const next = !tumSecili
    const m: Record<string, boolean> = {}
    for (const r of satirlar) m[r.sicil_no] = next
    setSecili(m)
  }

  function toggleOne(sicil: string) {
    setSecili((prev) => ({ ...prev, [sicil]: !prev[sicil] }))
  }

  function guncelle(sicil: string, alan: keyof TerfiEttirOnizlemeSatir['payload'], deger: string) {
    setSatirlar((prev) =>
      prev.map((row) => {
        if (row.sicil_no !== sicil) return row
        const p = { ...row.payload, [alan]: deger || null }
        return {
          ...row,
          dk_kha_yeni: `${p.kha_derece}/${p.kha_kademe}`,
          dk_ekea_yeni: `${p.ekea_derece}/${p.ekea_kademe}`,
          ek_gosterge_yeni: puanGoster(p.ek_gosterge),
          ek_odeme_yeni: puanGoster(p.ek_odeme),
          oht_yeni: puanGoster(p.oht),
          yan_odeme_yeni: puanGoster(p.yan_odeme),
          sds_yeni: puanGoster(p.sds_orani),
          payload: p,
        }
      }),
    )
  }

  async function excelIndir() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Çalışanlar', {
      views: [{ showGridLines: true }],
    })

    const colCount = 18
    const titleStyle: Partial<ExcelJS.Style> = {
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      font: { bold: true, size: 12 },
    }

    ws.mergeCells(1, 1, 1, colCount)
    ws.getCell(1, 1).value = 'T.C. ADAPAZARI BELEDİYESİ'
    ws.getCell(1, 1).style = titleStyle

    ws.mergeCells(2, 1, 2, colCount)
    ws.getCell(2, 1).value = 'İnsan Kaynakları ve Eğitim Müdürlüğü'
    ws.getCell(2, 1).style = titleStyle

    ws.mergeCells(3, 1, 3, colCount)
    ws.getCell(3, 1).value = `${donemAdi} — Terfi Durumu`
    ws.getCell(3, 1).style = titleStyle

    ws.mergeCells(4, 1, 4, colCount)
    ws.getCell(4, 1).value = `Terfi dönemi: ${fmt(terfiBas)} — ${fmt(terfiBit)}  ·  Maaş dönemi: ${fmt(terfiBas)} — ${fmt(terfiBit)}`
    ws.getCell(4, 1).style = {
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      font: { size: 11 },
    }

    const headers = [
      'Sıra No',
      'Sicil',
      'Ad Soyad',
      'Öğrenim',
      'Ünvan',
      'Kadro derecesi',
      'KHA D/K (eski → yeni)',
      'KHA tarihi (eski → yeni)',
      'EKEA D/K (eski → yeni)',
      'EKEA tarihi (eski → yeni)',
      'Kıdem yılı (eski → yeni)',
      'Kıdem tarihi (eski → yeni)',
      'Ek Gösterge (eski → yeni)',
      'Ek Ödeme (eski → yeni)',
      'ÖHT (eski → yeni)',
      'Yan Ödeme (eski → yeni)',
      'SDS (eski → yeni)',
      'Durum / Uyarı',
    ]

    const headerRow = ws.getRow(5)
    headers.forEach((h, i) => {
      const c = headerRow.getCell(i + 1)
      c.value = h
      c.style = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      }
    })
    headerRow.height = 28

    satirlar.forEach((r, idx) => {
      const row = ws.getRow(6 + idx)
      const khaEski = fmtTarihGGAA(r.kha_tarihi)
      const khaYeni = fmtTarihGGAA(r.payload.kha_tarihi)
      const ekeaEski = fmtTarihGGAA(r.ekea_tarihi)
      const ekeaYeni = fmtTarihGGAA(r.payload.ekea_tarihi)
      const kidemEski = fmtTarihGGAA(r.kidem_tarihi_eski === '—' ? null : r.kidem_tarihi_eski)
      const kidemYeni = fmtTarihGGAA(r.kidem_tarihi_yeni === '—' ? null : r.kidem_tarihi_yeni)

      const cells: { v: number | string | ExcelJS.CellRichTextValue; style?: Partial<ExcelJS.Style> }[] = [
        { v: idx + 1 },
        { v: r.sicil_no },
        { v: r.ad_soyad ?? '' },
        { v: r.ogrenim_turu ?? '' },
        { v: r.unvan_adi ?? '' },
        { v: r.kadro_derecesi ?? '' },
        { v: richOk(r.dk_kha_eski, r.dk_kha_yeni) },
        { v: richOk(khaEski, khaYeni) },
        { v: richOk(r.dk_ekea_eski, r.dk_ekea_yeni) },
        { v: richOk(ekeaEski, ekeaYeni) },
        { v: richOk(String(r.kidem_yili_eski), String(r.kidem_yili_yeni)) },
        { v: richOk(kidemEski, kidemYeni) },
        { v: richOk(r.ek_gosterge_eski, r.ek_gosterge_yeni) },
        { v: richOk(r.ek_odeme_eski, r.ek_odeme_yeni) },
        { v: richOk(r.oht_eski, r.oht_yeni) },
        { v: richOk(r.yan_odeme_eski, r.yan_odeme_yeni) },
        { v: richOk(r.sds_eski, r.sds_yeni) },
        { v: r.durum, style: durumExcelStyle(r.durum) },
      ]

      cells.forEach((cell, i) => {
        const c = row.getCell(i + 1)
        c.value = cell.v
        c.style = {
          alignment: { vertical: 'middle', wrapText: true },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
          ...cell.style,
        }
      })
    })

    ws.columns.forEach((col) => {
      col.width = 14
    })
    ws.getColumn(3).width = 22
    ws.getColumn(5).width = 18
    ws.getColumn(18).width = 28

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terfi-ettir-donem-${donemId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  function terfiEttirUygula() {
    setHata(null)
    setBasari(null)
    const yazilacak = satirlar.filter((r) => secili[r.sicil_no] && r.terfi_id != null)
    if (!yazilacak.length) {
      setHata('Önce tabloda kaydedilecek satırları işaretleyin (terfi kaydı olan siciller).')
      return
    }
    const payload: TerfiEttirKayitSatir[] = yazilacak.map((r) => ({
      terfi_id: r.terfi_id!,
      sicil_no: r.sicil_no,
      ...r.payload,
    }))
    startTransition(async () => {
      const res = await terfiEttirKaydet(donemId, payload)
      if (res.hata) setHata(res.hata)
      else setBasari(`${payload.length} kayıt terfi ettirildi.`)
    })
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Terfi Ettir — Önizleme</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {donemAdi} · Terfi tarih penceresi: {fmt(terfiBas)} — {fmt(terfiBit)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void excelIndir()}
            className="text-sm font-medium border border-slate-300 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm">
            Excel indir
          </button>
          <button
            type="button"
            onClick={terfiEttirUygula}
            disabled={isPending}
            className="text-sm font-medium text-white bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 shadow-sm">
            {isPending ? 'İşleniyor…' : 'Terfi Ettir'}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Kurallar: <code className="bg-slate-200/80 px-1 rounded">docs/TERFI_ETTIR.md</code>. Satırları seçin, gerekirse değerleri düzenleyin,{' '}
        <strong>Terfi Ettir</strong> ile kaydedin.
      </p>

      {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">{hata}</p>}
      {basari && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-lg mb-4">{basari}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[1480px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-2 py-3 w-10" title="Seç">
                <input type="checkbox" checked={tumSecili} onChange={toggleHepsi} title="Tümünü seç" />
              </th>
              <th className="px-2 py-3 w-11 font-semibold text-slate-600 text-center">Sıra</th>
              <th className="px-2 py-3 font-semibold text-slate-600 min-w-[9rem]">Sicil — Ad Soyad</th>
              <th className="px-2 py-3 font-semibold text-slate-600 min-w-[7rem]">Ünvan</th>
              <th className="px-2 py-3 font-semibold text-slate-600 whitespace-nowrap">Kadro derecesi</th>
              <th className="px-2 py-3 font-semibold text-slate-600 min-w-[8rem]">Terfi tarihleri</th>
              <th className="px-2 py-3 font-semibold text-slate-600 whitespace-nowrap">Kıdem yılı</th>
              <th className="px-2 py-3 font-semibold text-slate-600">KHA D/K</th>
              <th className="px-2 py-3 font-semibold text-slate-600">EKEA D/K</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Ek Gösterge</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Ek Ödeme</th>
              <th className="px-2 py-3 font-semibold text-slate-600">ÖHT</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Yan Ödeme</th>
              <th className="px-2 py-3 font-semibold text-slate-600">SDS</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Durum / Uyarı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 && (
              <tr>
                <td colSpan={15} className="px-4 py-12 text-center text-slate-400">
                  Bu dönem penceresinde terfi tarihi (KHA/EKEA) bulunan memur yok.
                </td>
              </tr>
            )}
            {satirlar.map((r, idx) => (
              <tr key={r.sicil_no} className="hover:bg-slate-50/80">
                <td className="px-2 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={!!secili[r.sicil_no]}
                    onChange={() => toggleOne(r.sicil_no)}
                    disabled={r.terfi_id == null}
                  />
                </td>
                <td className="px-2 py-2 align-top text-center text-slate-600 tabular-nums">{idx + 1}</td>
                <td className="px-2 py-2 align-top">
                  <span className="font-mono text-xs text-slate-500">{r.sicil_no}</span>
                  <br />
                  <span className="font-medium text-slate-800">{r.ad_soyad}</span>
                  {r.ogrenim_turu ? (
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">Öğrenim: {r.ogrenim_turu}</p>
                  ) : null}
                </td>
                <td className="px-2 py-2 align-top text-slate-700">{r.unvan_adi ?? '—'}</td>
                <td className="px-2 py-2 align-top text-slate-700 tabular-nums">{r.kadro_derecesi ?? '—'}</td>
                <td className="px-2 py-2 align-top text-[11px] leading-snug text-slate-700">
                  <div>
                    <span className="text-slate-400">KHA:</span> {fmtTarih(r.kha_tarihi)} → {fmtTarih(r.payload.kha_tarihi)}
                  </div>
                  <div className="mt-0.5">
                    <span className="text-slate-400">EKEA:</span> {fmtTarih(r.ekea_tarihi)} → {fmtTarih(r.payload.ekea_tarihi)}
                  </div>
                  <div className="mt-0.5">
                    <span className="text-slate-400">Kıdem:</span> {fmtTarih(r.kidem_tarihi_eski)} → {fmtTarih(r.kidem_tarihi_yeni)}
                  </div>
                </td>
                <td className="px-2 py-2 align-top text-slate-700 tabular-nums whitespace-nowrap">
                  {r.kidem_yili_eski} → {r.kidem_yili_yeni}
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400 mb-1 whitespace-nowrap">
                    {r.dk_kha_eski} → {r.dk_kha_yeni}
                  </div>
                  <div className="flex gap-0.5 items-center flex-wrap">
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.kha_derece ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'kha_derece', e.target.value)}
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.kha_kademe ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'kha_kademe', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400 mb-1 whitespace-nowrap">
                    {r.dk_ekea_eski} → {r.dk_ekea_yeni}
                  </div>
                  <div className="flex gap-0.5 items-center flex-wrap">
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.ekea_derece ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'ekea_derece', e.target.value)}
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.ekea_kademe ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'ekea_kademe', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.ek_gosterge_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.ek_gosterge ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'ek_gosterge', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.ek_odeme_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.ek_odeme ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'ek_odeme', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.oht_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.oht ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'oht', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.yan_odeme_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.yan_odeme ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'yan_odeme', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.sds_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.sds_orani ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'sds_orani', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top text-xs max-w-[10rem]">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${durumHucreClass(r.durum)}`}>
                    <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-current opacity-60" />
                    {r.durum}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
