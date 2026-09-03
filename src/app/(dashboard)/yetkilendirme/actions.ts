'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authUserIdByEmail, authUserIdMapByEmails } from '@/lib/auth-admin-helpers'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { revalidatePath } from 'next/cache'
import {
  yetkiAuditSnapshot,
  writeYetkilendirmeAuditLogSafe,
} from '@/lib/yetkilendirme-audit'
import { MENU_YETKILENDIRME_TABLO_MODULLERI } from '@/lib/menu-yetki'

/** `MENU_YETKILENDIRME_TABLO_MODULLERI` ile aynı sıra/anahtarlar (Terfi tabloda yok). */
const MENU_KEYS = MENU_YETKILENDIRME_TABLO_MODULLERI.map(m => m.key)

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
    .select('sicil_no, rol, menu_izinleri, hesap_aktif')
    .eq('id', profileId)
    .maybeSingle()

  if (!mevcutProfil) return { hata: 'Profil bulunamadı.' }

  const prevMenu = (mevcutProfil.menu_izinleri as Record<string, boolean> | null) ?? {}
  const oncekiSnap = yetkiAuditSnapshot(mevcutProfil)
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

  const sonrakiSnap = yetkiAuditSnapshot({ rol, hesap_aktif, menu_izinleri })
  await writeYetkilendirmeAuditLogSafe(r.supabase, {
    sicil_no: mevcutProfil.sicil_no ?? '',
    islem: 'Profil Güncelle',
    ozet: `${mevcutProfil.sicil_no ?? '—'} yetkilendirme kaydı güncellendi`,
    onceki: oncekiSnap,
    sonraki: sonrakiSnap,
  })

  revalidatePath('/yetkilendirme')
  return {}
}

/** Toplu: seçilen profilleri yönetici yapar (süper erişim; menü alanı boşaltılır) */
export async function appProfilTopluAdmin(profileIds: string[]): Promise<{ hata?: string }> {
  const r = await requireAdmin()
  if (r.error || !r.supabase) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }
  const ids = profileIds.filter(id => /^[0-9a-f-]{36}$/i.test(id))
  if (!ids.length) return { hata: 'Geçerli profil seçilmedi.' }

  const { data: mevcutlar } = await r.supabase
    .from('app_profiles')
    .select('id, sicil_no, rol, menu_izinleri, hesap_aktif')
    .in('id', ids)

  const { error } = await r.supabase
    .from('app_profiles')
    .update({
      rol: 'admin',
      menu_izinleri: {},
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) return { hata: error.message }

  for (const p of mevcutlar ?? []) {
    const oncekiSnap = yetkiAuditSnapshot(p)
    const sonrakiSnap = yetkiAuditSnapshot({ rol: 'admin', hesap_aktif: p.hesap_aktif, menu_izinleri: {} })
    await writeYetkilendirmeAuditLogSafe(r.supabase, {
      sicil_no: p.sicil_no ?? '',
      islem: 'Toplu Yönetici',
      ozet: `${p.sicil_no ?? '—'} yönetici yapıldı (toplu işlem)`,
      onceki: oncekiSnap,
      sonraki: sonrakiSnap,
    })
  }

  revalidatePath('/yetkilendirme')
  return {}
}

export interface TopluYetkiKayit {
  profile_id: string
  rol: 'admin' | 'kullanici'
  hesap_aktif: boolean
  /** Kullanıcı rolünde açık olan modül anahtarları (Terfi hariç) */
  menu: string[]
}

