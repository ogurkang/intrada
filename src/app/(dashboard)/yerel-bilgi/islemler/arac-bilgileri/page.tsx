import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { mudurlukIdFromPersonelSicil } from '@/lib/kadro-mudurluk-id'
import AracBilgileriGirisClient, {
  type AracBilgiListeSatir,
} from '@/components/yerel-bilgi/AracBilgileriGirisClient'

export default async function AracBilgileriPage() {
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
    { data: mudurluklerRaw },
    { data: aracRaw, error: aracErr },
    { data: sahipliklerRaw },
    { data: durumlarRaw },
    { data: turlerRaw },
    { data: altTurlerRaw },
  ] = await Promise.all([
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase.from('yerel_bilgi_arac').select('*').order('sira_no', { ascending: true }).limit(500),
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
  ])

  const sahiMap = new Map((sahipliklerRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const durMap = new Map((durumlarRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const turMap = new Map((turlerRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const altMap = new Map((altTurlerRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const mudMap = new Map((mudurluklerRaw ?? []).map(r => [r.id, r.mudurluk_adi]))

  const liste: AracBilgiListeSatir[] = (aracRaw ?? []).map(r => {
    const plaka = (r.plaka_no ?? '').trim()
    const row = r as typeof r & { sira_no?: number; aktif?: boolean }
    return {
      id: r.id,
      sira_no: typeof row.sira_no === 'number' ? row.sira_no : r.id,
      sahiplik_adi: sahiMap.get(r.sahiplik_durum_id) ?? '—',
      durum_adi: durMap.get(r.arac_durum_id) ?? '—',
      tur_adi: turMap.get(r.arac_turu_id) ?? '—',
      alt_tur_adi: altMap.get(r.arac_alt_tur_id) ?? '—',
      plaka_etiket: plaka.length > 0 ? 'Var' : 'Yok',
      sasi_goster: (r.sasi_no ?? '').trim(),
      mudurluk_adi: mudMap.get(r.mudurluk_id) ?? '—',
      aktif: row.aktif !== false,
      created_at: r.created_at,
    }
  })

  const kullaniciMudurlukAdi =
    kullaniciMudurlukId != null ? mudMap.get(kullaniciMudurlukId) ?? null : null

  return (
    <>
      {aracErr && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {aracErr.message}
        </div>
      )}
      <AracBilgileriGirisClient
        isAdmin={isAdmin}
        kullaniciMudurlukId={kullaniciMudurlukId}
        kullaniciMudurlukAdi={kullaniciMudurlukAdi}
        initialListe={liste}
      />
    </>
  )
}
