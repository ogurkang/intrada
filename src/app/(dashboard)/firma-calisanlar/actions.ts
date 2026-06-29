'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidateFirmaCalisanPaths } from '@/lib/revalidate-firma-calisan'
import {
  FIRMA_ALAN_ETIKETLERI,
  FIRMA_AUDIT_SELECT,
  firmaAuditSnapshot,
  writeFirmaAuditLogSafe,
} from '@/lib/firma-audit'
import {
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
} from '@/lib/personel-audit'
import {
  fetchMudurlukYerleskeTanimSatirlari,
  mudurlukYerleskeHaritasi,
  sirketYerleskeHaritasi,
  gecerliYerleskeIdKaynak,
} from '@/lib/yerleske-adresi'
import { fetchSirketYerleskeTanimSatirlari } from '@/lib/personel-gorev-konum'

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

/** Mevcut firma_calisanlar kayıtlarından bir sonraki ardışık sicil no'yu üretir. */
async function sonrakiSicilNo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data: rows } = await supabase
    .from('firma_calisanlar')
    .select('sicil_no')
    .not('sicil_no', 'is', null)

  let maks = 0
  for (const r of rows ?? []) {
    const n = parseInt(String(r.sicil_no ?? '').replace(/\D/g, ''), 10)
    if (!isNaN(n) && n > maks) maks = n
  }
  return String(maks + 1)
}

export async function firmaEkle(fd: FormData): Promise<{ hata?: string; id?: number; public_id?: string }> {
  const ad_soyad = str(fd, 'ad_soyad')
  if (!ad_soyad) return { hata: 'Ad soyad zorunludur.' }

  const supabase = await createClient()

  const sicil_no = await sonrakiSicilNo(supabase)

  const { data: inserted, error } = await supabase
    .from('firma_calisanlar')
    .insert({
      ad_soyad,
      sira_no:             str(fd, 'sira_no'),
      sicil_no,
      tckn:                str(fd, 'tckn'),
      cinsiyet:            str(fd, 'cinsiyet'),
      dogum_tarihi:        tarih(fd, 'dogum_tarihi'),
      ogrenim:             str(fd, 'ogrenim'),
      telefon:             str(fd, 'telefon'),
      e_posta:             str(fd, 'e_posta'),
      kuruma_giris_tarihi: tarih(fd, 'kuruma_giris_tarihi'),
      gorev_mudurlugu:     str(fd, 'gorev_mudurlugu'),
      gorevi:              str(fd, 'gorevi'),
      meslegi:             str(fd, 'meslegi'),
    })
    .select('id, public_id')
    .single()
  if (error) return { hata: error.message }

  if (inserted?.id) {
    const sonrakiSnap = firmaAuditSnapshot({
      sira_no:             str(fd, 'sira_no'),
      sicil_no,
      ad_soyad,
      tckn:                str(fd, 'tckn'),
      cinsiyet:            str(fd, 'cinsiyet'),
      dogum_tarihi:        tarih(fd, 'dogum_tarihi'),
      ogrenim:             str(fd, 'ogrenim'),
      telefon:             str(fd, 'telefon'),
      e_posta:             str(fd, 'e_posta'),
      kuruma_giris_tarihi: tarih(fd, 'kuruma_giris_tarihi'),
      gorev_mudurlugu:     str(fd, 'gorev_mudurlugu'),
      gorevi:              str(fd, 'gorevi'),
      meslegi:             str(fd, 'meslegi'),
      yerleske_adresi_id:  null,
    })
    await writeFirmaAuditLogSafe(supabase, {
      firmaId: inserted.id,
      islem: 'Ekle',
      ozet: `ADABEL personeli oluşturuldu (${ad_soyad}${sicil_no ? `, sicil ${sicil_no}` : ''}).`,
      sonraki: sonrakiSnap,
    })
  }

  revalidatePath('/firma-calisanlar')
  if (inserted?.id) await revalidateFirmaCalisanPaths(inserted.id)
  return { id: inserted?.id, public_id: inserted?.public_id }
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
  const { data: mevcut } = await supabase
    .from('firma_calisanlar')
    .select(FIRMA_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()

  const gorevMud = str(fd, 'gorev_mudurlugu')

  const yerleskeRaw = String(fd.get('yerleske_adresi_id') ?? '').trim()
  let yerleske_adresi_id: number | null = null
  if (yerleskeRaw) {
    const yId = Number(yerleskeRaw)
    if (!Number.isInteger(yId) || yId <= 0) return { hata: 'Geçersiz yerleşke seçimi.' }
    const [tanimSatirlar, sirketSatirlar] = await Promise.all([
      fetchMudurlukYerleskeTanimSatirlari(supabase),
      fetchSirketYerleskeTanimSatirlari(supabase),
    ])
    const yerleskeHarita = mudurlukYerleskeHaritasi(tanimSatirlar)
    const sirketYerleskeHarita = sirketYerleskeHaritasi(sirketSatirlar)
    if (!gecerliYerleskeIdKaynak(yerleskeHarita, sirketYerleskeHarita, 'firma', gorevMud, yId, gorevMud)) {
      return { hata: 'Seçilen yerleşke, görev yeri ile eşleşmiyor.' }
    }
    yerleske_adresi_id = yId
  }

  const guncelleme = {
    ad_soyad,
    sira_no:             str(fd, 'sira_no'),
    sicil_no:            str(fd, 'sicil_no'),
    tckn:                str(fd, 'tckn'),
    cinsiyet:            str(fd, 'cinsiyet'),
    dogum_tarihi:        tarih(fd, 'dogum_tarihi'),
    ogrenim:             str(fd, 'ogrenim'),
    telefon:             str(fd, 'telefon'),
    e_posta:             str(fd, 'e_posta'),
    kuruma_giris_tarihi: tarih(fd, 'kuruma_giris_tarihi'),
    gorev_mudurlugu:     gorevMud,
    gorevi:              str(fd, 'gorevi'),
    meslegi:             str(fd, 'meslegi'),
    ayrilis_tarihi:      ayrilisTarihi,
    ayrilis_nedeni:      str(fd, 'ayrilis_nedeni'),
    yerleske_adresi_id,
  }

  const { error } = await supabase.from('firma_calisanlar').update(guncelleme).eq('id', id)
  if (error) return { hata: error.message }

  const oncekiSnap = firmaAuditSnapshot(mevcut ?? {})
  const sonrakiSnap = firmaAuditSnapshot({ ...mevcut, ...guncelleme })
  const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, FIRMA_ALAN_ETIKETLERI)
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writeFirmaAuditLogSafe(supabase, {
      firmaId: id,
      islem: 'Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'ADABEL personeli güncellendi'),
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  revalidatePath('/firma-calisanlar')
  await revalidateFirmaCalisanPaths(id)
  return {}
}

export async function firmaSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: mevcut } = await supabase
    .from('firma_calisanlar')
    .select(FIRMA_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('firma_calisanlar').delete().eq('id', id)
  if (error) return { hata: error.message }

  if (mevcut) {
    const oncekiSnap = firmaAuditSnapshot(mevcut)
    const ad = String(mevcut.ad_soyad ?? '').trim() || `#${id}`
    await writeFirmaAuditLogSafe(supabase, {
      firmaId: id,
      islem: 'Sil',
      ozet: `ADABEL personeli silindi (${ad}).`,
      onceki: oncekiSnap,
    })
  }

  revalidatePath('/firma-calisanlar')
  return {}
}