/** Toplu: tabloda değiştirilen satırların rol/erişim/menü ayarlarını tek seferde kaydeder. */
export async function appProfilTopluKaydet(
  kayitlar: TopluYetkiKayit[],
): Promise<{ hata?: string; guncellenen?: number }> {
  const r = await requireAdmin()
  if (r.error || !r.supabase) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }

  const gecerli = (kayitlar ?? []).filter(
    k =>
      /^[0-9a-f-]{36}$/i.test(k?.profile_id ?? '') &&
      (k.rol === 'admin' || k.rol === 'kullanici'),
  )
  if (!gecerli.length) return { hata: 'Kaydedilecek değişiklik yok.' }

  const { data: mevcutlar, error: okumaHata } = await r.supabase
    .from('app_profiles')
    .select('id, sicil_no, rol, menu_izinleri, hesap_aktif')
    .in(
      'id',
      gecerli.map(k => k.profile_id),
    )
  if (okumaHata) return { hata: okumaHata.message }

  const mevcutMap = new Map((mevcutlar ?? []).map(p => [p.id, p]))
  const simdi = new Date().toISOString()

  const {
    data: { user },
  } = await r.supabase.auth.getUser()

  type AuditSatir = {
    sicil_no: string | null
    modul: string
    islem: string
    ozet: string
    actor_id: string | null
    actor_email: string | null
    ref_table: string
    ref_id: string | null
    onceki: unknown
    sonraki: unknown
  }
  const auditSatirlari: AuditSatir[] = []

  const isler = gecerli
    .map(k => {
      const mevcut = mevcutMap.get(k.profile_id)
      if (!mevcut) return null

      const prevMenu = (mevcut.menu_izinleri as Record<string, boolean> | null) ?? {}
      const secili: Record<string, boolean> = {}
      for (const key of k.menu) {
        if (MENU_KEYS.includes(key as (typeof MENU_KEYS)[number])) secili[key] = true
      }
      /** Yetkilendirme tablosunda «Terfi» yok; mevcut `terfi` bayrağını koru */
      const menu_izinleri =
        k.rol === 'admin'
          ? {}
          : {
              ...secili,
              ...(typeof prevMenu.terfi === 'boolean' ? { terfi: prevMenu.terfi } : {}),
            }

      auditSatirlari.push({
        sicil_no: mevcut.sicil_no ?? null,
        modul: 'yetkilendirme',
        islem: 'Toplu Kaydet',
        ozet: `${mevcut.sicil_no ?? '—'} yetkilendirme kaydı güncellendi (toplu işlem)`,
        actor_id: user?.id ?? null,
        actor_email: user?.email ?? null,
        ref_table: 'app_profiles',
        ref_id: mevcut.sicil_no ?? null,
        onceki: yetkiAuditSnapshot(mevcut),
        sonraki: yetkiAuditSnapshot({ rol: k.rol, hesap_aktif: k.hesap_aktif, menu_izinleri }),
      })

      return { profile_id: k.profile_id, rol: k.rol, hesap_aktif: k.hesap_aktif, menu_izinleri }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)

  if (!isler.length) return { hata: 'Kaydedilecek profil bulunamadı.' }

  const PARCA = 20
  let guncellenen = 0
  for (let i = 0; i < isler.length; i += PARCA) {
    const parca = isler.slice(i, i + PARCA)
    const sonuclar = await Promise.all(
      parca.map(is =>
        r.supabase!
          .from('app_profiles')
          .update({
            rol: is.rol,
            hesap_aktif: is.hesap_aktif,
            menu_izinleri: is.menu_izinleri,
            updated_at: simdi,
          })
          .eq('id', is.profile_id),
      ),
    )
    const ilkHata = sonuclar.find(s => s.error)?.error
    if (ilkHata) return { hata: ilkHata.message, guncellenen }
    guncellenen += parca.length
  }

  if (auditSatirlari.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: auditHata } = await (r.supabase as any)
      .from('personel_audit_log')
      .insert(auditSatirlari)
    if (auditHata) console.error('YETKI_TOPLU_AUDIT_FAILED', auditHata)
  }

  revalidatePath('/yetkilendirme')
  return { guncellenen }
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
          'Bu sicil için personel veya ADABEL Personeli kaydında e-posta yok. Önce ilgili kartta e-posta girin veya Auth’ta hesap açıldıktan sonra kişi ilk girişte profil otomatik oluşur.',
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

  await writeYetkilendirmeAuditLogSafe(r.supabase, {
    sicil_no,
    islem: 'Profil Oluştur',
    ozet: `${sicil_no} için yetkilendirme profili oluşturuldu`,
    onceki: null,
    sonraki: yetkiAuditSnapshot({ rol, hesap_aktif, menu_izinleri }),
  })

  revalidatePath('/yetkilendirme')
  return {}
}

