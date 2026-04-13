import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppAccess } from '@/lib/app-access'

/** Oturum kullanıcısının `app_profiles.sicil_no` + kadro → müdürlük (bütçe işlemleri vb.). */
export async function mudurlukIdFromAuthSession(
  supabase: SupabaseClient,
  userId: string,
  access: AppAccess,
): Promise<number | null> {
  let sicil = ''
  if (access.mode === 'kullanici') {
    sicil = access.sicilNo.trim()
  } else {
    const { data } = await supabase.from('app_profiles').select('sicil_no').eq('id', userId).maybeSingle()
    sicil = (data?.sicil_no ?? '').trim()
  }
  if (!sicil) return null
  return mudurlukIdFromPersonelSicil(supabase, sicil)
}

/** Dolu kadroda asil personelin görev müdürlüğü → `tanim_mudurluk.id` */
export async function mudurlukIdFromPersonelSicil(
  supabase: SupabaseClient,
  sicilNo: string,
): Promise<number | null> {
  const sn = sicilNo.trim()
  if (!sn) return null
  const { data: kh } = await supabase
    .from('kadro_hareketleri')
    .select('gorev_mudurlugu')
    .eq('asil', sn)
    .eq('durumu', 'Dolu')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  const ad = kh?.gorev_mudurlugu?.trim()
  if (!ad) return null
  const { data: m } = await supabase
    .from('tanim_mudurluk')
    .select('id')
    .eq('mudurluk_adi', ad)
    .eq('aktif', true)
    .maybeSingle()
  return m?.id ?? null
}
