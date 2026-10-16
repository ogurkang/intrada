import type { IckDb } from '@/lib/ick/erisim'
import { ickBugun, ickGecikti, ickKodSiralama, ickTerminGoster, type IckAkis, type IckEylemDurum, type IckEylemKisiRol } from '@/lib/ick/tanim'

export type IckEylemKayit = {
  id: number
  plan_id: number
  genel_sart_id: number
  kod: string
  kod_norm: string
  sira: number
  ongorulen_eylem: string
  sorumlu_tur: 'mudurluk' | 'ust_yonetim'
  sorumlu_mudurluk_id: number | null
  sorumlu_metin: string
  isbirligi_kapsam: 'yok' | 'tum_mudurlukler' | 'ilgili_mudurlukler'
  isbirligi_metin: string
  cikti: string
  termin_tipi: 'tek' | 'yillik' | 'alti_aylik' | 'surekli'
  termin_ilk: string | null
  termin_guncel: string | null
  termin_metin: string
  revizyon_notu: string
  aciklama: string
  durum: IckEylemDurum
  ilerleme: number
  onceki_eylem_id: number | null
  devir_notu: string
}

export const ICK_EYLEM_KOLON =
  'id, plan_id, genel_sart_id, kod, kod_norm, sira, ongorulen_eylem, sorumlu_tur, sorumlu_mudurluk_id, sorumlu_metin, isbirligi_kapsam, isbirligi_metin, cikti, termin_tipi, termin_ilk, termin_guncel, termin_metin, revizyon_notu, aciklama, durum, ilerleme, onceki_eylem_id, devir_notu'

export type IckEylemListeSatir = IckEylemKayit & {
  genelSartKod: string
  sorumlu: string
  terminGoster: string
  gecikti: boolean
  sonAkis: IckAkis | null
  sonGerceklesmeId: number | null
}

export function ickSorumluAdi(e: Pick<IckEylemKayit, 'sorumlu_tur' | 'sorumlu_mudurluk_id' | 'sorumlu_metin'>, mudAd: Map<number, string>): string {
  if (e.sorumlu_tur === 'ust_yonetim') return e.sorumlu_metin || 'Üst Yönetim'
  return mudAd.get(e.sorumlu_mudurluk_id ?? 0) ?? (e.sorumlu_metin || '—')
}

export async function ickPlanEylemleri(
  db: IckDb,
  planId: number,
  mudAd: Map<number, string>,
): Promise<{ satirlar: IckEylemListeSatir[]; hata?: string }> {
  const [eylem, gs] = await Promise.all([
    db.from('ick_eylem').select(ICK_EYLEM_KOLON).eq('plan_id', planId),
    db.from('ick_genel_sart').select('id, kod'),
  ])
  if (eylem.error) return { satirlar: [], hata: eylem.error.message }
  const ids = ((eylem.data as { id: number }[] | null) ?? []).map(e => e.id)
  const ger = ids.length
    ? await db.from('ick_gerceklesme').select('id, eylem_id, akis, created_at').in('eylem_id', ids).order('created_at', { ascending: false })
    : { data: [] }
  const gsKod = new Map(((gs.data as { id: number; kod: string }[] | null) ?? []).map(g => [g.id, g.kod]))
  const son = new Map<number, { id: number; akis: IckAkis }>()
  for (const g of (ger.data as { id: number; eylem_id: number; akis: IckAkis }[] | null) ?? []) {
    if (!son.has(g.eylem_id)) son.set(g.eylem_id, { id: g.id, akis: g.akis })
  }
  const bugun = ickBugun()
  const satirlar = ((eylem.data as IckEylemKayit[] | null) ?? [])
    .map(e => ({
      ...e,
      devir_notu: e.devir_notu ?? '',
      ilerleme: Number(e.ilerleme),
      genelSartKod: gsKod.get(e.genel_sart_id) ?? '',
      sorumlu: ickSorumluAdi(e, mudAd),
      terminGoster: ickTerminGoster(e),
      gecikti: ickGecikti(e, bugun),
      sonAkis: son.get(e.id)?.akis ?? null,
      sonGerceklesmeId: son.get(e.id)?.id ?? null,
    }))
    .sort((a, b) => ickKodSiralama(a.kod_norm, b.kod_norm))
  return { satirlar }
}

