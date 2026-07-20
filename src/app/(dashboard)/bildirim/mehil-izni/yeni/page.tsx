import { createClient } from '@/lib/supabase/server'
import MehilIzniFormClient from '@/components/bildirim/MehilIzniFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getMemurBildirimPersonel,
  listMemurBildirimPersonel,
  type MemurBildirimPersonel,
} from '@/lib/bildirim-memur-personel'
import { mehilIzniEkle } from '../actions'

export default async function MehilIzniYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (access.mode === 'kullanici') {
    const sicil = access.sicilNo.trim()
    const kendi = await getMemurBildirimPersonel(supabase, sicil)
    const personeller: MemurBildirimPersonel[] = kendi ? [kendi] : []
    return (
      <MehilIzniFormClient personeller={personeller} sabitSicil={sicil} onKaydet={mehilIzniEkle} />
    )
  }

  const personeller = await listMemurBildirimPersonel(supabase)
  return <MehilIzniFormClient personeller={personeller} onKaydet={mehilIzniEkle} />
}
