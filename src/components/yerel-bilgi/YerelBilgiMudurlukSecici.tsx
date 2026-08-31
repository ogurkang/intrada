'use client'

import { useRouter } from 'next/navigation'
import type { MudurlukSecenek } from '@/lib/yerel-bilgi-butce-mudurluk'

type Props = {
  mudurlukler: MudurlukSecenek[]
  seciliMudurlukId: number | null
  basePath: string
  label?: string
}

export default function YerelBilgiMudurlukSecici({
  mudurlukler,
  seciliMudurlukId,
  basePath,
  label = 'Müdürlük',
}: Props) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={seciliMudurlukId ?? ''}
        onChange={e => {
          const v = e.target.value
          if (!v) router.push(basePath)
          else router.push(`${basePath}?mudurluk_id=${v}`)
        }}
        className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[14rem]"
      >
        <option value="">Müdürlük seçin…</option>
        {mudurlukler.map(m => (
          <option key={m.id} value={m.id}>
            {m.mudurluk_adi}
          </option>
        ))}
      </select>
    </div>
  )
}
