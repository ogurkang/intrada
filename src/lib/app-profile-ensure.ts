import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Giriş yapan kullanıcının e-postası `calisan.e_posta` ile eşleşiyorsa `app_profiles` oluşturur.
 * Döndürür: mevcut veya yeni oluşturulan profil satırı (ilk_giris_tamam dahil).
 */
export async function ensureAppProfileForAuthUser(
  supabase: SupabaseClient,
  user: User,
): Promise<{ id: string; sicil_no: string | null; ilk_giris_tamam: boolean; profil_turu: string; ad_soyad: string | null } | null> {
  const { data: mevcut } = await supabase
    .from('app_profiles')
    .select('id, sicil_no, ilk_giris_tamam, profil_turu, ad_soyad')
    .eq('id', user.id)
    .maybeSingle()

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

  const { data: inserted, error } = await supabase
    .from('app_profiles')
    .insert({
      id: user.id,
      sicil_no: calisan.sicil_no,
      rol: 'kullanici',
      menu_izinleri: {},
      ilk_giris_tamam: false,
      kurtarma_hash: {},
      profil_turu: 'personel',
    })
    .select('id, sicil_no, ilk_giris_tamam, profil_turu, ad_soyad')
    .single()

  if (error?.code === '23505') {
    const { data: again } = await supabase
      .from('app_profiles')
      .select('id, sicil_no, ilk_giris_tamam, profil_turu, ad_soyad')
      .eq('id', user.id)
      .maybeSingle()
    return again ?? null
  }

  if (error || !inserted) return null
  return inserted
}
