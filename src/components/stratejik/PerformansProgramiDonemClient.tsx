'use client'

import Link from 'next/link'

export interface PpDonem {
  id: number
  yil: number
  donem_adi: string
  baslangic_tarihi: string
  bitis_tarihi: string
}

interface Props {
  donemler: PpDonem[]
}

function tarihAralik(baslangic: string, bitis: string) {
  const b = new Date(baslangic).toLocaleDateString('tr-TR')
  const s = new Date(bitis).toLocaleDateString('tr-TR')
  return `${b} - ${s}`
}

export default function PerformansProgramiDonemClient({ donemler }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Performans Programı İşlemler</h1>
          <p className="text-sm text-slate-500 mt-1">Stratejik plan dönemlerine göre performans programı kaydı oluşturabilirsiniz.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center w-20">Sıra No</th>
                <th className="px-4 py-3 text-left">Dönem Adı</th>
                <th className="px-4 py-3 text-left">Dönem Aralığı</th>
                <th className="px-4 py-3 text-center w-56">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donemler.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Kayıtlı dönem bulunamadı.
                  </td>
                </tr>
              ) : (
                donemler.map((d, i) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.donem_adi}</td>
                    <td className="px-4 py-3 text-slate-600">{tarihAralik(d.baslangic_tarihi, d.bitis_tarihi)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/stratejik-yonetim/performans-programi/islemler/${d.yil}`}
                          className="intrada-icon-btn intrada-icon-btn-detay"
                          title="Detay"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/stratejik-yonetim/performans-programi/islemler/${d.yil}/veri-giris`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Veri Giriş"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6m3 6V7m3 10v-3m5 6H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
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
