import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ickGorunenAd, ickSicilAdlari } from '@/lib/ick/yukle'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import type { IckEylemKisiRol } from '@/lib/ick/tanim'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IckDb = any

export type IckYetki = {
  userId: string
  adSoyad: string
  sicil: string | null
  admin: boolean
  /** En az bir planın iç kontrol koordinatörü */
  koordinator: boolean
  koordinatorPlanlar: number[]
  /** Belediye başkanı veya başkan yardımcısı */
  izleyici: boolean
  /** Eylem bazında seçildiği rol */
  eylemRolleri: Record<number, IckEylemKisiRol>
  /** Müdürlük koordinatörü seçildiği eylemlerin müdürlükleri */
  mudurlukKoordinatoru: number[]
  /** Yalnızca işlemci seçildiği eylemlerin müdürlükleri */
  islemci: number[]
  /** Eylemde seçildiği tüm müdürlükler */
  birimler: number[]
  okuyabilir: boolean
  yukleyebilir: boolean
  /** Koordinatör bir personelin ekranına salt okunur bakıyor */
  onizleme: { sicil: string; adSoyad: string } | null
  /** Gerçek oturum koordinatör veya yönetici; önizleme sırasında da durur */
  onizlemeAcabilir: boolean
}

const ICK_ONIZLEME = 'ick_onizleme'

function tabloYok(mesaj: string): boolean {
  return (
    (mesaj.includes('ick_') && (mesaj.includes('schema cache') || mesaj.includes('does not exist'))) ||
    mesaj.includes('Could not find the function public.ick_')
  )
}

export const ICK_MIGRATION_UYARI =
  'İç kontrol veritabanı güncel değil. 20261016100000_ic_kontrol_faz1, 20261016180000_ic_kontrol_ara_asama, 20261016220000_ic_kontrol_eylem_kisi, 20261016230000_ic_kontrol_vekalet ve 20261016240000_ic_kontrol_ad_unvan migration dosyalarını sırayla çalıştırın.'

export function ickHataMetni(mesaj: string): string {
  return tabloYok(mesaj) ? ICK_MIGRATION_UYARI : mesaj
}

type YetkimRpc = {
  sicil: string | null
  koordinator_planlar: number[]
  izleyici: boolean
  menu: boolean
  mudurlukler: number[]
  eylem_rolleri: { eylem: number; rol: IckEylemKisiRol; mudurluk: number | null }[]
  okuyabilir: boolean
}

/**
 * Roller personel kaydından gelir: plan koordinatörleri plan ekranında, müdürlük
 * koordinatörü ve işlemcisi eylem ekranında sorumlu müdürlüğün personelinden seçilir;
 * izleyici başkan ve başkan yardımcılarıdır.
 * Profili olmayan oturum (mode 'full') İKEP'te yetkili sayılmaz.
 */
export async function ickYetkiYukle(db: IckDb, userId: string, _email?: string | null): Promise<{ yetki: IckYetki; hata?: string }> {
  const access = await getAppAccess(db, userId)
  const admin = access.mode === 'admin'
  const profilVar = access.mode !== 'full' && access.mode !== 'blocked'
  const { data: profil } = await db.from('app_profiles').select('ad_soyad, sicil_no').eq('id', userId).maybeSingle()

  const { data, error } = profilVar ? await db.rpc('ick_yetkim') : { data: null, error: null }
  const r = (data as YetkimRpc | null) ?? null
  const sicilHam = r?.sicil ?? (profil?.sicil_no != null ? String(profil.sicil_no) : null)
  const adlar = sicilHam ? await ickSicilAdlari(db, [sicilHam]) : new Map<string, string>()
  const kayitli = String(profil?.ad_soyad ?? '').trim()
  const adSoyad = adlar.get(String(sicilHam ?? '').trim()) || (kayitli && !/^\d+$/.test(kayitli) ? kayitli : '') || 'Kullanıcı'
  const koordinatorPlanlar = (r?.koordinator_planlar ?? []).map(Number)
  const eylemRolleri: Record<number, IckEylemKisiRol> = {}
  const mkSet = new Set<number>()
  const isSet = new Set<number>()
  for (const x of r?.eylem_rolleri ?? []) {
    eylemRolleri[Number(x.eylem)] = x.rol
    if (x.mudurluk == null) continue
    if (x.rol === 'mudurluk_koordinatoru') mkSet.add(Number(x.mudurluk))
    else isSet.add(Number(x.mudurluk))
  }
  const mudurlukKoordinatoru = [...mkSet]
  const islemci = [...isSet].filter(m => !mkSet.has(m))
  const birimler = [...new Set([...mkSet, ...isSet])]
  const yetki: IckYetki = {
    userId,
    adSoyad,
    sicil: r?.sicil ?? null,
    admin,
    koordinator: koordinatorPlanlar.length > 0,
    koordinatorPlanlar,
    izleyici: Boolean(r?.izleyici),
    eylemRolleri,
    mudurlukKoordinatoru,
    islemci,
    birimler,
    okuyabilir: admin || Boolean(r?.okuyabilir),
    yukleyebilir: koordinatorPlanlar.length > 0 || birimler.length > 0,
    onizleme: null,
    onizlemeAcabilir: admin || koordinatorPlanlar.length > 0,
  }
  if (yetki.onizlemeAcabilir) {
    const hedef = (await cookies()).get(ICK_ONIZLEME)?.value?.trim()
    if (hedef) await ickOnizlemeUygula(db, yetki, hedef)
  }
  return { yetki, hata: error ? ickHataMetni(error.message) : undefined }
}

