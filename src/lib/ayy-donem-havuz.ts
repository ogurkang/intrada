/**
 * AYY dönem izin havuzu: A ∪ B ∪ C
 * A — Önceki dönem bitişinden sonra kayıt edilen uygun izinler (bu dönem bitişine kadar)
 * B — Önceki dönemde Sonraki Döneme (SD) > 0 kalan izinler (devir)
 * C — Bir önceki dönemde «hariç tutulan» izinler (yeni dönemde görünür; varsayılan kesintiye dahil)
 *
 * OD zinciri: önceki dönem hesabı, o dönemin havuzu ve daha önceki OD ile yapılır.
 */

import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ayyHesapla,
  ayyYariZamanliYgEffAktif,
  type AyyIzinRow,
  type AyyStatuBazliPersonel,
  type PrevPersonelIzOverflowInfo,
} from '@/lib/ayy-hesap'
import {
  ayyDevirOzetOku,
  ayyDevirOzetYaz,
  type AyyDevirOzet,
} from '@/lib/ayy-devir-ozet'
import { ayyZabitaNormalKesintiMuafSet } from '@/lib/ayy-zabita-havuz'
import { kayitKapatEsigiSonrasiMi } from '@/lib/ayy-kayit-esik'
import { ayliksizIzinDonemiMi } from '@/lib/gorev-bilgileri'

export type AyyDonemTuru = 'normal' | 'fark'

export function ayyDonemTuruNorm(v: unknown): AyyDonemTuru {
  return String(v ?? 'normal').trim() === 'fark' ? 'fark' : 'normal'
}

export type AyyDonemRow = {
  id: number
  donem_adi: string | null
  donem_turu?: 'normal' | 'fark' | string | null
  baslangic_tarihi: string
  bitis_tarihi: string
  durum?: string | null
  /** Kapat butonunda set; AYY havuz A eşiği ve arada kalan izin için */
  kapatildi_at?: string | null
}

export type AyyIzinDbRow = {
  sira_no: string
  sicil_no: string | null
  tur: string | null
  ayrilis: string | null
  baslama: string | null
  gun: number | null
  kayit_tarihi?: string | null
}

type HavuzMemo = {
  pool: Map<number, AyyIzinDbRow[]>
  sdSonrakiDoneme: Map<number, Record<string, number>>
  /** donemId → önceki dönem hesabındaki sira_no → IZ (Zabıta SD taşma kuralı tespiti için) */
  prevIzDoneme: Map<number, Record<string, number>>
  /**
   * donemId → önceki dönem hesabındaki zabıta personelinin toplam IZ > YG taşması
   * (satır-bazlı SD ile örtüşmeyen kısım). Faz 2 OD kuralı için kullanılır.
   */
  prevPersonelIzOverflow: Map<number, Record<string, PrevPersonelIzOverflowInfo>>
  /**
   * donemId → önceki dönemde yarı zamanlı YG_eff aşımı (IZ+OD−YG) sicil → gün.
   * İzin satırı / havuz B kaçırsa bile OD olarak taşınır (Fatma 160 zinciri).
   */
  prevYariZamanliOd: Map<number, Record<string, number>>
}

