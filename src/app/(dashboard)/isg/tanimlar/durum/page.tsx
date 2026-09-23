import Link from 'next/link'
import { ISG_DURUM_TANIMLARI } from '@/lib/isg-tespit-oneri'

export default function IsgDurumTanimlariPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/isg/tanimlar"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          ← Tanımlar
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">İSG Durum Tanımları</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Tespit ve öneri kayıtlarında kullanılan ilerleme aşamaları. Her aşama %25 oranındadır.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-24 px-4 py-3 text-left font-semibold text-slate-600">Sıra</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Durum</th>
              <th className="w-28 px-4 py-3 text-left font-semibold text-slate-600">Oran</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ISG_DURUM_TANIMLARI.map((durum, index) => (
              <tr key={durum.kod} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {durum.kod} (%{durum.oran})
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-700">%{durum.oran}</td>
                <td className="px-4 py-3 text-slate-600">{durum.aciklama}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
