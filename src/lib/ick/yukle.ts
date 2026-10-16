import type { IckDb } from '@/lib/ick/erisim'
import { ickBugun, ickGecikti, ickKodSiralama, ickTerminGoster, type IckAkis, type IckEylemDurum } from '@/lib/ick/tanim'

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
}

export const ICK_EYLEM_KOLON =
  'id, plan_id, genel_sart_id, kod, kod_norm, sira, ongorulen_eylem, sorumlu_tur, sorumlu_mudurluk_id, sorumlu_metin, isbirligi_kapsam, isbirligi_metin, cikti, termin_tipi, termin_ilk, termin_guncel, termin_metin, revizyon_notu, aciklama, durum, ilerleme'

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

export async function ickKullaniciAdlari(db: IckDb, idler: string[]): Promise<Map<string, string>> {
  if (!idler.length) return new Map()
  const { data } = await db.from('app_profiles').select('id, ad_soyad, kullanici_adi').in('id', [...new Set(idler)])
  return new Map(
    ((data as { id: string; ad_soyad: string | null; kullanici_adi: string | null }[] | null) ?? []).map(p => [
      p.id,
      (p.ad_soyad || p.kullanici_adi || 'Kullanıcı').trim(),
    ]),
  )
}

export type IckPlanOzet = { id: number; ad: string; bas_yil: number; bit_yil: number; durum: string; kapsam: string; mudurluk_id: number | null }

export async function ickPlanlar(db: IckDb): Promise<{ planlar: IckPlanOzet[]; hata?: string }> {
  const { data, error } = await db
    .from('ick_plan')
    .select('id, ad, bas_yil, bit_yil, durum, kapsam, mudurluk_id')
    .order('bas_yil', { ascending: false })
    .order('id', { ascending: false })
  return { planlar: (data as IckPlanOzet[] | null) ?? [], hata: error?.message }
}

/** Yürürlükteki idare planı, yoksa en yeni idare planı */
export function ickVarsayilanPlan(planlar: IckPlanOzet[]): IckPlanOzet | null {
  const idare = planlar.filter(p => p.kapsam === 'idare')
  return idare.find(p => p.durum === 'yururlukte') ?? idare[0] ?? planlar[0] ?? null
}
