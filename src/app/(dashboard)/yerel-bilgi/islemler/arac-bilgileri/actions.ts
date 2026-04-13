'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mudurlukIdFromPersonelSicil } from '@/lib/kadro-mudurluk-id'
import { requireYerelBilgiIslem } from '@/lib/yerel-bilgi-islem-guard'

const SAYFA = '/yerel-bilgi/islemler/arac-bilgileri'

export type AracBilgisiKayitSatir = {
  sahiplik_durum_id: number
  arac_durum_id: number
  arac_turu_id: number
  arac_alt_tur_id: number
  plaka_no: string
  sasi_no: string
  /** Yönetici: satır başına zorunlu. Kullanıcı rolünde yok sayılır. */
  mudurluk_id?: number
}

export async function aracBilgileriTopluKaydet(
  satirlar: AracBilgisiKayitSatir[],
): Promise<{ hata?: string }> {
  const g = await requireYerelBilgiIslem()
  if (!g.ok) return { hata: g.hata }

  if (satirlar.length === 0) return { hata: 'En az bir satır giriniz.' }

  for (const s of satirlar) {
    if (!s.sahiplik_durum_id || !s.arac_durum_id || !s.arac_turu_id || !s.arac_alt_tur_id) {
      return { hata: 'Araç durumu, türü ve alt türü zorunludur.' }
    }
    if (g.isAdmin && (s.mudurluk_id == null || !Number.isFinite(s.mudurluk_id))) {
      return { hata: 'Her satır için müdürlük seçilmelidir.' }
    }
  }

  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  let mudurlukKullanici: number | null = null
  if (!g.isAdmin) {
    if (!g.sicilNo) return { hata: 'Sicil bilgisi bulunamadı; kayıt yapılamaz.' }
    mudurlukKullanici = await mudurlukIdFromPersonelSicil(supabase, g.sicilNo)
    if (mudurlukKullanici == null) {
      return {
        hata:
          'Kadroda dolu görev kaydınız veya eşleşen müdürlük tanımı bulunamadı. Yönetici ile iletişime geçin.',
      }
    }
    const { data: mudRow, error: mudErr } = await supabase
      .from('tanim_mudurluk')
      .select('id')
      .eq('id', mudurlukKullanici)
      .eq('aktif', true)
      .maybeSingle()
    if (mudErr || !mudRow) return { hata: 'Müdürlük geçerli değil.' }
  }

  const insertRows = satirlar.map(s => {
    const plaka = s.plaka_no.trim()
    const sasi = s.sasi_no.trim()
    const mudId = g.isAdmin ? (s.mudurluk_id as number) : mudurlukKullanici!
    return {
      sahiplik_durum_id: s.sahiplik_durum_id,
      arac_durum_id: s.arac_durum_id,
      arac_turu_id: s.arac_turu_id,
      arac_alt_tur_id: s.arac_alt_tur_id,
      plaka_no: plaka.length > 0 ? plaka : null,
      sasi_no: sasi.length > 0 ? sasi : null,
      mudurluk_id: mudId,
      aktif: true,
      created_by: g.userId,
      created_at: nowIso,
      updated_at: nowIso,
    }
  })

  if (g.isAdmin) {
    const ids = [...new Set(insertRows.map(r => r.mudurluk_id))]
    const { data: mudOk, error: mudChk } = await supabase
      .from('tanim_mudurluk')
      .select('id')
      .in('id', ids)
      .eq('aktif', true)
    if (mudChk || !mudOk || mudOk.length !== ids.length) {
      return { hata: 'Seçilen müdürlüklerden biri geçerli değil.' }
    }
  }

  const { error } = await supabase.from('yerel_bilgi_arac').insert(insertRows as never[])
  if (error) return { hata: error.message }

  revalidatePath(SAYFA)
  return {}
}

export async function aracBilgisiGuncelle(
  id: number,
  satir: AracBilgisiKayitSatir,
): Promise<{ hata?: string }> {
  const g = await requireYerelBilgiIslem()
  if (!g.ok) return { hata: g.hata }
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }

  if (
    !satir.sahiplik_durum_id ||
    !satir.arac_durum_id ||
    !satir.arac_turu_id ||
    !satir.arac_alt_tur_id
  ) {
    return { hata: 'Araç durumu, türü ve alt türü zorunludur.' }
  }
  if (g.isAdmin && (satir.mudurluk_id == null || !Number.isFinite(satir.mudurluk_id))) {
    return { hata: 'Müdürlük seçilmelidir.' }
  }

  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  let mudId: number
  if (g.isAdmin) {
    mudId = satir.mudurluk_id as number
    const { data: mudRow } = await supabase
      .from('tanim_mudurluk')
      .select('id')
      .eq('id', mudId)
      .eq('aktif', true)
      .maybeSingle()
    if (!mudRow) return { hata: 'Müdürlük geçerli değil.' }
  } else {
    if (!g.sicilNo) return { hata: 'Sicil bilgisi bulunamadı.' }
    const m = await mudurlukIdFromPersonelSicil(supabase, g.sicilNo)
    if (m == null) return { hata: 'Müdürlük çözümlenemedi.' }
    mudId = m
  }

  const plaka = satir.plaka_no.trim()
  const sasi = satir.sasi_no.trim()

  const { error } = await supabase
    .from('yerel_bilgi_arac')
    .update({
      sahiplik_durum_id: satir.sahiplik_durum_id,
      arac_durum_id: satir.arac_durum_id,
      arac_turu_id: satir.arac_turu_id,
      arac_alt_tur_id: satir.arac_alt_tur_id,
      plaka_no: plaka.length > 0 ? plaka : null,
      sasi_no: sasi.length > 0 ? sasi : null,
      mudurluk_id: mudId,
      updated_at: nowIso,
    } as never)
    .eq('id', id)

  if (error) return { hata: error.message }

  revalidatePath(SAYFA)
  return {}
}

export async function aracBilgisiToggleAktif(
  id: number,
  mevcutAktif: boolean,
): Promise<{ hata?: string }> {
  const g = await requireYerelBilgiIslem()
  if (!g.ok) return { hata: g.hata }
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('yerel_bilgi_arac')
    .update({ aktif: !mevcutAktif, updated_at: new Date().toISOString() } as never)
    .eq('id', id)
  if (error) return { hata: error.message }

  revalidatePath(SAYFA)
  return {}
}
