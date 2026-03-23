import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MalDetayClient from '@/components/bildirim/MalDetayClient'
import { parseMalBildirimRouteParam } from '@/lib/mal-bildirim-route'
import { fetchMalBildirimDetayKayit } from '@/lib/mal-bildirim-detail-load'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ salt?: string }>
}

/** İsim `Page` tutulur: React 19 geliştirme modunda özel isimlerle `performance.measure` bazen negatif süre hatası verebiliyor. */
export default async function Page({ params, searchParams }: Props) {
  const { id } = await params
  const { salt } = await searchParams
  const parsed = parseMalBildirimRouteParam(id)
  if (!parsed.ok) notFound()

  const supabase = await createClient()
  const kayit = await fetchMalBildirimDetayKayit(supabase, parsed)
  if (!kayit) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (!isAdminLike(access)) {
    if (access.mode !== 'kullanici') notFound()
    const sn = access.sicilNo.trim()
    if (!sn || sn !== String(kayit.sicil_no).trim()) notFound()
  }

  const saltOkunur =
    salt === '1' &&
    access.mode === 'kullanici' &&
    String(access.sicilNo).trim() === String(kayit.sicil_no).trim()

  return <MalDetayClient kayit={kayit} saltOkunur={saltOkunur} />
}
