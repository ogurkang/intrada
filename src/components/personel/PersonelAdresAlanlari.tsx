'use client'

import { useMemo, useState } from 'react'
import type { MahalleTanimSatir } from '@/lib/personel-adres'
import AdresIlIlceSecim from '@/components/tanimlar/AdresIlIlceSecim'

type Props = {
  mahalleKayitlari: MahalleTanimSatir[]
  initialMahalleId?: number | null
  initialAdresDetay?: string | null
  /** Eski metin adres (geçiş dönemi bilgi) */
  legacyAdresi?: string | null
}

export default function PersonelAdresAlanlari({
  mahalleKayitlari,
  initialMahalleId = null,
  initialAdresDetay = null,
  legacyAdresi = null,
}: Props) {
  const baslangic = useMemo(() => {
    const kayit = mahalleKayitlari.find(m => m.id === initialMahalleId)
    return {
      il: kayit?.il ?? 'Sakarya',
      ilce: kayit?.ilce ?? '',
      mahalleId: initialMahalleId,
    }
  }, [mahalleKayitlari, initialMahalleId])

  const [il, setIl] = useState(baslangic.il)
  const [ilce, setIlce] = useState(baslangic.ilce)
  const [mahalleId, setMahalleId] = useState<number | ''>(baslangic.mahalleId ?? '')

  const mahalleSecenekleri = useMemo(
    () =>
      mahalleKayitlari
        .filter(m => m.il === il && m.ilce === ilce)
        .sort((a, b) => a.mahalle_adi.localeCompare(b.mahalle_adi, 'tr')),
    [mahalleKayitlari, il, ilce],
  )

  return (
    <div className="space-y-4">
      {legacyAdresi && !initialMahalleId ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Kayıtlı eski adres metni: <span className="font-medium">{legacyAdresi}</span>. Yeni yapı için il, ilçe ve
          mahalle seçin.
        </p>
      ) : null}

      <AdresIlIlceSecim
        il={il}
        ilce={ilce}
        onIlChange={v => {
          setIl(v)
          setIlce('')
          setMahalleId('')
        }}
        onIlceChange={v => {
          setIlce(v)
          setMahalleId('')
        }}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mahalle</label>
        <select
          name="mahalle_id"
          value={mahalleId}
          disabled={!il || !ilce}
          onChange={e => setMahalleId(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
        >
          <option value="">{il && ilce ? '— Mahalle seçin —' : 'Önce il ve ilçe seçin'}</option>
          {mahalleSecenekleri.map(m => (
            <option key={m.id} value={m.id}>
              {m.mahalle_adi}
            </option>
          ))}
        </select>
        {il && ilce && mahalleSecenekleri.length === 0 ? (
          <p className="mt-1.5 text-xs text-slate-500">
            Bu il/ilçe için tanımlı mahalle yok. Tanımlar → Adres ekranından ekleyin.
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Açık adres (sokak, bina no vb.)</label>
        <textarea
          name="adres_detay"
          rows={2}
          defaultValue={initialAdresDetay ?? ''}
          placeholder="Mahalle dışındaki adres detayı"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>
    </div>
  )
}