export type IckMudurluk = { id: number; ad: string }

export async function ickMudurlukler(db: IckDb): Promise<IckMudurluk[]> {
  const { data } = await db.from('tanim_mudurluk').select('id, mudurluk_adi, aktif, sira_no').order('sira_no', { ascending: true })
  return ((data as { id: number; mudurluk_adi: string; aktif: boolean | null }[] | null) ?? [])
    .filter(m => m.aktif !== false)
    .map(m => ({ id: Number(m.id), ad: m.mudurluk_adi }))
}

export async function ickTumMudurlukHaritasi(db: IckDb): Promise<Map<number, string>> {
  const { data } = await db.from('tanim_mudurluk').select('id, mudurluk_adi')
  return new Map(((data as { id: number; mudurluk_adi: string }[] | null) ?? []).map(m => [Number(m.id), m.mudurluk_adi]))
}

/** Sicil veya kullanıcı adı değilse kayıtlı metni ad soyad say */
export function ickGorunenAd(sicil: string, kayitli: string | null | undefined, harita: Map<string, string>): string {
  const sistem = harita.get(String(sicil).trim())
  if (sistem) return sistem
  const k = String(kayitli ?? '').trim()
  if (k && k !== String(sicil).trim() && !/^\d+$/.test(k)) return k
  return 'Ad soyad yok'
}

/** Personel kaydındaki ad soyad. Sicil numarası dönmez. */
export async function ickSicilAdlari(db: IckDb, siciller: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(siciller.map(s => String(s).trim()).filter(Boolean))]
  const m = new Map<string, string>()
  if (!ids.length) return m
  const { data, error } = await db.rpc('ick_sicil_adlari', { p_siciller: ids })
  if (!error) {
    for (const r of (data as { sicil: string; ad: string }[] | null) ?? []) {
      const ad = String(r.ad ?? '').trim()
      if (ad) m.set(String(r.sicil).trim(), ad)
    }
    return m
  }
  const { data: c } = await db.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', ids)
  for (const r of (c as { sicil_no: string | number; ad_soyad: string | null }[] | null) ?? []) {
    const ad = String(r.ad_soyad ?? '').trim()
    if (ad) m.set(String(r.sicil_no).trim(), ad)
  }
  const eksik = ids.filter(s => !m.has(s))
  if (eksik.length) {
    const { data: f } = await db.from('firma_calisanlar').select('sicil_no, ad_soyad').in('sicil_no', eksik)
    for (const r of (f as { sicil_no: string | number; ad_soyad: string | null }[] | null) ?? []) {
      const ad = String(r.ad_soyad ?? '').trim()
      if (ad) m.set(String(r.sicil_no).trim(), ad)
    }
  }
  return m
}

export async function ickKullaniciAdlari(db: IckDb, idler: string[]): Promise<Map<string, string>> {
  const tekil = [...new Set(idler.filter(Boolean))]
  if (!tekil.length) return new Map()
  const { data } = await db.from('app_profiles').select('id, sicil_no, ad_soyad').in('id', tekil)
  const profiller = (data as { id: string; sicil_no: string | number | null; ad_soyad: string | null }[] | null) ?? []
  const adlar = await ickSicilAdlari(
    db,
    profiller.map(p => String(p.sicil_no ?? '').trim()).filter(Boolean),
  )
  return new Map(profiller.map(p => [p.id, ickGorunenAd(String(p.sicil_no ?? ''), p.ad_soyad, adlar)]))
}

