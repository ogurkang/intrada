'use client'

import Link from 'next/link'

export interface ToplamRaporluSatir {
  siraNo: number
  sicil_no: string
  ad_soyad: string
  rapor_gun: number
}

interface Props {
  yil: number
  baslangicStr: string
  bitisStr: string
  satirlar: ToplamRaporluSatir[]
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function tarihTr(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('tr-TR')
}

export default function ToplamRaporluMemurlarClient({ yil, baslangicStr, bitisStr, satirlar }: Props) {
  function handleExcelIndir() {
    const rows = [
      ['Toplam Raporlu Memurlar'],
      ['Yıl: ' + yil],
      [],
      ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Toplam Rapor Günü'],
      ...satirlar.map(s => [String(s.siraNo), s.sicil_no, s.ad_soyad, String(s.rapor_gun)]),
    ]
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Toplam_Raporlu_Memurlar_${yil}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Toplam Raporlu Memurlar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <strong>Statü:</strong> Zabıta Müdürlüğü personeli. <strong>İzin türü:</strong> Cari yılda en az 1 gün Rapor almış olanlar; toplam güne göre azalan sırada listelenir.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/kesintiler"
            className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
            ← Kesintiler
          </Link>
          <button
            type="button"
            onClick={handleExcelIndir}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel İndir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <p className="px-4 py-2 text-sm text-slate-500">
          Cari yıl: <strong>{yil}</strong> ({tarihTr(baslangicStr)} – {tarihTr(bitisStr)})
        </p>
        {satirlar.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">
            Cari yılda ({yil}) en az 1 gün Rapor alan Zabıta Müdürlüğü personeli bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 w-20">Sıra No</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 w-28">Sicil No</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Adı Soyadı</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 w-36">Toplam Rapor Günü</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {satirlar.map(s => (
                  <tr key={s.sicil_no} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{s.siraNo}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{s.sicil_no}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.ad_soyad}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 tabular-nums">{s.rapor_gun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
