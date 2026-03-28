'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    updated_at: new Date().toISOString(),
  })
  if (error) return { hata: error.message }
  revalidatePath('/tanimlar/kazanc-bilgi')
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
  revalidatePath('/tanimlar/kazanc-bilgi')
  return {}
}

export async function kazancBilgiSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_kazanc_bilgisi').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/tanimlar/kazanc-bilgi')
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

export async function kazancBilgiTopluEkle(satirlar: KazancTopluSatir[]): Promise<{ hata?: string; eklenen?: number }> {
  if (!satirlar.length) return { hata: 'Kaydedilecek satır yok.' }
  const supabase = await createClient()
  const now = new Date().toISOString()
  let sira = await sonrakiKazancSiraNo(supabase)
  const rows = satirlar.map((r) => ({
    ...r,
    sira_no: sira++,
    updated_at: now,
  }))
  const { error } = await supabase.from('tanim_kazanc_bilgisi').insert(rows)
  if (error) return { hata: error.message }
  revalidatePath('/tanimlar/kazanc-bilgi')
  return { eklenen: satirlar.length }
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
  guncellemeler: KazancTopluGuncelleme[]
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
  revalidatePath('/tanimlar/kazanc-bilgi')
  return {}
}
