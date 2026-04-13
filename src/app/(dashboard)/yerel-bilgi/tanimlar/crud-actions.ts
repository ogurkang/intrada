'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireYerelBilgiYazma } from '@/lib/yerel-bilgi-yazma-guard'

type TabloBasit =
  | 'yerel_bilgi_arac_sahiplik_durum'
  | 'yerel_bilgi_arac_durum'
  | 'yerel_bilgi_arac_turu'
  | 'yerel_bilgi_butce_gider'
  | 'yerel_bilgi_butce_gelir'

const nowIso = () => new Date().toISOString()

async function guard() {
  const g = await requireYerelBilgiYazma()
  if (!g.ok) return g
  return { ok: true as const }
}

export async function yerelBilgiTanimTopluEkle(
  tablo: TabloBasit,
  revalidatePathStr: string,
  satirlar: { sira_no: number | null; tanim_adi: string }[],
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const ek = satirlar.map(s => ({
    sira_no: s.sira_no,
    tanim_adi: s.tanim_adi.trim(),
    aktif: true,
    updated_at: nowIso(),
  })).filter(s => s.tanim_adi.length > 0)
  if (ek.length === 0) return { hata: 'En az bir geçerli tanım adı giriniz.' }

  const supabase = await createClient()
  const { error } = await supabase.from(tablo).insert(ek as never[])
  if (error) return { hata: error.message }
  revalidatePath(revalidatePathStr)
  return {}
}

export async function yerelBilgiTanimGuncelle(
  tablo: TabloBasit,
  revalidatePathStr: string,
  id: number,
  formData: FormData,
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const tanim_adi = String(formData.get('tanim_adi') ?? '').trim()
  if (!tanim_adi) return { hata: 'Tanım adı zorunludur.' }
  const siraRaw = String(formData.get('sira_no') ?? '').trim()
  const sira_no = siraRaw === '' ? null : Number(siraRaw)
  if (sira_no != null && !Number.isFinite(sira_no)) return { hata: 'Sıra no geçerli bir sayı olmalıdır.' }
  const aktif = formData.get('aktif') === 'true' || formData.get('aktif') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from(tablo)
    .update({ tanim_adi, sira_no, aktif, updated_at: nowIso() } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(revalidatePathStr)
  return {}
}

export async function yerelBilgiTanimTopluGuncelle(
  tablo: TabloBasit,
  revalidatePathStr: string,
  guncellemeler: { id: number; sira_no: number | null; tanim_adi: string; aktif: boolean }[],
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  for (const u of guncellemeler) {
    const ad = u.tanim_adi.trim()
    if (!ad) return { hata: 'Tanım adı boş olamaz.' }
    const { error } = await supabase
      .from(tablo)
      .update({
        sira_no: u.sira_no,
        tanim_adi: ad,
        aktif: u.aktif,
        updated_at: nowIso(),
      } as never)
      .eq('id', u.id)
    if (error) return { hata: error.message }
  }
  revalidatePath(revalidatePathStr)
  return {}
}

export async function yerelBilgiTanimToggle(
  tablo: TabloBasit,
  revalidatePathStr: string,
  id: number,
  mevcutAktif: boolean,
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from(tablo)
    .update({ aktif: !mevcutAktif, updated_at: nowIso() } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(revalidatePathStr)
  return {}
}

export async function yerelBilgiAltTurTopluEkle(
  aracTuruId: number,
  revalidatePathStr: string,
  satirlar: { sira_no: number | null; tanim_adi: string }[],
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const ek = satirlar.map(s => ({
    arac_turu_id: aracTuruId,
    sira_no: s.sira_no,
    tanim_adi: s.tanim_adi.trim(),
    aktif: true,
    updated_at: nowIso(),
  })).filter(s => s.tanim_adi.length > 0)
  if (ek.length === 0) return { hata: 'En az bir geçerli tanım adı giriniz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('yerel_bilgi_arac_alt_tur').insert(ek as never[])
  if (error) return { hata: error.message }
  revalidatePath(revalidatePathStr)
  return {}
}

export async function yerelBilgiAltTurGuncelle(
  revalidatePathStr: string,
  id: number,
  formData: FormData,
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const tanim_adi = String(formData.get('tanim_adi') ?? '').trim()
  if (!tanim_adi) return { hata: 'Tanım adı zorunludur.' }
  const siraRaw = String(formData.get('sira_no') ?? '').trim()
  const sira_no = siraRaw === '' ? null : Number(siraRaw)
  if (sira_no != null && !Number.isFinite(sira_no)) return { hata: 'Sıra no geçerli bir sayı olmalıdır.' }
  const aktif = formData.get('aktif') === 'true' || formData.get('aktif') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('yerel_bilgi_arac_alt_tur')
    .update({ tanim_adi, sira_no, aktif, updated_at: nowIso() } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(revalidatePathStr)
  return {}
}

export async function yerelBilgiAltTurTopluGuncelle(
  revalidatePathStr: string,
  guncellemeler: { id: number; sira_no: number | null; tanim_adi: string; aktif: boolean }[],
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  for (const u of guncellemeler) {
    const ad = u.tanim_adi.trim()
    if (!ad) return { hata: 'Tanım adı boş olamaz.' }
    const { error } = await supabase
      .from('yerel_bilgi_arac_alt_tur')
      .update({
        sira_no: u.sira_no,
        tanim_adi: ad,
        aktif: u.aktif,
        updated_at: nowIso(),
      } as never)
      .eq('id', u.id)
    if (error) return { hata: error.message }
  }
  revalidatePath(revalidatePathStr)
  return {}
}

export async function yerelBilgiAltTurToggle(
  revalidatePathStr: string,
  id: number,
  mevcutAktif: boolean,
): Promise<{ hata?: string }> {
  const g = await guard()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('yerel_bilgi_arac_alt_tur')
    .update({ aktif: !mevcutAktif, updated_at: nowIso() } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(revalidatePathStr)
  return {}
}
