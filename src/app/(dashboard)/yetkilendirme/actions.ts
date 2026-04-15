'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authUserIdByEmail } from '@/lib/auth-admin-helpers'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { revalidatePath } from 'next/cache'

/** `MENU_YETKILENDIRME_TABLO_MODULLERI` ile aynı sıra/anahtarlar (Terfi tabloda yok). */
const MENU_KEYS = [
  'personel',
  'rapor',
  'izin',
  'bildirim',
  'kesintiler',
  'egitim',
  'yerelBilgi',
  'yetkilendirme',
  'tanimlar',
] as const

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' as const, supabase: null as null }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { error: 'forbidden' as const, supabase: null as null }
  return { supabase, userId: user.id }
}

/** Sadece işaretli (on) olanlar `true` — boş = hiçbir menü yok */
function menuFormdanOku(formData: FormData): Record<string, boolean> {
  const menu_izinleri: Record<string, boolean> = {}
  for (const k of MENU_KEYS) {
    if (formData.get(`menu_${k}`) === 'on') menu_izinleri[k] = true
  }
  return menu_izinleri
}

export async function appProfilGuncelle(
  _prev: unknown,
  formData: FormData,
): Promise<{ hata?: string }> {
  const r = await requireAdmin()
  if (r.error || !r.supabase) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }

  const profileId = String(formData.get('profile_id') ?? '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return { hata: 'Geçersiz profil.' }

  const rol = String(formData.get('rol') ?? '').trim()
  if (rol !== 'admin' && rol !== 'kullanici') return { hata: 'Geçersiz rol.' }
  const hesap_aktif = formData.get('hesap_aktif') === 'on'

  const { data: mevcutProfil } = await r.supabase
    .from('app_profiles')
    .select('menu_izinleri')
    .eq('id', profileId)
    .maybeSingle()

  const prevMenu = (mevcutProfil?.menu_izinleri as Record<string, boolean> | null) ?? {}
  const formdan = menuFormdanOku(formData)
  /** Yetkilendirme tablosunda «Terfi» yok; mevcut `terfi` bayrağını koru */
  const menu_izinleri =
    rol === 'admin'
      ? {}
      : {
          ...formdan,
          ...(typeof prevMenu.terfi === 'boolean' ? { terfi: prevMenu.terfi } : {}),
        }

  const { error } = await r.supabase
    .from('app_profiles')
    .update({
      rol,
      hesap_aktif,
      menu_izinleri,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)

  if (error) return { hata: error.message }
  revalidatePath('/yetkilendirme')
  return {}
}

/** Toplu: seçilen profilleri yönetici yapar (süper erişim; menü alanı boşaltılır) */
export async function appProfilTopluAdmin(profileIds: string[]): Promise<{ hata?: string }> {
  const r = await requireAdmin()
  if (r.error || !r.supabase) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }
  const ids = profileIds.filter(id => /^[0-9a-f-]{36}$/i.test(id))
  if (!ids.length) return { hata: 'Geçerli profil seçilmedi.' }

  const { error } = await r.supabase
    .from('app_profiles')
    .update({
      rol: 'admin',
      menu_izinleri: {},
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) return { hata: error.message }
  revalidatePath('/yetkilendirme')
  return {}
}

export async function appProfilOlustur(_prev: unknown, formData: FormData): Promise<{ hata?: string }> {
  const r = await requireAdmin()
  if (r.error || !r.supabase) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }

  const sicil_no = String(formData.get('sicil_no') ?? '').trim()
  const rol = String(formData.get('rol') ?? '').trim()
  const uuidElle = String(formData.get('auth_user_id') ?? '').trim()
  const hesap_aktif = formData.get('hesap_aktif') === 'on'

  if (!sicil_no) return { hata: 'Sicil numarası eksik.' }
  if (rol !== 'admin' && rol !== 'kullanici') return { hata: 'Geçersiz rol.' }

  let authUserId: string | null = null
  let calisanVarMi = false
  let calisanTemel:
    | {
        ad_soyad: string
        e_posta: string | null
        telefon: string | null
        cinsiyet: string | null
        dogum_tarihi: string | null
        tckn: string | null
      }
    | null = null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuidElle)) {
    authUserId = uuidElle
  } else {
    const [{ data: cal, error: calErr }, { data: firma, error: firmaErr }] = await Promise.all([
      r.supabase
        .from('calisan')
        .select('ad_soyad, e_posta, telefon, cinsiyet, dogum_tarihi, tckn')
        .eq('sicil_no', sicil_no)
        .maybeSingle(),
      r.supabase
        .from('firma_calisanlar')
        .select('ad_soyad, e_posta, telefon, cinsiyet, dogum_tarihi, tckn, ayrilis_tarihi')
        .eq('sicil_no', sicil_no)
        .is('ayrilis_tarihi', null)
        .order('kayit_zamani', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (calErr) return { hata: calErr.message }
    if (firmaErr) return { hata: firmaErr.message }
    calisanVarMi = Boolean(cal)
    calisanTemel = cal
      ? {
          ad_soyad: cal.ad_soyad,
          e_posta: cal.e_posta,
          telefon: cal.telefon,
          cinsiyet: cal.cinsiyet,
          dogum_tarihi: cal.dogum_tarihi,
          tckn: cal.tckn,
        }
      : firma
        ? {
            ad_soyad: firma.ad_soyad ?? sicil_no,
            e_posta: firma.e_posta,
            telefon: firma.telefon,
            cinsiyet: firma.cinsiyet,
            dogum_tarihi: firma.dogum_tarihi,
            tckn: firma.tckn,
          }
        : null

    const email = ((calisanTemel?.e_posta ?? null) ?? '').trim().toLowerCase()
    if (!email) {
      return {
        hata:
          'Bu sicil için personel/firma personel kaydında e-posta yok. Önce ilgili kartta e-posta girin veya Auth’ta hesap açıldıktan sonra kişi ilk girişte profil otomatik oluşur.',
      }
    }

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      return {
        hata:
          'Otomatik eşleştirme için sunucuda SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı (.env.local / Vercel).',
      }
    }

    authUserId = await authUserIdByEmail(admin, email)
    if (!authUserId) {
      return {
        hata: `Bu e-posta (${email}) ile Supabase Auth’ta kullanıcı yok. Önce “Kullanıcılar”da hesap oluşturun veya toplu script (npm run bulk-auth-users) çalıştırın.`,
      }
    }
  }

  const menu_izinleri = rol === 'admin' ? {} : menuFormdanOku(formData)

  if (!calisanVarMi) {
    if (!calisanTemel?.ad_soyad?.trim()) {
      return { hata: 'Bu sicil için ana personel kaydı oluşturulamadı: ad soyad bilgisi eksik.' }
    }
    const { error: calInsertErr } = await r.supabase.from('calisan').insert({
      sicil_no,
      ad_soyad: calisanTemel.ad_soyad.trim(),
      e_posta: calisanTemel.e_posta ?? null,
      telefon: calisanTemel.telefon ?? null,
      cinsiyet: calisanTemel.cinsiyet ?? null,
      dogum_tarihi: calisanTemel.dogum_tarihi ?? null,
      tckn: calisanTemel.tckn ?? null,
    })
    if (calInsertErr) return { hata: `Ana personel kaydı açılamadı: ${calInsertErr.message}` }
  }

  const { error } = await r.supabase.from('app_profiles').insert({
    id: authUserId!,
    sicil_no,
    rol,
    hesap_aktif,
    menu_izinleri,
    ilk_giris_tamam: false,
    kurtarma_hash: {},
    updated_at: new Date().toISOString(),
  })

  if (error) return { hata: error.message }
  revalidatePath('/yetkilendirme')
  return {}
}
