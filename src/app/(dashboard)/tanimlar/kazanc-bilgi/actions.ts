'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function revalidateKazanc(unvanId?: number | null) {
  revalidatePath('/tanimlar/kazanc-bilgi')
  if (unvanId != null && Number.isFinite(unvanId)) {
    revalidatePath(`/tanimlar/kazanc-bilgi/${unvanId}`)
  }
}

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function intReq(fd: FormData, key: string): number | null {
  const v = String(fd.get(key) ?? '').trim()
  if (!v) return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function payloadFromForm(fd: FormData) {
  const unvan_id = intReq(fd, 'unvan_id')
  const ogrenim_id = intReq(fd, 'ogrenim_id')
  const derece = intReq(fd, 'derece')
  if (unvan_id == null || ogrenim_id == null || derece == null) {
    return { hata: 'Unvan, öğrenim ve derece zorunludur.' as const }
  }
  return {
    ok: {
      sira_no: intReq(fd, 'sira_no'),
      unvan_id,
      ogrenim_id,
      derece,
      ek_gosterge: str(fd, 'ek_gosterge'),
      ek_odeme: str(fd, 'ek_odeme'),
      oht: str(fd, 'oht'),
      yan_odeme: str(fd, 'yan_odeme'),
      sds_orani: str(fd, 'sds_orani'),
    } as const,
  }
}

async function sonrakiKazancSiraNo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  const { data: mx } = await supabase
    .from('tanim_kazanc_bilgisi')
    .select('sira_no')
    .not('sira_no', 'is', null)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (mx?.sira_no ?? 0) + 1
}

export async function kazancBilgiEkle(fd: FormData): Promise<{ hata?: string }> {
  const p = payloadFromForm(fd)
  if ('hata' in p) return { hata: p.hata }
  const supabase = await createClient()
  const sira_no = (await sonrakiKazancSiraNo(supabase))
  const { error } = await supabase.from('tanim_kazanc_bilgisi').insert({
    ...p.ok,
    sira_no,
    kazanc_grup_id: randomUUID(),
    updated_at: new Date().toISOString(),
  })
  if (error) return { hata: error.message }
  revalidateKazanc(p.ok.unvan_id)
  return {}
}