const IN_CHUNK = 200

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function dedupeBySiraNo(rows: AyyIzinDbRow[]): AyyIzinDbRow[] {
  const seen = new Set<string>()
  const out: AyyIzinDbRow[] = []
  for (const r of rows) {
    const k = String(r.sira_no ?? '').trim()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

export async function ayyGetMemurSozlesmeliSiciller(supabase: SupabaseClient): Promise<Set<string>> {
  const { data: kadroRaw } = await fetchAllKadroHareketleri(supabase, 'asil, vekil', q => q.is('ayrilis_tarihi', null).in('statu', ['Memur', 'Sözleşmeli']))
  const set = new Set<string>()
  for (const k of kadroRaw ?? []) {
    const s = (k.asil ?? k.vekil ?? '').trim()
    if (s) set.add(s)
  }
  return set
}

export async function ayyGetOncekiDonem(
  supabase: SupabaseClient,
  baslangicTarihi: string,
  donemTuru: AyyDonemTuru = 'normal',
): Promise<AyyDonemRow | null> {
  const { data } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, donem_turu, baslangic_tarihi, bitis_tarihi, durum, kapatildi_at')
    .eq('donem_turu', donemTuru)
    .lt('bitis_tarihi', baslangicTarihi)
    .order('bitis_tarihi', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as AyyDonemRow | null
}

export async function ayyLoadDonem(supabase: SupabaseClient, donemId: number): Promise<AyyDonemRow | null> {
  const { data } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, donem_turu, baslangic_tarihi, bitis_tarihi, durum, kapatildi_at')
    .eq('id', donemId)
    .maybeSingle()
  return data as AyyDonemRow | null
}

async function queryIzinA(
  supabase: SupabaseClient,
  memur: Set<string>,
  sicilList: string[],
  donem: AyyDonemRow,
  prev: AyyDonemRow | null,
): Promise<AyyIzinDbRow[]> {
  const all: AyyIzinDbRow[] = []
  for (const part of chunk(sicilList, IN_CHUNK)) {
    let q = supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun, kayit_tarihi, yil')
      .neq('yil', 2025)
      .neq('durum', 'İptal Edildi')
      .in('sicil_no', part)
    if (prev) {
      q = prev.kapatildi_at
        ? q.gt('kayit_tarihi', prev.kapatildi_at)
        : q.gt('kayit_tarihi', prev.bitis_tarihi)
      // Kapalı dönemlerde üst sınır kapatildi_at; açık dönemlerde bitis_tarihi.
      // Böylece kapanıştan sonra kaydedilen izinler o döneme girmez.
      q = q.lte('kayit_tarihi', donem.kapatildi_at ?? donem.bitis_tarihi)
    } else {
      q = q.gte('kayit_tarihi', donem.baslangic_tarihi).lte('kayit_tarihi', donem.kapatildi_at ?? donem.bitis_tarihi)
    }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      if (memur.has(String((r as AyyIzinDbRow).sicil_no ?? '').trim())) all.push(r as AyyIzinDbRow)
    }
  }
  return all
}

async function queryIzinBySiraNo(
  supabase: SupabaseClient,
  memur: Set<string>,
  siraNos: string[],
): Promise<AyyIzinDbRow[]> {
  if (siraNos.length === 0) return []
  const all: AyyIzinDbRow[] = []
  for (const part of chunk(siraNos, IN_CHUNK)) {
    const { data, error } = await supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun, kayit_tarihi, yil')
      .neq('yil', 2025)
      .neq('durum', 'İptal Edildi')
      .in('sira_no', part)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      if (memur.has(String((r as AyyIzinDbRow).sicil_no ?? '').trim())) all.push(r as AyyIzinDbRow)
    }
  }
  return all
}

function ayyDevirOzettenSonuc(
  sonuc: ReturnType<typeof ayyHesapla>,
  donemBas: string,
  statuBazliPersonel: AyyStatuBazliPersonel[],
): AyyDevirOzet {
  const sdBySiraNo: Record<string, number> = {}
  const izBySiraNo: Record<string, number> = {}
  const sicilBySiraNo: Record<string, string> = {}
  for (const s of sonuc.satirlar) {
    if (s.SD > 0) sdBySiraNo[s.sira_no] = s.SD
    if (s.IZ > 0) izBySiraNo[s.sira_no] = s.IZ
    if (s.sicil_no) sicilBySiraNo[s.sira_no] = s.sicil_no.trim()
  }

  const sicilRowSdSums: Record<string, number> = {}
  for (const s of sonuc.satirlar) {
    if (s.SD > 0 && s.sicil_no) {
      sicilRowSdSums[s.sicil_no] = (sicilRowSdSums[s.sicil_no] ?? 0) + s.SD
    }
  }
  const zabitaOverflowBySicil: Record<string, PrevPersonelIzOverflowInfo> = {}
  for (const p of sonuc.personeller) {
    if (!p.isZabita) continue
    const personelIzOverflow = Math.max(0, p.IZ - p.YG)
    const alreadyTracked = sicilRowSdSums[p.sicil_no] ?? 0
    const untracked = Math.max(0, personelIzOverflow - alreadyTracked)
    if (untracked > 0) {
      zabitaOverflowBySicil[p.sicil_no] = {
        overflow: untracked,
        ad_soyad: p.ad_soyad,
        unvan: p.unvan,
      }
    }
  }

  const yariZamanliOdBySicil: Record<string, number> = {}
  if (ayyYariZamanliYgEffAktif(donemBas)) {
    const yzSiciller = new Set(
      statuBazliPersonel
        .filter(s => s.gorev_turu === 'Yarı Zamanlı')
        .map(s => s.sicil_no.trim()),
    )
    for (const p of sonuc.personeller) {
      const sicil = p.sicil_no.trim()
      if (!yzSiciller.has(sicil)) continue
      const asim = Math.max(0, (p.IZ || 0) - (p.YG || 0))
      if (asim > 0) yariZamanliOdBySicil[sicil] = asim
    }
  }

  return { sdBySiraNo, izBySiraNo, sicilBySiraNo, zabitaOverflowBySicil, yariZamanliOdBySicil }
}

/** Bir dönemin kendi hesabından sonraki döneme gidecek devir özetini üretir (canlı hesap). */
export async function ayyDonemDevirCiktisiHesapla(
  supabase: SupabaseClient,
  donem: AyyDonemRow,
  tatiller: Parameters<typeof ayyHesapla>[0]['tatiller'],
  memo: HavuzMemo,
): Promise<AyyDevirOzet> {
  const donemTuru = ayyDonemTuruNorm(donem.donem_turu)
  const pool = await ayyBuildIzinHavuzu(supabase, donem.id, donem, memo)
  const odInto = await ayySdSonrakiDonemIcin(supabase, donem.id, donem, tatiller, memo)
  const izinler = await ayyIzinDbToAyyIzinRow(supabase, pool)
  const onceki = await ayyGetOncekiDonem(supabase, donem.baslangic_tarihi, donemTuru)
  const memurSet = await ayyGetMemurSozlesmeliSiciller(supabase)
  const statuBazliPersonel = await ayyLoadStatuBazliPersonel(supabase, memurSet)
  const prevYariZamanliOdBySicilNo = memo.prevYariZamanliOd.get(donem.id) ?? {}
  const prevIzBySiraNo = memo.prevIzDoneme.get(donem.id) ?? {}
  const prevPersonelIzOverflowBySicilNo = memo.prevPersonelIzOverflow.get(donem.id) ?? {}

  const sonuc = ayyHesapla({
    donemBas: donem.baslangic_tarihi,
    donemBit: donem.bitis_tarihi,
    izinler,
    tatiller,
    odBySiraNo: odInto,
    prevIzBySiraNo,
    prevPersonelIzOverflowBySicilNo,
    prevYariZamanliOdBySicilNo,
    donemTuru,
    oncekiDonem: onceki
      ? {
          baslangic_tarihi: onceki.baslangic_tarihi,
          bitis_tarihi: onceki.bitis_tarihi,
          kapatildi_at: onceki.kapatildi_at ?? null,
        }
      : undefined,
    statuBazliPersonel,
    yariZamanliKusurat: donem.durum === 'Açık',
  })

  return ayyDevirOzettenSonuc(sonuc, donem.baslangic_tarihi, statuBazliPersonel)
}

/** Dönem kapatılırken devir özetini hesaplayıp kalıcı yazar. */
export async function ayyDevirOzetKapatirkenYaz(
  supabase: SupabaseClient,
  donem: AyyDonemRow,
): Promise<{ hata?: string }> {
  const memo = createAyyHavuzMemo()
  const tatiller = await ayyLoadTatiller(supabase)
  try {
    const ozet = await ayyDonemDevirCiktisiHesapla(supabase, donem, tatiller, memo)
    return ayyDevirOzetYaz(supabase, donem.id, ozet)
  } catch (e) {
    return { hata: e instanceof Error ? e.message : 'Devir özeti yazılamadı.' }
  }
}

function memoDevirYukle(memo: HavuzMemo, consumerDonemId: number, ozet: AyyDevirOzet) {
  memo.prevIzDoneme.set(consumerDonemId, ozet.izBySiraNo)
  memo.prevPersonelIzOverflow.set(consumerDonemId, ozet.zabitaOverflowBySicil)
  memo.prevYariZamanliOd.set(consumerDonemId, ozet.yariZamanliOdBySicil)
}

async function ayySdOverrideUygula(
  supabase: SupabaseClient,
  consumerDonemId: number,
  ozet: AyyDevirOzet,
): Promise<Record<string, number>> {
  const m = { ...ozet.sdBySiraNo }
  const { data: overrides } = await supabase
    .from('ayy_sd_override')
    .select('sicil_no, sd_override')
    .eq('donem_id', consumerDonemId)
  if (!overrides?.length) return m

  const overrideMap = new Map<string, number>()
  for (const ov of overrides) {
    overrideMap.set(String(ov.sicil_no ?? '').trim(), ov.sd_override ?? 0)
  }
  for (const [sira, sicil] of Object.entries(ozet.sicilBySiraNo)) {
    if (!overrideMap.has(sicil)) continue
    delete m[sira]
    const yeniSd = overrideMap.get(sicil)!
    if (yeniSd > 0) m[sira] = yeniSd
  }
  return m
}

/**
 * Bir sonraki döneme taşınan SD: `donem` için bir önceki dönem hesabından sira_no → SD.
 * Önceki dönem kapalı ve özet varsa yeniden hesap yapılmaz.
 */
export async function ayySdSonrakiDonemIcin(
  supabase: SupabaseClient,
  donemId: number,
  donem: AyyDonemRow,
  tatiller: Parameters<typeof ayyHesapla>[0]['tatiller'],
  memo: HavuzMemo,
): Promise<Record<string, number>> {
  if (memo.sdSonrakiDoneme.has(donemId)) return memo.sdSonrakiDoneme.get(donemId)!
  const donemTuru = ayyDonemTuruNorm(donem.donem_turu)
  const prev = await ayyGetOncekiDonem(supabase, donem.baslangic_tarihi, donemTuru)
  if (!prev) {
    memo.sdSonrakiDoneme.set(donemId, {})
    memo.prevIzDoneme.set(donemId, {})
    memo.prevPersonelIzOverflow.set(donemId, {})
    memo.prevYariZamanliOd.set(donemId, {})
    return {}
  }

  // Kapalı önceki dönem + kalıcı özet → yeniden hesap yok
  if (prev.durum === 'Kapalı') {
    let ozet = await ayyDevirOzetOku(supabase, prev.id)
    if (!ozet) {
      // Eski kapalı dönemler: bir kez hesapla, yaz, sonra oku
      ozet = await ayyDonemDevirCiktisiHesapla(supabase, prev, tatiller, memo)
      await ayyDevirOzetYaz(supabase, prev.id, ozet)
    }
    memoDevirYukle(memo, donemId, ozet)
    const m = await ayySdOverrideUygula(supabase, donemId, ozet)
    memo.sdSonrakiDoneme.set(donemId, m)
    return m
  }

  // Açık önceki dönem: canlı hesap (özet yok)
  const ozet = await ayyDonemDevirCiktisiHesapla(supabase, prev, tatiller, memo)
  memoDevirYukle(memo, donemId, ozet)
  const m = await ayySdOverrideUygula(supabase, donemId, ozet)
  memo.sdSonrakiDoneme.set(donemId, m)
  return m
}

/** A ∪ B ∪ C ham satırlar (bu dönemin hariç seçimi uygulanmaz). */
export async function ayyBuildIzinHavuzu(
  supabase: SupabaseClient,
  donemId: number,
  donem: AyyDonemRow,
  memo: HavuzMemo,
): Promise<AyyIzinDbRow[]> {
  if (memo.pool.has(donemId)) return memo.pool.get(donemId)!
  const memur = await ayyGetMemurSozlesmeliSiciller(supabase)
  if (memur.size === 0) {
    memo.pool.set(donemId, [])
    return []
  }
  const sicilList = [...memur]
  const prev = await ayyGetOncekiDonem(
    supabase,
    donem.baslangic_tarihi,
    ayyDonemTuruNorm(donem.donem_turu),
  )

  const rowsA = await queryIzinA(supabase, memur, sicilList, donem, prev)

  let rowsC: AyyIzinDbRow[] = []
  if (prev) {
    const { data: haricRaw } = await supabase
      .from('aylik_yemek_yeni_secim')
      .select('izin_sira_no')
      .eq('donem_id', prev.id)
      .eq('dahil', false)
    const hSira = [...new Set((haricRaw ?? []).map(h => h.izin_sira_no).filter(Boolean))] as string[]
    rowsC = await queryIzinBySiraNo(supabase, memur, hSira)
  }

  let rowsB: AyyIzinDbRow[] = []
  if (prev) {
    const tatiller = await ayyLoadTatiller(supabase)
    const sdMap = await ayySdSonrakiDonemIcin(supabase, donemId, donem, tatiller, memo)
    const siraB = Object.keys(sdMap).filter(k => (sdMap[k] ?? 0) > 0)
    rowsB = await queryIzinBySiraNo(supabase, memur, siraB)
  }

  const merged = dedupeBySiraNo([...rowsA, ...rowsB, ...rowsC]).filter(
    r => r.sira_no && r.ayrilis && r.baslama,
  )
  memo.pool.set(donemId, merged)
  return merged
}

function izinSonGunMs(ayrilis: string, baslama: string): number | null {
  const startMs = new Date(`${ayrilis.slice(0, 10)}T00:00:00`).getTime()
  const bD = new Date(`${baslama.slice(0, 10)}T00:00:00`)
  bD.setDate(bD.getDate() - 1)
  const lastMs = bD.getTime()
  if (lastMs < startMs) return null
  return lastMs
}

/**
 * İki dönem arasında «arada kalan» izinler: önceki dönem kapatıldıktan sonra kaydedilmiş,
 * takvim olarak yeni dönem başlangıcından önce başlayıp biten izinler (ayy-hesap kuralı).
 */
export async function ayyAradaKalanIzinleriBul(
  supabase: SupabaseClient,
  donem: Pick<AyyDonemRow, 'baslangic_tarihi' | 'bitis_tarihi' | 'donem_turu'>,
): Promise<AyyIzinDbRow[]> {
  const donemTuru = ayyDonemTuruNorm(donem.donem_turu)
  const prev = await ayyGetOncekiDonem(supabase, donem.baslangic_tarihi, donemTuru)
  if (!prev) return []

  const memur = await ayyGetMemurSozlesmeliSiciller(supabase)
  if (memur.size === 0) return []

  const basMs = new Date(`${donem.baslangic_tarihi.slice(0, 10)}T00:00:00`).getTime()
  const oncekiEsik = {
    baslangic_tarihi: prev.baslangic_tarihi,
    bitis_tarihi:     prev.bitis_tarihi,
    kapatildi_at:     prev.kapatildi_at ?? null,
  }

  const sanalDonem: AyyDonemRow = {
    id: 0,
    donem_adi: null,
    donem_turu: donemTuru,
    baslangic_tarihi: donem.baslangic_tarihi,
    bitis_tarihi:     donem.bitis_tarihi,
    kapatildi_at:     null,
  }
  const candidates = await queryIzinA(supabase, memur, [...memur], sanalDonem, prev)

  return candidates.filter(r => {
    if (!r.kayit_tarihi || !r.ayrilis || !r.baslama) return false
    if (!kayitKapatEsigiSonrasiMi(r.kayit_tarihi, oncekiEsik)) return false
    const startMs = new Date(`${r.ayrilis.slice(0, 10)}T00:00:00`).getTime()
    const sonGunMs = izinSonGunMs(r.ayrilis, r.baslama)
    if (sonGunMs === null) return false
    return startMs < basMs && sonGunMs < basMs
  })
}

export function ayyFormatAradaKalanUyari(rows: AyyIzinDbRow[]): string {
  const ornek = rows.slice(0, 5).map(r => `${r.sira_no} (sicil ${r.sicil_no})`).join(', ')
  const fazla = rows.length > 5 ? ` ve ${rows.length - 5} izin daha` : ''
  return `${rows.length} adet «arada kalan» izin tespit edildi: ${ornek}${fazla}. Bu izinler havuza dahil olabilir; dönem detayından İzinleri Düzenle ile kontrol edin.`
}

/** Yeni dönem eklenirken arada kalan izin yoksa gösterilen doğrulama metni. */
export const AYY_ARADA_KALAN_YOK =
  'Arada Kalan izin tespit edilmedi. Kesinti İşlemlerine Başlayabilirsiniz.'

export async function ayyLoadTatiller(
  supabase: SupabaseClient,
): Promise<Parameters<typeof ayyHesapla>[0]['tatiller']> {
  const { data: tatilRaw } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_adi, tatil_turu, tatil_yapisi, tatil_baslangici, tatil_bitisi, durum')
    .eq('durum', true)
  return (tatilRaw ?? []).map(t => ({
    tatil_adi:        t.tatil_adi,
    tatil_turu:       t.tatil_turu,
    tatil_yapisi:     t.tatil_yapisi,
    tatil_baslangici: t.tatil_baslangici,
    tatil_bitisi:     t.tatil_bitisi,
    durum:            t.durum ?? true,
  }))
}

export async function ayyIzinDbToAyyIzinRow(
  supabase: SupabaseClient,
  rows: AyyIzinDbRow[],
): Promise<AyyIzinRow[]> {
  const siciller = [...new Set(rows.map(r => r.sicil_no).filter(Boolean))] as string[]
  const zabitaMuaf = await ayyZabitaNormalKesintiMuafSet(supabase)
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', siciller)
    ;(calisanlar ?? []).forEach(c => {
      if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
    })
  }
  const zabitaSet = new Set<string>()
  const unvanMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: kh } = await supabase
      .from('kadro_hareketleri')
      .select('asil, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
      .in('asil', siciller)
      .is('ayrilis_tarihi', null)
    for (const k of kh ?? []) {
      const unvan = ((k.gorev_unvani ?? '') + ' ' + (k.kadro_unvani ?? '')).toLocaleLowerCase('tr-TR')
      const mud   = ((k.gorev_mudurlugu ?? '') + ' ' + (k.kadro_mudurlugu ?? '')).toLocaleLowerCase('tr-TR')
      const isZabita = unvan.includes('zabıta') || unvan.includes('zabita') ||
                      mud.includes('zabıta müdürlüğü') || mud.includes('zabita mudurlugu')
      if (isZabita && k.asil) zabitaSet.add(k.asil)
    }
    const { data: pk } = await supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, kadro_unvani')
      .in('sicil_no', siciller)
    ;(pk ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
  }

  return rows.map(r => ({
    sira_no:  r.sira_no!,
    sicil_no: r.sicil_no ?? '',
    ad_soyad: adMap[r.sicil_no ?? ''] ?? r.sicil_no ?? '',
    tur:      r.tur ?? '',
    ayrilis:  r.ayrilis,
    baslama:  r.baslama,
    gun:      r.gun ?? 0,
    isZabita: zabitaSet.has(r.sicil_no ?? '') && !zabitaMuaf.has(String(r.sicil_no ?? '').trim()),
    unvan:    unvanMap[r.sicil_no ?? ''] ?? '',
    kayit_tarihi: r.kayit_tarihi ?? null,
  }))
}

