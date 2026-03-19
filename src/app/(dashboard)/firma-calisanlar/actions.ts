'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** gg.aa.yyyy formatındaki tarihi yyyy-mm-dd'ye çevirir */
function parseTarihFromNeden(neden: string | null): string | null {
  if (!neden || !neden.trim()) return null
  const m = neden.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  const [, g, a, y] = m
  const gun = g!.padStart(2, '0')
  const ay = a!.padStart(2, '0')
  return `${y}-${ay}-${gun}`
}

/** Client'tan tetiklenebilir: ayrılış nedeni gg.aa.yyyy ise ayrılış tarihine taşır. Render sırasında çağrılmamalı. */
export async function firmaAyrilisTarihiNormalize(): Promise<{ guncellenen: number }> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('firma_calisanlar')
    .select('id, ayrilis_tarihi, ayrilis_nedeni')
  let guncellenen = 0
  for (const r of rows ?? []) {
    if (r.ayrilis_tarihi && r.ayrilis_tarihi.trim()) continue
    const tarih = parseTarihFromNeden(r.ayrilis_nedeni)
    if (!tarih) continue
    await supabase.from('firma_calisanlar').update({ ayrilis_tarihi: tarih }).eq('id', r.id)
    guncellenen++
  }
  if (guncellenen > 0) revalidatePath('/firma-calisanlar')
  return { guncellenen }
}

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function tarih(fd: FormData, key: string): string | null {
  return str(fd, key)
}

export async function firmaEkle(fd: FormData): Promise<{ hata?: string }> {
  const ad_soyad = str(fd, 'ad_soyad')
  if (!ad_soyad) return { hata: 'Ad soyad zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('firma_calisanlar').insert({
    ad_soyad,
    sira_no:             str(fd, 'sira_no'),
    sicil_no:            str(fd, 'sicil_no'),
    tckn:                str(fd, 'tckn'),
    cinsiyet:            str(fd, 'cinsiyet'),
    dogum_tarihi:        tarih(fd, 'dogum_tarihi'),
    ogrenim:             str(fd, 'ogrenim'),
    telefon:             str(fd, 'telefon'),
    kuruma_giris_tarihi: tarih(fd, 'kuruma_giris_tarihi'),
    gorev_mudurlugu:     str(fd, 'gorev_mudurlugu'),
    gorevi:              str(fd, 'gorevi'),
    meslegi:             str(fd, 'meslegi'),
    ayrilis_tarihi:      tarih(fd, 'ayrilis_tarihi'),
    ayrilis_nedeni:      str(fd, 'ayrilis_nedeni'),
  })
  if (error) return { hata: error.message }
  revalidatePath('/firma-calisanlar')
  return {}
}

export async function firmaGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const ad_soyad = str(fd, 'ad_soyad')
  if (!ad_soyad) return { hata: 'Ad soyad zorunludur.' }

  let ayrilisTarihi = tarih(fd, 'ayrilis_tarihi')
  if (!ayrilisTarihi) {
    const neden = str(fd, 'ayrilis_nedeni')
    ayrilisTarihi = parseTarihFromNeden(neden ?? '') ?? null
  }

  const supabase = await createClient()
  const { error } = await supabase.from('firma_calisanlar').update({
    ad_soyad,
    sira_no:             str(fd, 'sira_no'),
    sicil_no:            str(fd, 'sicil_no'),
    tckn:                str(fd, 'tckn'),
    cinsiyet:            str(fd, 'cinsiyet'),
    dogum_tarihi:        tarih(fd, 'dogum_tarihi'),
    ogrenim:             str(fd, 'ogrenim'),
    telefon:             str(fd, 'telefon'),
    kuruma_giris_tarihi: tarih(fd, 'kuruma_giris_tarihi'),
    gorev_mudurlugu:     str(fd, 'gorev_mudurlugu'),
    gorevi:              str(fd, 'gorevi'),
    meslegi:             str(fd, 'meslegi'),
    ayrilis_tarihi:      ayrilisTarihi,
    ayrilis_nedeni:      str(fd, 'ayrilis_nedeni'),
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/firma-calisanlar')
  revalidatePath(`/firma-calisanlar/${id}`)
  return {}
}

export async function firmaSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('firma_calisanlar').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/firma-calisanlar')
  return {}
}