export async function kazancBilgiGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const p = payloadFromForm(fd)
  if ('hata' in p) return { hata: p.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_kazanc_bilgisi')
    .update({
      ...p.ok,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidateKazanc(p.ok.unvan_id)
  return {}
}

export async function kazancBilgiSil(id: number, unvanId?: number | null): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_kazanc_bilgisi').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidateKazanc(unvanId ?? undefined)
  return {}
}

export async function kazancBilgiTopluSil(ids: number[], unvanId?: number | null): Promise<{ hata?: string }> {
  if (!ids.length) return {}
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_kazanc_bilgisi').delete().in('id', ids)
  if (error) return { hata: error.message }
  revalidateKazanc(unvanId ?? undefined)
  return {}
}

export type KazancTopluSatir = {
  sira_no: number | null
  unvan_id: number
  ogrenim_id: number
  derece: number
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
}

/** Çoklu öğrenim aynı puan / sıra: her grup için tek kazanc_grup_id ve ortak sira_no */
export type KazancGrupAyar = {
  ogrenim_ids: number[]
  sira_no: number | null
  unvan_id: number
  derece: number
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
}

export type KazancGrupKayitGuncelle = { eskiSatirIds: number[] } & KazancGrupAyar

function kazancGrupInsertSatirlari(g: KazancGrupAyar, grupId: string, siraVal: number, now: string) {
  const ids = [...new Set(g.ogrenim_ids)]
  return ids.map((ogrenim_id) => ({
    unvan_id: g.unvan_id,
    ogrenim_id,
    derece: g.derece,
    ek_gosterge: g.ek_gosterge,
    ek_odeme: g.ek_odeme,
    oht: g.oht,
    yan_odeme: g.yan_odeme,
    sds_orani: g.sds_orani,
    sira_no: siraVal,
    kazanc_grup_id: grupId,
    updated_at: now,
  }))
}

export async function kazancBilgiGruplariEkle(gruplar: KazancGrupAyar[]): Promise<{ hata?: string; eklenen?: number }> {
  const flat = gruplar.filter((g) => g.ogrenim_ids.length > 0)
  if (!flat.length) return { hata: 'Kaydedilecek satır yok.' }
  const supabase = await createClient()
  const now = new Date().toISOString()
  let nextSira = await sonrakiKazancSiraNo(supabase)
  const allRows: ReturnType<typeof kazancGrupInsertSatirlari> = []
  for (const g of flat) {
    const grupId = randomUUID()
    const siraVal = g.sira_no != null ? g.sira_no : nextSira++
    allRows.push(...kazancGrupInsertSatirlari(g, grupId, siraVal, now))
  }
  const { error } = await supabase.from('tanim_kazanc_bilgisi').insert(allRows)
  if (error) return { hata: error.message }
  revalidateKazanc(flat[0]?.unvan_id)
  return { eklenen: allRows.length }
}

export async function kazancBilgiGrupGuncelle(
  eskiSatirIds: number[],
  ayar: KazancGrupAyar,
  unvanId: number,
): Promise<{ hata?: string }> {
  if (!eskiSatirIds.length) return { hata: 'Geçersiz kayıt.' }
  const dedup = [...new Set(ayar.ogrenim_ids)]
  if (!dedup.length) return { hata: 'En az bir öğrenim seçin.' }
  const supabase = await createClient()
  const { data: existing, error: selErr } = await supabase
    .from('tanim_kazanc_bilgisi')
    .select('id, unvan_id')
    .in('id', eskiSatirIds)
  if (selErr) return { hata: selErr.message }
  if (!existing?.length || existing.length !== eskiSatirIds.length) return { hata: 'Kayıt bulunamadı.' }
  if (existing.some((r) => r.unvan_id !== unvanId)) return { hata: 'Ünvan uyuşmuyor.' }
  const { error: delErr } = await supabase.from('tanim_kazanc_bilgisi').delete().in('id', eskiSatirIds)
  if (delErr) return { hata: delErr.message }
  const now = new Date().toISOString()
  const grupId = randomUUID()
  const siraVal = ayar.sira_no != null ? ayar.sira_no : await sonrakiKazancSiraNo(supabase)
  const rows = kazancGrupInsertSatirlari({ ...ayar, ogrenim_ids: dedup }, grupId, siraVal, now)
  const { error: insErr } = await supabase.from('tanim_kazanc_bilgisi').insert(rows)
  if (insErr) return { hata: insErr.message }
  revalidateKazanc(unvanId)
  return {}
}

export async function kazancBilgiTopluGrupGuncelle(
  kayitlar: KazancGrupKayitGuncelle[],
  unvanId: number,
): Promise<{ hata?: string }> {
  for (const k of kayitlar) {
    const { eskiSatirIds, ...ayar } = k
    const res = await kazancBilgiGrupGuncelle(eskiSatirIds, ayar, unvanId)
    if (res.hata) return res
  }
  return {}
}

/** Her satır ayrı grup (tek öğrenim); geriye dönük uyumluluk */
export async function kazancBilgiTopluEkle(satirlar: KazancTopluSatir[]): Promise<{ hata?: string; eklenen?: number }> {
  if (!satirlar.length) return { hata: 'Kaydedilecek satır yok.' }
  const gruplar: KazancGrupAyar[] = satirlar.map((r) => ({
    ogrenim_ids: [r.ogrenim_id],
    sira_no: r.sira_no,
    unvan_id: r.unvan_id,
    derece: r.derece,
    ek_gosterge: r.ek_gosterge,
    ek_odeme: r.ek_odeme,
    oht: r.oht,
    yan_odeme: r.yan_odeme,
    sds_orani: r.sds_orani,
  }))
  return kazancBilgiGruplariEkle(gruplar)
}

export type KazancTopluGuncelleme = {
  id: number
  sira_no: number | null
  unvan_id: number
  ogrenim_id: number
  derece: number
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
}

export async function kazancBilgiTopluGuncelle(
  guncellemeler: KazancTopluGuncelleme[],
  unvanId?: number | null
): Promise<{ hata?: string }> {
  if (!guncellemeler.length) return {}
  const supabase = await createClient()
  const now = new Date().toISOString()
  for (const u of guncellemeler) {
    const { id, ...rest } = u
    const { error } = await supabase
      .from('tanim_kazanc_bilgisi')
      .update({ ...rest, updated_at: now })
      .eq('id', id)
    if (error) return { hata: error.message }
  }
  revalidateKazanc(unvanId ?? guncellemeler[0]?.unvan_id ?? undefined)
  return {}
}
