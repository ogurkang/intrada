import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import type { IckRol } from '@/lib/ick/tanim'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IckDb = any

export type IckYetki = {
  userId: string
  adSoyad: string
  admin: boolean
  koordinator: boolean
  izleyici: boolean
  /** birim_yonetici veya birim_irtibat rolüyle bağlı müdürlük id'leri */
  birimler: number[]
  okuyabilir: boolean
  yukleyebilir: boolean
}

function tabloYok(mesaj: string): boolean {
  return mesaj.includes('ick_') && (mesaj.includes('schema cache') || mesaj.includes('does not exist'))
}

export const ICK_MIGRATION_UYARI =
  'İç kontrol tabloları veritabanında yok. 20261016100000_ic_kontrol_faz1 migration dosyasını çalıştırın.'

export function ickHataMetni(mesaj: string): string {
  return tabloYok(mesaj) ? ICK_MIGRATION_UYARI : mesaj
}

/**
 * Profili olmayan oturum (mode 'full') İKEP'te yönetici sayılmaz; yetki yalnızca
 * app_profiles yöneticisi veya geçerli ick_rol_atama kaydından gelir.
 */
export async function ickYetkiYukle(db: IckDb, userId: string, email?: string | null): Promise<{ yetki: IckYetki; hata?: string }> {
  const access = await getAppAccess(db, userId)
  const admin = access.mode === 'admin'
  const { data: profil } = await db.from('app_profiles').select('ad_soyad, kullanici_adi').eq('id', userId).maybeSingle()
  const adSoyad = String(profil?.ad_soyad || profil?.kullanici_adi || email || 'Kullanıcı').trim()

  const bugun = new Date().toISOString().slice(0, 10)
  const { data, error } = await db
    .from('ick_rol_atama')
    .select('rol, mudurluk_id, baslangic, bitis')
    .eq('user_id', userId)
  const roller = ((data as { rol: IckRol; mudurluk_id: number | null; baslangic: string; bitis: string | null }[] | null) ?? []).filter(
    r => r.baslangic <= bugun && (!r.bitis || r.bitis >= bugun),
  )
  const profilVar = access.mode !== 'full' && access.mode !== 'blocked'
  const koordinator = profilVar && roller.some(r => r.rol === 'koordinator')
  const izleyici = profilVar && roller.some(r => r.rol === 'izleyici')
  const birimler = profilVar
    ? [...new Set(roller.filter(r => (r.rol === 'birim_yonetici' || r.rol === 'birim_irtibat') && r.mudurluk_id != null).map(r => Number(r.mudurluk_id)))]
    : []
  const yetki: IckYetki = {
    userId,
    adSoyad,
    admin,
    koordinator,
    izleyici,
    birimler,
    okuyabilir: admin || (profilVar && roller.length > 0),
    yukleyebilir: koordinator || birimler.length > 0,
  }
  return { yetki, hata: error ? ickHataMetni(error.message) : undefined }
}

export async function ickSayfa(): Promise<{ db: IckDb; yetki: IckYetki; hata?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { yetki, hata } = await ickYetkiYukle(supabase, user.id, user.email)
  return { db: supabase as IckDb, yetki, hata }
}

export const ICK_YETKI_YOK =
  'Bu ekran için iç kontrol rolü tanımlı değil. Rolü yönetici, İç Kontrol › Tanımlar › Rol Atama ekranından verir.'
