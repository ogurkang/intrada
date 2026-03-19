import { createClient } from '@/lib/supabase/server'
import EgitimDonemClient, { type EgitimDonem } from '@/components/egitim/EgitimDonemClient'
import { egitimDonemEkle, egitimDonemGuncelle, egitimDonemKapat } from './actions'

export default async function EgitimPage() {
  const supabase = await createClient()

  const [{ data: donemRaw }, { data: egitimSayiRaw }] = await Promise.all([
    supabase.from('egitim_takvimi_donem').select('*').order('id', { ascending: false }),
    supabase.from('egitim_takvimi_egitim').select('donem_id'),
  ])

  const sayiMap: Record<number, number> = {}
  ;(egitimSayiRaw ?? []).forEach(e => { sayiMap[e.donem_id] = (sayiMap[e.donem_id] ?? 0) + 1 })

  const donemler: EgitimDonem[] = (donemRaw ?? []).map(d => ({
    id:               d.id,
    yil:              d.yil,
    sira_no:          d.sira_no,
    donem_adi:        d.donem_adi,
    baslangic_tarihi: d.baslangic_tarihi,
    bitis_tarihi:     d.bitis_tarihi,
    durum:            d.durum,
    egitim_sayisi:    sayiMap[d.id] ?? 0,
  }))

  return (
    <EgitimDonemClient
      donemler={donemler}
      onEkle={egitimDonemEkle}
      onGuncelle={egitimDonemGuncelle}
      onKapat={egitimDonemKapat}
    />
  )
}