export function createAyyHavuzMemo(): HavuzMemo {
  return {
    pool: new Map(),
    sdSonrakiDoneme: new Map(),
    prevIzDoneme: new Map(),
    prevPersonelIzOverflow: new Map(),
    prevYariZamanliOd: new Map(),
  }
}

/**
 * Statü bazlı AYY personel:
 * calisan.gorev_turu ∈ {'Aylıksız İzin', 'Yarı Zamanlı', 'Geçici Görevlendirme'}
 * ile birlikte Memur/Sözleşmeli kesitimine giren aktif çalışanlar.
 * İşe dönmüş (Çalışan) olup aylıksız izin başlangıç+bitiş tarihleri duranlar da dahildir.
 *
 * Geçici Görevlendirme: yalnızca gorev_turu_yemek_hakki = false (hayır) olanlar dahil edilir.
 * Aylıksız İzin ve Yarı Zamanlı: tüm dahil edilir.
 */
export async function ayyLoadStatuBazliPersonel(
  supabase: SupabaseClient,
  memurSet: Set<string>,
): Promise<AyyStatuBazliPersonel[]> {
  if (memurSet.size === 0) return []

  const sicilList = [...memurSet]
  const zabitaMuaf = await ayyZabitaNormalKesintiMuafSet(supabase)

  // calisan'dan statu bazlı personeli al
  // Not: gorev_turu_yemek_hakki ve gorev_turu_bitis_tarihi yeni kolonlardır;
  // Supabase TS tipi henüz bilmediğinden (unknown) cast edilir.
  type CalisanStatuRow = {
    sicil_no: string
    ad_soyad: string | null
    gorev_turu: string
    gorev_turu_tarihi: string | null
    gorev_turu_yemek_hakki: boolean | null
    gorev_turu_bitis_tarihi: string | null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [statuRes, donmusRes] = await Promise.all([
    sb
      .from('calisan')
      .select('sicil_no, ad_soyad, gorev_turu, gorev_turu_tarihi, gorev_turu_yemek_hakki, gorev_turu_bitis_tarihi')
      .in('sicil_no', sicilList)
      .in('gorev_turu', ['Aylıksız İzin', 'Yarı Zamanlı', 'Geçici Görevlendirme']),
    sb
      .from('calisan')
      .select('sicil_no, ad_soyad, gorev_turu, gorev_turu_tarihi, gorev_turu_yemek_hakki, gorev_turu_bitis_tarihi')
      .in('sicil_no', sicilList)
      .eq('gorev_turu', 'Çalışan')
      .not('gorev_turu_tarihi', 'is', null)
      .not('gorev_turu_bitis_tarihi', 'is', null),
  ])
  const gorulen = new Set<string>()
  const calisanRaw: CalisanStatuRow[] = []
  for (const c of [...(statuRes.data ?? []), ...(donmusRes.data ?? [])] as CalisanStatuRow[]) {
    const sicil = String(c.sicil_no ?? '').trim()
    if (!sicil || gorulen.has(sicil)) continue
    gorulen.add(sicil)
    calisanRaw.push(c)
  }

  if (calisanRaw.length === 0) return []

  // Geçici Görevlendirme: yalnızca yemek hakkı Hayır (false) olanlar dahil
  const filtered: CalisanStatuRow[] = calisanRaw.filter(c => {
    if (c.gorev_turu === 'Geçici Görevlendirme') {
      return c.gorev_turu_yemek_hakki === false
    }
    if (c.gorev_turu === 'Çalışan') {
      return ayliksizIzinDonemiMi(c.gorev_turu, c.gorev_turu_tarihi, c.gorev_turu_bitis_tarihi)
    }
    return true
  })

  if (filtered.length === 0) return []

  const filteredSiciller = filtered.map(c => c.sicil_no)

  // zabıta tespiti
  const zabitaSet = new Set<string>()
  const unvanMap: Record<string, string> = {}
  for (const part of chunk(filteredSiciller, IN_CHUNK)) {
    const { data: kh } = await supabase
      .from('kadro_hareketleri')
      .select('asil, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
      .in('asil', part)
      .is('ayrilis_tarihi', null)
    for (const k of kh ?? []) {
      const unvan = ((k.gorev_unvani ?? '') + ' ' + (k.kadro_unvani ?? '')).toLocaleLowerCase('tr-TR')
      const mud   = ((k.gorev_mudurlugu ?? '') + ' ' + (k.kadro_mudurlugu ?? '')).toLocaleLowerCase('tr-TR')
      const isZabita = unvan.includes('zabıta') || unvan.includes('zabita') ||
                      mud.includes('zabıta müdürlüğü') || mud.includes('zabita mudurlugu')
      if (isZabita && k.asil) zabitaSet.add(k.asil)
    }
    const { data: pk } = await supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, kadro_unvani')
      .in('sicil_no', part)
    ;(pk ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
  }

  return filtered.map(c => ({
    sicil_no:                c.sicil_no,
    ad_soyad:                c.ad_soyad ?? c.sicil_no,
    unvan:                   unvanMap[c.sicil_no] ?? '',
    isZabita:                zabitaSet.has(c.sicil_no) && !zabitaMuaf.has(c.sicil_no.trim()),
    gorev_turu:              ayliksizIzinDonemiMi(c.gorev_turu, c.gorev_turu_tarihi, c.gorev_turu_bitis_tarihi)
      ? 'Aylıksız İzin'
      : c.gorev_turu,
    gorev_turu_tarihi:       c.gorev_turu_tarihi ?? null,
    gorev_turu_bitis_tarihi: c.gorev_turu_bitis_tarihi ?? null,
    gorev_turu_yemek_hakki:  c.gorev_turu_yemek_hakki ?? null,
  }))
}
