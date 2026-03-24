import { createClient } from '@/lib/supabase/server'
import MalClient, { type MalBildirimi } from '@/components/bildirim/MalClient'
import { malBildirimSil } from './actions'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

export default async function MalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  let q = supabase
    .from('mal_bildirimi')
    .select('id, public_id, sicil_no, beyan_turu, onay_tarihi, son_net_maas, kayit_zamani, calisan(ad_soyad)')
  if (!isAdminLike(access) && access.mode === 'kullanici') {
    q = q.eq('sicil_no', access.sicilNo)
  }
  const { data: raw } = await q.order('kayit_zamani', { ascending: false })

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

  return (
    <MalClient
      kayitlar={kayitlar}
      onSil={malBildirimSil}
      kullaniciModu={access.mode === 'kullanici'}
    />
  )
}