export type IckPersonel = { sicil: string; ad: string; unvan: string; hesapVar: boolean; menuAcik: boolean }

export async function ickMudurlukPersoneliYukle(db: IckDb, mudurlukId: number): Promise<{ personel: IckPersonel[]; hata?: string }> {
  const { data, error } = await db.rpc('ick_mudurluk_personeli', { p_mudurluk_id: mudurlukId })
  if (error) return { personel: [], hata: error.message }
  const personel = ((data as { sicil: string; ad: string; unvan: string; hesap_var: boolean; menu_acik?: boolean }[] | null) ?? [])
    .map(p => ({ sicil: p.sicil, ad: p.ad, unvan: p.unvan ?? '', hesapVar: Boolean(p.hesap_var), menuAcik: Boolean(p.menu_acik) }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
  return { personel }
}

export type IckKisi = { sicil: string; ad: string }

/** Planın iç kontrol koordinatörleri. Ad soyad, personel kaydından gelir. */
export async function ickPlanKoordinatorleri(db: IckDb, planIdler: number[]): Promise<Map<number, IckKisi[]>> {
  const m = new Map<number, IckKisi[]>()
  if (!planIdler.length) return m
  const [{ data }, { data: planlar }] = await Promise.all([
    db.from('ick_plan_koordinator').select('plan_id, sicil_no, ad_soyad').in('plan_id', planIdler).order('ad_soyad'),
    db.from('ick_plan').select('id, koordinator_mudurluk_id').in('id', planIdler),
  ])
  const adlar = new Map<string, string>()
  const mudurlukler = [
    ...new Set(
      ((planlar as { id: number; koordinator_mudurluk_id: number | null }[] | null) ?? [])
        .map(p => p.koordinator_mudurluk_id)
        .filter((x): x is number => x != null),
    ),
  ]
  for (const mid of mudurlukler) {
    const { personel } = await ickMudurlukPersoneliYukle(db, mid)
    for (const p of personel) if (p.ad && p.ad !== 'Ad soyad yok') adlar.set(p.sicil, p.ad)
  }
  const satirlar = (data as { plan_id: number; sicil_no: string; ad_soyad: string }[] | null) ?? []
  const sistem = await ickSicilAdlari(db, satirlar.map(r => r.sicil_no))
  for (const [sicil, ad] of sistem) adlar.set(sicil, ad)
  for (const r of satirlar) {
    const l = m.get(Number(r.plan_id)) ?? []
    l.push({ sicil: r.sicil_no, ad: ickGorunenAd(r.sicil_no, r.ad_soyad, adlar) })
    m.set(Number(r.plan_id), l)
  }
  return m
}

export type IckEylemKisileri = { koordinatorler: IckKisi[]; islemciler: IckKisi[] }

/** Eylemlerin müdürlük koordinatörleri (muhatap) ve işlemcileri */
export async function ickEylemKisileri(db: IckDb, eylemIdler: number[]): Promise<Map<number, IckEylemKisileri>> {
  const m = new Map<number, IckEylemKisileri>()
  const ids = [...new Set(eylemIdler)]
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db
      .from('ick_eylem_kisi')
      .select('eylem_id, rol, sicil_no, ad_soyad')
      .in('eylem_id', ids.slice(i, i + 300))
      .order('ad_soyad')
    const satirlar = (data as { eylem_id: number; rol: IckEylemKisiRol; sicil_no: string; ad_soyad: string }[] | null) ?? []
    const adlar = await ickSicilAdlari(db, satirlar.map(r => r.sicil_no))
    for (const r of satirlar) {
      const k = m.get(Number(r.eylem_id)) ?? { koordinatorler: [], islemciler: [] }
      ;(r.rol === 'mudurluk_koordinatoru' ? k.koordinatorler : k.islemciler).push({
        sicil: r.sicil_no,
        ad: ickGorunenAd(r.sicil_no, r.ad_soyad, adlar),
      })
      m.set(Number(r.eylem_id), k)
    }
  }
  return m
}

export type IckUstYonetici = { sicil: string; ad: string; gorev: string; bagliMudurlukler: number[] }

/** Aktif organizasyondaki başkan ve başkan yardımcıları; yardımcıların altındaki müdürlükler */
export async function ickUstYonetim(db: IckDb): Promise<IckUstYonetici[]> {
  const { data: org } = await db.from('tanim_organizasyon').select('id').eq('aktif', true).limit(1).maybeSingle()
  if (!org) return []
  const { data } = await db
    .from('tanim_organizasyon_birim')
    .select('id, mudurluk_id, birim_turu, personel_sicil_no, ust_birim_id')
    .eq('organizasyon_id', (org as { id: number }).id)
  const birimler = (data as { id: number; mudurluk_id: number | null; birim_turu: string; personel_sicil_no: string | null; ust_birim_id: number | null }[] | null) ?? []
  const cocuk = new Map<number, typeof birimler>()
  for (const b of birimler) {
    if (b.ust_birim_id == null) continue
    const l = cocuk.get(b.ust_birim_id) ?? []
    l.push(b)
    cocuk.set(b.ust_birim_id, l)
  }
  function altMudurlukler(id: number, gorulen = new Set<number>()): number[] {
    if (gorulen.has(id)) return []
    gorulen.add(id)
    const s: number[] = []
    for (const c of cocuk.get(id) ?? []) {
      if (c.birim_turu === 'mudurluk' && c.mudurluk_id != null) s.push(c.mudurluk_id)
      s.push(...altMudurlukler(c.id, gorulen))
    }
    return s
  }
  const ust = birimler.filter(b => (b.birim_turu === 'baskan' || b.birim_turu === 'baskan_yardimcisi') && b.personel_sicil_no)
  const siciller = [...new Set(ust.map(b => String(b.personel_sicil_no).trim()))]
  const adlar = new Map<string, string>()
  if (siciller.length) {
    const { data: k } = await db.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    for (const r of (k as { sicil_no: string; ad_soyad: string | null }[] | null) ?? []) adlar.set(String(r.sicil_no).trim(), r.ad_soyad ?? '')
  }
  return ust
    .sort((a, b) => (a.birim_turu === 'baskan' ? 0 : 1) - (b.birim_turu === 'baskan' ? 0 : 1))
    .map(b => {
      const sicil = String(b.personel_sicil_no).trim()
      return {
        sicil,
        ad: adlar.get(sicil) || 'Ad soyad yok',
        gorev: b.birim_turu === 'baskan' ? 'Belediye Başkanı' : 'Başkan Yardımcısı',
        bagliMudurlukler: b.birim_turu === 'baskan' ? [] : [...new Set(altMudurlukler(b.id))],
      }
    })
}

export type IckPlanOzet = {
  id: number
  ad: string
  bas_yil: number
  bit_yil: number
  durum: string
  kapsam: string
  mudurluk_id: number | null
  izleme_sikligi: number
}

export async function ickPlanlar(db: IckDb): Promise<{ planlar: IckPlanOzet[]; hata?: string }> {
  const { data, error } = await db
    .from('ick_plan')
    .select('id, ad, bas_yil, bit_yil, durum, kapsam, mudurluk_id, izleme_sikligi')
    .order('bas_yil', { ascending: false })
    .order('id', { ascending: false })
  return { planlar: (data as IckPlanOzet[] | null) ?? [], hata: error?.message }
}

/** Yürürlükteki idare planı, yoksa en yeni idare planı */
export function ickVarsayilanPlan(planlar: IckPlanOzet[]): IckPlanOzet | null {
  const idare = planlar.filter(p => p.kapsam === 'idare')
  return idare.find(p => p.durum === 'yururlukte') ?? idare[0] ?? planlar[0] ?? null
}
