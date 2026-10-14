import LoginFormClient from './LoginFormClient'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

async function yayindakiAnketler(): Promise<{ baslik: string; kod: string }[]> {
  const sb = tryCreateServiceRoleClient()
  if (!sb) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any)
    .from('anketler')
    .select('baslik, kod')
    .eq('durum', 'yayinda')
    .order('created_at', { ascending: true })
  return ((data ?? []) as { baslik: string; kod: string }[]).map(a => ({
    baslik: String(a.baslik),
    kod: String(a.kod),
  }))
}

export default async function LoginPage() {
  const anketler = await yayindakiAnketler()
  return <LoginFormClient anketler={anketler} />
}
