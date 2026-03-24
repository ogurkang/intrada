import { createClient } from '@/lib/supabase/server'
import AileClient, { type AileBilgisi, type Cocuk } from '@/components/bildirim/AileClient'
import { aileSil } from './actions'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

export default async function AilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  let q = supabase.from('aile_bildirimi').select('*, calisan(ad_soyad)')
  if (!isAdminLike(access) && access.mode === 'kullanici') {
    q = q.eq('sicil_no', access.sicilNo)
  }
  const { data: raw } = await q.order('sicil_no', { ascending: true })

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
      onSil={aileSil}
      kullaniciModu={access.mode === 'kullanici'}
    />
  )
}