export interface TopluOlusturKayit {
  sicil_no: string
  rol: 'admin' | 'kullanici'
  hesap_aktif: boolean
  /** Kullanıcı rolünde açık olan modül anahtarları (Terfi hariç) */
  menu: string[]
}

export interface TopluOlusturSonuc {
  hata?: string
  olusturulan?: number
  /** Personel/ADABEL kaydında e-posta bulunmayan siciller */
  epostasiz?: string[]
  /** E-posta var ama Supabase Auth’ta hesabı olmayan siciller */
  authsiz?: string[]
  /** Auth hesabı zaten başka bir sicilin profiline bağlı olan siciller */
  baglantili?: string[]
}

/** Toplu: profili olmayan sicillere e-posta eşleşmesi ile yetkilendirme profili açar. */
export async function appProfilTopluOlustur(
  kayitlar: TopluOlusturKayit[],
): Promise<TopluOlusturSonuc> {
  const r = await requireAdmin()
  if (r.error || !r.supabase) return { hata: 'Bu işlem için yönetici yetkisi gerekir.' }

  const istekler = new Map<string, TopluOlusturKayit>()
  for (const k of kayitlar ?? []) {
    const sicil = String(k?.sicil_no ?? '').trim()
    if (!sicil) continue
    if (k.rol !== 'admin' && k.rol !== 'kullanici') continue
    if (!istekler.has(sicil)) istekler.set(sicil, { ...k, sicil_no: sicil })
  }
  if (!istekler.size) return { hata: 'Profil açılacak sicil bulunamadı.' }

  const siciller = [...istekler.keys()]

  let admin
  try {
    admin = createServiceRoleClient()
  } catch {
    return {
      hata: 'Toplu oluşturma için sunucuda SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı (.env.local / Vercel).',
    }
  }

  /** Uzun `in(...)` listeleri PostgREST URL sınırını aşabildiğinden parça parça sorgulanır. */
  const SICIL_PARCA = 150
  const sicilParcalari: string[][] = []
  for (let i = 0; i < siciller.length; i += SICIL_PARCA) {
    sicilParcalari.push(siciller.slice(i, i + SICIL_PARCA))
  }

  const mevcutProfiller: { sicil_no: string | null }[] = []
  const calisanlar: { sicil_no: string; e_posta: string | null }[] = []
  const firmalar: { sicil_no: string | null; e_posta: string | null }[] = []

  for (const parca of sicilParcalari) {
    const [prof, cal, firma] = await Promise.all([
      r.supabase.from('app_profiles').select('sicil_no').in('sicil_no', parca),
      r.supabase.from('calisan').select('sicil_no, e_posta').in('sicil_no', parca),
      r.supabase
        .from('firma_calisanlar')
        .select('sicil_no, e_posta, kayit_zamani')
        .in('sicil_no', parca)
        .is('ayrilis_tarihi', null)
        .order('kayit_zamani', { ascending: false }),
    ])
    const ilkHata = prof.error ?? cal.error ?? firma.error
    if (ilkHata) return { hata: ilkHata.message }
    mevcutProfiller.push(...(prof.data ?? []))
    calisanlar.push(...(cal.data ?? []))
    firmalar.push(...(firma.data ?? []))
  }

  const profilliSet = new Set(mevcutProfiller.map(p => p.sicil_no))
  const epostaBySicil = new Map<string, string>()
  for (const f of firmalar) {
    const e = (f.e_posta ?? '').trim().toLowerCase()
    if (f.sicil_no && e && !epostaBySicil.has(f.sicil_no)) epostaBySicil.set(f.sicil_no, e)
  }
  /** Personel kaydı ADABEL kaydına göre önceliklidir (tekli oluşturma ile aynı sıra) */
  for (const c of calisanlar) {
    const e = (c.e_posta ?? '').trim().toLowerCase()
    if (c.sicil_no && e) epostaBySicil.set(c.sicil_no, e)
  }

  const epostasiz: string[] = []
  const authsiz: string[] = []
  const baglantili: string[] = []
  const hedefler: { sicil_no: string; email: string; kayit: TopluOlusturKayit }[] = []

  for (const sicil of siciller) {
    if (profilliSet.has(sicil)) continue
    const email = epostaBySicil.get(sicil)
    if (!email) {
      epostasiz.push(sicil)
      continue
    }
    hedefler.push({ sicil_no: sicil, email, kayit: istekler.get(sicil)! })
  }

  if (!hedefler.length) return { olusturulan: 0, epostasiz, authsiz, baglantili }

  const authMap = await authUserIdMapByEmails(
    admin,
    hedefler.map(h => h.email),
  )

  /** Auth hesabı başka bir sicile bağlıysa insert birincil anahtar çakışmasıyla tüm partiyi düşürür */
  const bagliAuthId = new Set<string>()
  const cozulenIdler = [...new Set([...authMap.values()])]
  for (let i = 0; i < cozulenIdler.length; i += SICIL_PARCA) {
    const { data, error } = await r.supabase
      .from('app_profiles')
      .select('id')
      .in('id', cozulenIdler.slice(i, i + SICIL_PARCA))
    if (error) return { hata: error.message }
    for (const p of data ?? []) bagliAuthId.add(p.id)
  }

  const simdi = new Date().toISOString()
  const eklenecekler: {
    id: string
    sicil_no: string
    rol: 'admin' | 'kullanici'
    hesap_aktif: boolean
    menu_izinleri: Record<string, boolean>
    ilk_giris_tamam: boolean
    kurtarma_hash: Record<string, never>
    updated_at: string
  }[] = []
  const kullanilanAuthId = new Set<string>()

  for (const h of hedefler) {
    const authUserId = authMap.get(h.email)
    if (!authUserId) {
      authsiz.push(h.sicil_no)
      continue
    }
    if (bagliAuthId.has(authUserId) || kullanilanAuthId.has(authUserId)) {
      baglantili.push(h.sicil_no)
      continue
    }
    kullanilanAuthId.add(authUserId)

    const menu_izinleri: Record<string, boolean> = {}
    if (h.kayit.rol !== 'admin') {
      for (const key of h.kayit.menu) {
        if (MENU_KEYS.includes(key as (typeof MENU_KEYS)[number])) menu_izinleri[key] = true
      }
    }

    eklenecekler.push({
      id: authUserId,
      sicil_no: h.sicil_no,
      rol: h.kayit.rol,
      hesap_aktif: h.kayit.hesap_aktif,
      menu_izinleri,
      ilk_giris_tamam: false,
      kurtarma_hash: {},
      updated_at: simdi,
    })
  }

  if (!eklenecekler.length) return { olusturulan: 0, epostasiz, authsiz, baglantili }

  const { error } = await r.supabase.from('app_profiles').insert(eklenecekler)
  if (error) return { hata: error.message, epostasiz, authsiz, baglantili }

  const {
    data: { user },
  } = await r.supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: auditHata } = await (r.supabase as any).from('personel_audit_log').insert(
    eklenecekler.map(e => ({
      sicil_no: e.sicil_no,
      modul: 'yetkilendirme',
      islem: 'Toplu Profil Oluştur',
      ozet: `${e.sicil_no} için yetkilendirme profili oluşturuldu (toplu işlem)`,
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      ref_table: 'app_profiles',
      ref_id: e.sicil_no,
      onceki: null,
      sonraki: yetkiAuditSnapshot({
        rol: e.rol,
        hesap_aktif: e.hesap_aktif,
        menu_izinleri: e.menu_izinleri,
      }),
    })),
  )
  if (auditHata) console.error('YETKI_TOPLU_OLUSTUR_AUDIT_FAILED', auditHata)

  revalidatePath('/yetkilendirme')
  return { olusturulan: eklenecekler.length, epostasiz, authsiz, baglantili }
}
