'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  disDenetciAuthEmail,
  kullaniciAdiGecerliMi,
  kullaniciAdiHataMetni,
  normalizeKullaniciAdi,
} from '@/lib/kullanici-adi'
import { disDenetciSifreGecerliMi, disDenetciSifreHataMetni } from '@/lib/dis-denetci-sifre'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export type DisDenetciActionSonuc = { ok?: true; hata?: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const access = await getAppAccess(supabase, user.id)
  return isAdminLike(access) ? { supabase, user } : null
}

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export async function disDenetciOlustur(formData: FormData): Promise<DisDenetciActionSonuc> {
  const adminGate = await requireAdmin()
  if (!adminGate) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }

  const kullaniciAdi = normalizeKullaniciAdi(text(formData, 'kullanici_adi'))
  const adSoyad = text(formData, 'ad_soyad')
  const kurumAdi = text(formData, 'kurum_adi')
  const iletisimEposta = text(formData, 'e_posta').toLowerCase() || null
  const sifre = text(formData, 'sifre')

  if (!kullaniciAdiGecerliMi(kullaniciAdi)) return { hata: kullaniciAdiHataMetni() }
  if (adSoyad.length < 3 || adSoyad.length > 120) return { hata: 'Ad soyad 3–120 karakter olmalıdır.' }
  if (kurumAdi.length < 2 || kurumAdi.length > 160) return { hata: 'Kurum adı 2–160 karakter olmalıdır.' }
  if (iletisimEposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(iletisimEposta)) {
    return { hata: 'Geçerli bir e-posta girin veya alanı boş bırakın.' }
  }
  if (!disDenetciSifreGecerliMi(sifre)) return { hata: disDenetciSifreHataMetni() }

  const { data: mevcut } = await adminGate.supabase
    .from('app_profiles')
    .select('id')
    .eq('profil_turu', 'dis_denetci')
    .ilike('kullanici_adi', kullaniciAdi)
    .maybeSingle()
  if (mevcut) return { hata: 'Bu kullanıcı adı zaten kullanılıyor.' }

  let service
  try {
    service = createServiceRoleClient()
  } catch {
    return { hata: 'Dış denetçi hesabı oluşturmak için sunucu Auth yönetim anahtarı tanımlı değil.' }
  }

  const authEmail = disDenetciAuthEmail(kullaniciAdi)
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: authEmail,
    password: sifre,
    email_confirm: true,
    user_metadata: { profil_turu: 'dis_denetci', kullanici_adi: kullaniciAdi },
  })
  if (authError || !authData.user) {
    return { hata: authError?.message.includes('already') ? 'Bu kullanıcı adı zaten kullanılıyor.' : 'Kullanıcı hesabı oluşturulamadı.' }
  }

  const { error: profileError } = await service.from('app_profiles').insert({
    id: authData.user.id,
    sicil_no: null,
    rol: 'dis_denetci',
    profil_turu: 'dis_denetci',
    kullanici_adi: kullaniciAdi,
    ad_soyad: adSoyad,
    kurum_adi: kurumAdi,
    e_posta: iletisimEposta,
    hesap_aktif: true,
    menu_izinleri: { denetimYonetimi: true },
    ilk_giris_tamam: true,
    kurtarma_hash: {},
  })

  if (profileError) {
    await service.auth.admin.deleteUser(authData.user.id)
    return { hata: profileError.code === '23505' ? 'Bu kullanıcı adı veya e-posta zaten kullanılıyor.' : profileError.message }
  }

  await writePersonelAuditLogSafe(adminGate.supabase, {
    modul: 'yetkilendirme',
    islem: 'Dış Denetçi Oluştur',
    ozet: `${kullaniciAdi} dış denetçi hesabı oluşturuldu.`,
    ref_table: 'app_profiles',
    ref_id: authData.user.id,
    sonraki: { kullanici_adi: kullaniciAdi, ad_soyad: adSoyad, kurum_adi: kurumAdi, hesap_aktif: true },
  })
  revalidatePath('/yetkilendirme/dis-denetciler')
  return { ok: true }
}

export async function disDenetciGuncelle(formData: FormData): Promise<DisDenetciActionSonuc> {
  const adminGate = await requireAdmin()
  if (!adminGate) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }

  const id = text(formData, 'id')
  const adSoyad = text(formData, 'ad_soyad')
  const kurumAdi = text(formData, 'kurum_adi')
  const iletisimEposta = text(formData, 'e_posta').toLowerCase() || null
  const hesapAktif = formData.get('hesap_aktif') === 'on'
  const yeniSifre = text(formData, 'yeni_sifre')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { hata: 'Geçersiz profil.' }
  if (adSoyad.length < 3 || kurumAdi.length < 2) return { hata: 'Ad soyad ve kurum adı zorunludur.' }
  if (iletisimEposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(iletisimEposta)) return { hata: 'E-posta geçersiz.' }
  if (yeniSifre && !disDenetciSifreGecerliMi(yeniSifre)) return { hata: disDenetciSifreHataMetni() }

  const { data: onceki } = await adminGate.supabase
    .from('app_profiles')
    .select('id, kullanici_adi, ad_soyad, kurum_adi, e_posta, hesap_aktif')
    .eq('id', id)
    .eq('profil_turu', 'dis_denetci')
    .maybeSingle()
  if (!onceki) return { hata: 'Dış denetçi bulunamadı.' }

  let service
  try {
    service = createServiceRoleClient()
  } catch {
    return { hata: 'Sunucu Auth yönetim anahtarı tanımlı değil.' }
  }
  if (yeniSifre) {
    const { error } = await service.auth.admin.updateUserById(id, { password: yeniSifre })
    if (error) return { hata: 'Yeni şifre kaydedilemedi.' }
  }

  const { error } = await service.from('app_profiles').update({
    ad_soyad: adSoyad,
    kurum_adi: kurumAdi,
    e_posta: iletisimEposta,
    hesap_aktif: hesapAktif,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('profil_turu', 'dis_denetci')
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(adminGate.supabase, {
    modul: 'yetkilendirme',
    islem: 'Dış Denetçi Güncelle',
    ozet: `${onceki.kullanici_adi} dış denetçi hesabı güncellendi.`,
    ref_table: 'app_profiles',
    ref_id: id,
    onceki,
    sonraki: { ...onceki, ad_soyad: adSoyad, kurum_adi: kurumAdi, e_posta: iletisimEposta, hesap_aktif: hesapAktif },
  })
  revalidatePath('/yetkilendirme/dis-denetciler')
  return { ok: true }
}
