'use client'

import { useRouter } from 'next/navigation'
import { TASINIR_GOREVI_OPTIONS } from '@/lib/tasinir-gorevi'

export default function TasinirGoreviListeFiltreler({
  yil,
  p,
  g,
  minYil,
  maxYil,
}: {
  yil: number
  p: string
  g: string
  minYil: number
  maxYil: number
}) {
  const router = useRouter()

  function git(patch: { y?: number; g?: string }) {
    const nextY = patch.y ?? yil
    const nextG = patch.g !== undefined ? patch.g : g
    const qs = new URLSearchParams({ y: String(nextY), p })
    if (nextG) qs.set('g', nextG)
    router.push(`?${qs.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-slate-600 whitespace-nowrap">Taşınır Görevi</label>
      <select
        value={g}
        onChange={e => git({ g: e.target.value })}
        className="min-w-[14rem] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
      >
        <option value="">Seçiniz</option>
        {TASINIR_GOREVI_OPTIONS.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <select
        value={String(yil)}
        onChange={e => git({ y: Number(e.target.value) })}
        className="px-3 py-2 border rounded-lg text-sm bg-white"
      >
        {Array.from({ length: maxYil - minYil + 1 }, (_, i) => minYil + i).map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
