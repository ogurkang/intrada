import { createClient } from '@/lib/supabase/server'
import MalYeniClient from '@/components/bildirim/MalYeniClient'
import { listMemurPersonelForMal } from '@/lib/bildirim-personel'
import { malBildirimEkle } from '../actions'

export default async function MalYeniPage() {
  const supabase = await createClient()
  const memurlar = await listMemurPersonelForMal(supabase)

  return <MalYeniClient memurlar={memurlar} onKaydet={malBildirimEkle} />
}
