'use client'

import { useMemo } from 'react'

interface Props {
  planli: boolean
  onPlanliChange: (v: boolean) => void
  tarihSaat: string
  onTarihSaatChange: (v: string) => void
  /** Doğum günü ekranında otomatik planlama açıklaması */
  dogumGunuModu?: boolean
}

function yerelDatetimeMin(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 2)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SmsPlanliGonderimAlanlari({
  planli,
  onPlanliChange,
  tarihSaat,
  onTarihSaatChange,
  dogumGunuModu = false,
}: Props) {
  const min = useMemo(() => yerelDatetimeMin(), [])

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={planli}
          onChange={e => onPlanliChange(e.target.checked)}
          className="rounded border-slate-300"
        />
        İleri tarihte gönder
      </label>
      {planli ? (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Gönderim tarihi ve saati</label>
          <input
            type="datetime-local"
            value={tarihSaat}
            min={min}
            onChange={e => onTarihSaatChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>
      ) : dogumGunuModu ? (
        <p className="text-xs text-slate-500">
          İşaretlenmezse her alıcı kendi doğum gününde (09:00) alır.
        </p>
      ) : (
        <p className="text-xs text-slate-500">İşaretlenmezse mesaj hemen gönderilir.</p>
      )}
    </div>
  )
}
