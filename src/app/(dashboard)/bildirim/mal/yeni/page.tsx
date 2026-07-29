import { createClient } from '@/lib/supabase/server'
import MalYeniClient from '@/components/bildirim/MalYeniClient'
import { listMemurPersonelForMal } from '@/lib/bildirim-personel'
import {
  fetchMalBildirimFormInitial,
  malBildirimKopyalaInitial,
} from '@/lib/mal-bildirim-detail-load'
import { parseMalBildirimRouteParam } from '@/lib/mal-bildirim-route'
import { malBildirimEkle } from '../actions'
import { getAppAccess } from '@/lib/app-access'

interface Props {
  searchParams: Promise<{ kopyala?: string }>
}

export default async function MalYeniPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kullaniciKendiSicil = access.mode === 'kullanici' ? access.sicilNo.trim() : undefined

  const sp = await searchParams
  const kopyalaParam = sp.kopyala?.trim()
  let kopyalaInitial = undefined
  if (kopyalaParam) {
    const parsed = parseMalBildirimRouteParam(kopyalaParam)
    if (parsed.ok) {
      const kaynak = await fetchMalBildirimFormInitial(supabase, parsed)
      if (kaynak) kopyalaInitial = malBildirimKopyalaInitial(kaynak)
    }
  }

  const memurlar = await listMemurPersonelForMal(supabase)

  return (
    <MalYeniClient
      memurlar={memurlar}
      onKaydet={malBildirimEkle}
      kullaniciKendiSicil={kullaniciKendiSicil}
      kopyalaInitial={kopyalaInitial}
    />
  )
}
