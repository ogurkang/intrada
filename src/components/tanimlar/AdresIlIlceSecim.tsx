'use client'

import { useMemo } from 'react'
import { TURKIYE_ILLER, ilcelerForIl } from '@/lib/turkiye-adres'

type Props = {
  il: string
  ilce: string
  onIlChange: (il: string) => void
  onIlceChange: (ilce: string) => void
  disabled?: boolean
  ilName?: string
  ilceName?: string
}

export default function AdresIlIlceSecim({
  il,
  ilce,
  onIlChange,
  onIlceChange,
  disabled,
  ilName = 'il',
  ilceName = 'ilce',
}: Props) {
  const ilceler = useMemo(() => [...ilcelerForIl(il)], [il])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">İl</label>
        <select
          name={ilName}
          value={il}
          disabled={disabled}
          onChange={e => {
            onIlChange(e.target.value)
            onIlceChange('')
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
        >
          <option value="">— İl seçin —</option>
          {TURKIYE_ILLER.map(i => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">İlçe</label>
        <select
          name={ilceName}
          value={ilce}
          disabled={disabled || !il}
          onChange={e => onIlceChange(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
        >
          <option value="">{il ? '— İlçe seçin —' : 'Önce il seçin'}</option>
          {ilceler.map(ic => (
            <option key={ic} value={ic}>
              {ic}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
