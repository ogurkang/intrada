import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { mudurlukIdFromPersonelSicil } from '@/lib/kadro-mudurluk-id'
import AracBilgileriEkleClient from '@/components/yerel-bilgi/AracBilgileriEkleClient'

export const metadata: Metadata = {
  title: 'Araç ekle',
}

export default async function AracBilgileriEklePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getAppAccess(supabase, user.id)
  const isAdmin = isAdminLike(access)

  let kullaniciMudurlukId: number | null = null
  if (!isAdmin && access.mode === 'kullanici' && access.sicilNo.trim()) {
    kullaniciMudurlukId = await mudurlukIdFromPersonelSicil(supabase, access.sicilNo)
  }

  const [
    { data: sahipliklerRaw },
    { data: durumlarRaw },
    { data: turlerRaw },
    { data: altTurlerRaw },
    { data: mudurluklerRaw },
  ] = await Promise.all([
    supabase
      .from('yerel_bilgi_arac_sahiplik_durum')
      .select('id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('yerel_bilgi_arac_durum')
      .select('id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('yerel_bilgi_arac_turu')
      .select('id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('yerel_bilgi_arac_alt_tur')
      .select('id, arac_turu_id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
  ])

  const mudMap = new Map((mudurluklerRaw ?? []).map(r => [r.id, r.mudurluk_adi]))
  const kullaniciMudurlukAdi =
    kullaniciMudurlukId != null ? mudMap.get(kullaniciMudurlukId) ?? null : null

  return (
    <AracBilgileriEkleClient
      isAdmin={isAdmin}
      kullaniciMudurlukId={kullaniciMudurlukId}
      kullaniciMudurlukAdi={kullaniciMudurlukAdi}
      sahiplikler={(sahipliklerRaw ?? []).map(r => ({ id: r.id, tanim_adi: r.tanim_adi }))}
      durumlar={(durumlarRaw ?? []).map(r => ({ id: r.id, tanim_adi: r.tanim_adi }))}
      turler={(turlerRaw ?? []).map(r => ({ id: r.id, tanim_adi: r.tanim_adi }))}
      altTurler={(altTurlerRaw ?? []).map(r => ({
        id: r.id,
        arac_turu_id: r.arac_turu_id,
        tanim_adi: r.tanim_adi,
      }))}
      mudurlukler={(mudurluklerRaw ?? []).map(r => ({ id: r.id, mudurluk_adi: r.mudurluk_adi }))}
    />
  )
}
