import { createClient } from '@/lib/supabase/server'
import MalClient, { type MalBildirimi } from '@/components/bildirim/MalClient'
import { malBildirimSil } from './actions'

export default async function MalPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('mal_bildirimi')
    .select('id, public_id, sicil_no, beyan_turu, onay_tarihi, son_net_maas, kayit_zamani, calisan(ad_soyad)')
    .order('kayit_zamani', { ascending: false })

  const kayitlar: MalBildirimi[] = (raw ?? []).map(r => ({
    id:           r.id,
    public_id:    r.public_id,
    sicil_no:     r.sicil_no,
    ad_soyad:     (r.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null,
    beyan_turu:   r.beyan_turu,
    onay_tarihi:  r.onay_tarihi,
    son_net_maas: r.son_net_maas,
    kayit_zamani: r.kayit_zamani,
  }))

  return <MalClient kayitlar={kayitlar} onSil={malBildirimSil} />
}
