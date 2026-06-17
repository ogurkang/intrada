'use client'

import { useMemo } from 'react'
import type { MahalleTanimSatir } from '@/lib/personel-adres'
import AdresIlIlceSecim from '@/components/tanimlar/AdresIlIlceSecim'

export type AdresInlineDeger = {
  il: string
  ilce: string
  mahalle_id: number | null
  adres_detay: string
}

type Props = {
  mahalleKayitlari: MahalleTanimSatir[]
  deger: AdresInlineDeger
  onChange: (v: AdresInlineDeger) => void
  compact?: boolean
}

export function adresInlineDegerFromSatir(
  mahalleKayitlari: MahalleTanimSatir[],
  mahalle_id: number | null,
  adres_detay: string | null,
): AdresInlineDeger {
  const kayit = mahalle_id != null ? mahalleKayitlari.find(m => m.id === mahalle_id) : null
  return {
    il: kayit?.il ?? 'Sakarya',
    ilce: kayit?.ilce ?? '',
    mahalle_id,
    adres_detay: adres_detay ?? '',
  }
}

export default function PersonelAdresInlineEditor({
  mahalleKayitlari,
  deger,
  onChange,
  compact = false,
}: Props) {
  const mahalleSecenekleri = useMemo(
    () =>
      mahalleKayitlari
        .filter(m => m.il === deger.il && m.ilce === deger.ilce)
        .sort((a, b) => a.mahalle_adi.localeCompare(b.mahalle_adi, 'tr')),
    [mahalleKayitlari, deger.il, deger.ilce],
  )

  const gridClass = compact
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : 'grid grid-cols-1 md:grid-cols-2 gap-4'

  return (
    <div className={gridClass}>
      <div className="sm:col-span-2">
        <AdresIlIlceSecim
          il={deger.il}
          ilce={deger.ilce}
          onIlChange={il =>
            onChange({ ...deger, il, ilce: '', mahalle_id: null })
          }
          onIlceChange={ilce =>
            onChange({ ...deger, ilce, mahalle_id: null })
          }
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Mahalle</label>
        <select
          value={deger.mahalle_id ?? ''}
          disabled={!deger.il || !deger.ilce}
          onChange={e =>
            onChange({
              ...deger,
              mahalle_id: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
        >
          <option value="">
            {deger.il && deger.ilce ? '— Mahalle seçin —' : 'Önce il ve ilçe'}
          </option>
          {mahalleSecenekleri.map(m => (
            <option key={m.id} value={m.id}>
              {m.mahalle_adi}
            </option>
          ))}
        </select>
      </div>
      <div className={compact ? '' : 'md:col-span-2'}>
        <label className="block text-xs font-medium text-slate-600 mb-1">Açık adres</label>
        <textarea
          rows={compact ? 2 : 2}
          value={deger.adres_detay}
          onChange={e => onChange({ ...deger, adres_detay: e.target.value })}
          placeholder="Sokak, bina no vb."
          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm resize-none"
        />
      </div>
    </div>
  )
}