async function ickOnizlemeUygula(db: IckDb, yetki: IckYetki, sicil: string): Promise<boolean> {
  const { data: kisiler } = await db.from('ick_eylem_kisi').select('eylem_id, rol, ad_soyad').eq('sicil_no', sicil)
  const liste = (kisiler ?? []) as { eylem_id: number; rol: IckEylemKisiRol; ad_soyad: string }[]
  if (!liste.length) return false
  const idler = [...new Set(liste.map(k => Number(k.eylem_id)))]
  const { data: eylemler } = await db.from('ick_eylem').select('id, sorumlu_mudurluk_id').in('id', idler)
  const mudurluk = new Map(((eylemler ?? []) as { id: number; sorumlu_mudurluk_id: number | null }[]).map(e => [Number(e.id), e.sorumlu_mudurluk_id]))
  const roller: Record<number, IckEylemKisiRol> = {}
  const mk = new Set<number>()
  const islem = new Set<number>()
  for (const k of liste) {
    const id = Number(k.eylem_id)
    const onceki = roller[id]
    if (onceki === 'mudurluk_koordinatoru') continue
    roller[id] = k.rol
    const birim = mudurluk.get(id)
    if (birim == null) continue
    if (k.rol === 'mudurluk_koordinatoru') mk.add(Number(birim))
    else islem.add(Number(birim))
  }
  const adlar = await ickSicilAdlari(db, [sicil])
  yetki.onizleme = { sicil, adSoyad: ickGorunenAd(sicil, liste[0].ad_soyad, adlar) }
  yetki.sicil = sicil
  yetki.adSoyad = yetki.onizleme.adSoyad
  yetki.admin = false
  yetki.koordinator = false
  yetki.koordinatorPlanlar = []
  yetki.izleyici = false
  yetki.eylemRolleri = roller
  yetki.mudurlukKoordinatoru = [...mk]
  yetki.islemci = [...islem].filter(m => !mk.has(m))
  yetki.birimler = [...new Set([...mk, ...islem])]
  yetki.okuyabilir = true
  yetki.yukleyebilir = false
  return true
}

export function ickPlanKoordinatoru(yetki: IckYetki, planId: number): boolean {
  if (yetki.onizleme) return false
  return yetki.koordinatorPlanlar.includes(Number(planId))
}

/** Eyleme bildirim taslağı girebilir mi (veritabanındaki ick_eylem_yazabilir ile aynı kural) */
export function ickEylemYazabilir(yetki: IckYetki, e: { id: number; plan_id: number; sorumlu_tur: string }): boolean {
  if (yetki.onizleme) return false
  if (e.sorumlu_tur === 'ust_yonetim') return ickPlanKoordinatoru(yetki, e.plan_id)
  return yetki.eylemRolleri[Number(e.id)] != null
}

/** Bildirimi koordinatöre gönderebilir mi (ick_eylem_gonderebilir ile aynı kural) */
export function ickEylemGonderebilir(yetki: IckYetki, e: { id: number; plan_id: number; sorumlu_tur: string }): boolean {
  if (yetki.onizleme) return false
  if (e.sorumlu_tur === 'ust_yonetim') return ickPlanKoordinatoru(yetki, e.plan_id)
  return yetki.eylemRolleri[Number(e.id)] === 'mudurluk_koordinatoru'
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
  'Bu ekran için iç kontrol yetkiniz yok. Yetki; plan koordinatörü veya bir eylemde müdürlük koordinatörü ya da işlemcisi seçilmekle, İç Kontrol menü yetkisiyle ya da başkan ve başkan yardımcısı görevinden gelir.'
