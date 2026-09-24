import { ISG_DURUM_TANIMLARI } from '@/lib/isg-tespit-oneri'
import { IsgYonlendiriciDugme } from '@/components/isg/IsgYonlendiriciDugme'

export default function IsgDurumTanimlariPage() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">İSG Durum Tanımları</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Tespit ve öneri kayıtlarında kullanılan ilerleme aşamaları. Her aşama %25 oranındadır.
          </p>
        </div>
        <IsgYonlendiriciDugme href="/isg/tanimlar">← Tanımlar</IsgYonlendiriciDugme>
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
