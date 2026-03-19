import { createClient } from '@/lib/supabase/server'
import AileClient, { type AileBilgisi, type Cocuk } from '@/components/bildirim/AileClient'
import { aileKaydet, aileSil } from './actions'

export default async function AilePage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('aile_bildirimi')
    .select('*, calisan(ad_soyad)')
    .order('sicil_no', { ascending: true })

  const kayitlar: AileBilgisi[] = (raw ?? [])
    .map(r => ({
    id:            r.id,
    sicil_no:      r.sicil_no,
    ad_soyad:      (r.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null,
    medeni_hal:    r.medeni_hal,
    esin_ad_soyad: r.esin_ad_soyad,
    esin_tckn:     r.esin_tckn,
    is_durumu:     r.is_durumu,
    gelir_durumu:  r.gelir_durumu,
    cocuklar_json: Array.isArray(r.cocuklar_json) ? (r.cocuklar_json as unknown as Cocuk[]) : [],
    kayit_zamani:  r.kayit_zamani,
  }))
    .sort((a, b) => String(a.sicil_no).localeCompare(String(b.sicil_no), undefined, { numeric: true }))

  return (
    <AileClient
      kayitlar={kayitlar}
      onKaydet={aileKaydet}
      onSil={aileSil}
    />
  )
}
