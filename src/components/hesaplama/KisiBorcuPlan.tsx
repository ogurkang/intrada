import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import { tarihTr, type PlanSatir } from '@/lib/kanuni-faiz'

export default function KisiBorcuPlan({ satirlar }: { satirlar: PlanSatir[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
            <th className="px-3 py-2 font-semibold">Sıra</th>
            <th className="px-3 py-2 font-semibold">Vade</th>
            <th className="px-3 py-2 text-right font-semibold">Gün</th>
            <th className="px-3 py-2 font-semibold">Oran</th>
            <th className="px-3 py-2 text-right font-semibold">Faiz</th>
            <th className="px-3 py-2 text-right font-semibold">Anapara</th>
            <th className="px-3 py-2 text-right font-semibold">Ödeme</th>
            <th className="px-3 py-2 text-right font-semibold">Kalan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {satirlar.map(s => (
            <tr key={s.sira}>
              <td className="px-3 py-2 tabular-nums text-slate-500">{s.sira}</td>
              <td className="px-3 py-2 text-slate-800">{tarihTr(s.vade)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">{s.gun}</td>
              <td className="px-3 py-2 text-slate-700">{s.oran}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-800">{paraTr(s.faiz)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-800">{paraTr(s.anapara)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">{paraTr(s.odeme)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600">{paraTr(s.kalan)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
