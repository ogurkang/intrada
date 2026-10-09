import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

export async function anketYoneticiSayfasi() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) redirect('/')
  return { supabase, user }
}
