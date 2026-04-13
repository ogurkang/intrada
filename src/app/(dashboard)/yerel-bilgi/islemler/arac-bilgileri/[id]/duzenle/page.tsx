import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { mudurlukIdFromPersonelSicil } from '@/lib/kadro-mudurluk-id'
import AracBilgileriDuzenleClient from '@/components/yerel-bilgi/AracBilgileriDuzenleClient'

export default async function AracBilgileriDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: raw } = await params
  const id = Number(raw)
  if (!Number.isFinite(id) || id <= 0) notFound()

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

  const { data: arac, error } = await supabase.from('yerel_bilgi_arac').select('*').eq('id', id).maybeSingle()
  if (error || !arac) notFound()

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

  const baslangic = {
    sahiplik_durum_id: String(arac.sahiplik_durum_id),
    arac_durum_id: String(arac.arac_durum_id),
    arac_turu_id: String(arac.arac_turu_id),
    arac_alt_tur_id: String(arac.arac_alt_tur_id),
    plaka_no: arac.plaka_no ?? '',
    sasi_no: arac.sasi_no ?? '',
    mudurluk_id: String(arac.mudurluk_id),
  }

  return (
    <AracBilgileriDuzenleClient
      kayitId={id}
      isAdmin={isAdmin}
      kullaniciMudurlukId={kullaniciMudurlukId}
      kullaniciMudurlukAdi={kullaniciMudurlukAdi}
      baslangic={baslangic}
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
