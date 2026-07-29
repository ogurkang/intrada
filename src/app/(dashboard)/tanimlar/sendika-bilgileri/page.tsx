import { createClient } from '@/lib/supabase/server'
import SendikaBilgileriTanimClient from '@/components/tanimlar/SendikaBilgileriTanimClient'
import { sortTanimSendika } from '@/lib/sendika-sira'
import type { Tables } from '@/types/database'

export default async function SendikaBilgileriPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('tanim_sendika').select('*')
  const rows = sortTanimSendika((data ?? []) as Tables<'tanim_sendika'>[])

  return <SendikaBilgileriTanimClient data={rows} />
}
