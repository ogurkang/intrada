import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AppProfileEnsure = {
  id: string
  sicil_no: string | null
  ilk_giris_tamam: boolean
  profil_turu: string
  ad_soyad: string | null
}

const SELECT_TAM = 'id, sicil_no, ilk_giris_tamam, profil_turu, ad_soyad'
const SELECT_ESKI = 'id, sicil_no, ilk_giris_tamam'

function satiraNormalize(row: {
  id: string
  sicil_no: string | null
  ilk_giris_tamam: boolean
  profil_turu?: string | null
  ad_soyad?: string | null
}): AppProfileEnsure {
  return {
    id: row.id,
    sicil_no: row.sicil_no,
    ilk_giris_tamam: row.ilk_giris_tamam,
    profil_turu: row.profil_turu ?? 'personel',
    ad_soyad: row.ad_soyad ?? null,
  }
}

async function profilGetir(supabase: SupabaseClient, userId: string): Promise<AppProfileEnsure | null> {
  const tam = await supabase
    .from('app_profiles')
    .select(SELECT_TAM)
    .eq('id', userId)
    .maybeSingle()

  if (!tam.error && tam.data) return satiraNormalize(tam.data)

  // Migration henüz uygulanmamışsa yeni kolonlar yok; eski şema ile devam et.
  if (tam.error) {
    const eski = await supabase
      .from('app_profiles')
      .select(SELECT_ESKI)
      .eq('id', userId)
      .maybeSingle()
    if (!eski.error && eski.data) return satiraNormalize(eski.data)
  }

  return null
}

/**
 * Giriş yapan kullanıcının e-postası `calisan.e_posta` ile eşleşiyorsa `app_profiles` oluşturur.
 * Döndürür: mevcut veya yeni oluşturulan profil satırı (ilk_giris_tamam dahil).
 */
export async function ensureAppProfileForAuthUser(
  supabase: SupabaseClient,
  user: User,
): Promise<AppProfileEnsure | null> {
  const mevcut = await profilGetir(supabase, user.id)
  if (mevcut) return mevcut

  const email = (user.email ?? '').trim().toLowerCase()
  if (!email) return null

  // ilike: büyük/küçük harf duyarsız eşleşme. limit(1): aynı e-posta birden fazla satırda olursa maybeSingle hata vermesin.
  const { data: calisanRows, error: calErr } = await supabase
    .from('calisan')
    .select('sicil_no')
    .ilike('e_posta', email)
    .limit(1)

  if (calErr || !calisanRows?.length) return null
  const calisan = calisanRows[0]
  if (!calisan.sicil_no) return null

  const { error } = await supabase.from('app_profiles').insert({
    id: user.id,
    sicil_no: calisan.sicil_no,
    rol: 'kullanici',
    menu_izinleri: {},
    ilk_giris_tamam: false,
    kurtarma_hash: {},
  })

  if (error && error.code !== '23505') return null

  return profilGetir(supabase, user.id)
}
