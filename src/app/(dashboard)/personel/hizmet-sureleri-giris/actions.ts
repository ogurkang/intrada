'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'

function parseNonNegInt(v: unknown): number {
  const n = parseInt(String(v ?? '').trim(), 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

export interface HizmetSureGirisSatir {
  sicil_no: string
  hizmet_suresi_yil: number
  hizmet_suresi_ay: number
  hizmet_suresi_gun: number
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function normalize(v: string | null | undefined): string {
  return String(v ?? '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
}

function isIsciOrSozlesmeli(statu: string | null | undefined): boolean {
  const s = normalize(statu)
  return s.includes('isci') || s.includes('sozlesmeli')
}

function toDateOnly(s: string | null | undefined): string | null {
  if (!s) return null
  const d = String(s).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
}

function diffDays(startYmd: string, endYmd: string): number {
  const s = new Date(`${startYmd}T00:00:00Z`)
  const e = new Date(`${endYmd}T00:00:00Z`)
  const ms = e.getTime() - s.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return Math.floor(ms / 86400000)
}

function gunu360Parcala(toplamGun: number): { yil: number; ay: number; gun: number } {
  const t = Math.max(0, Math.floor(toplamGun))
  const yil = Math.floor(t / 360)
  const kalan = t % 360
  const ay = Math.floor(kalan / 30)
  const gun = kalan % 30
  return { yil, ay, gun }
}

async function revalidateHizmetGiris(sicil_no: string) {
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/personel')
  revalidatePath('/personel/hizmet-sureleri-giris')
}

/** Tek satır — yalnızca hizmet süresi (360 gün esası). */
export async function hizmetSureleriSatirKaydet(
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: row, error: selErr } = await supabase
    .from('calisan')
    .select('gorev_turu')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  if (selErr) return { hata: selErr.message }
  if ((row?.gorev_turu ?? 'Çalışan') === 'Aylıksız İzin') {
    return {
      hata:
        'Görev türü Aylıksız İzin olan personelde hizmet süresi bu ekrandan güncellenmez (kişisel bilgiler ile aynı kural).',
    }
  }

  const yil = parseNonNegInt(fd.get('hizmet_suresi_yil'))
  const ay = parseNonNegInt(fd.get('hizmet_suresi_ay'))
  const gun = parseNonNegInt(fd.get('hizmet_suresi_gun'))

  const { error } = await supabase
    .from('calisan')
    .update({
      hizmet_suresi_yil: yil,
      hizmet_suresi_ay: ay,
      hizmet_suresi_gun: gun,
    })
    .eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }
  await revalidateHizmetGiris(sicil_no)
  return {}
}

/** Toplu — değişen siciller. Aylıksız İzin satırları atlanır (kişisel bilgiler ile aynı kural). */
export async function hizmetSureleriTopluKaydet(
  satirlar: HizmetSureGirisSatir[]
): Promise<{ hata?: string; kaydedilen?: number; atlanan?: number }> {
  if (!satirlar.length) return { kaydedilen: 0, atlanan: 0 }
  const supabase = await createClient()
  const guncellenenSiciller: string[] = []
  let atlanan = 0

  for (const s of satirlar) {
    const { data: row, error: selErr } = await supabase
      .from('calisan')
      .select('gorev_turu')
      .eq('sicil_no', s.sicil_no)
      .maybeSingle()
    if (selErr) return { hata: selErr.message }
    if ((row?.gorev_turu ?? 'Çalışan') === 'Aylıksız İzin') {
      atlanan++
      continue
    }

    const { error } = await supabase
      .from('calisan')
      .update({
        hizmet_suresi_yil: Math.max(0, Math.floor(s.hizmet_suresi_yil)),
        hizmet_suresi_ay: Math.max(0, Math.floor(s.hizmet_suresi_ay)),
        hizmet_suresi_gun: Math.max(0, Math.floor(s.hizmet_suresi_gun)),
      })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
    guncellenenSiciller.push(s.sicil_no)
  }

  for (const sicil of new Set(guncellenenSiciller)) {
    await revalidateHizmetGiris(sicil)
  }
  return { kaydedilen: guncellenenSiciller.length, atlanan }
}

/** İşçi + Sözleşmeli için kuruma giriş tarihinden 360 gün esası ile toplu hesaplar. */
export async function hizmetSureleriTopluHesaplaIsciSozlesmeli(): Promise<{
  hata?: string
  guncellenen?: number
  atlanan?: number
}> {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw, error: calErr }, { data: phRaw, error: phErr }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, gorev_turu'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
  ])
  if (calErr) return { hata: calErr.message }
  if (phErr) return { hata: phErr.message }

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }

  const aktifSiciller = (calisanRaw ?? [])
    .filter(c => !sonAyrilisPerSicil.get(c.sicil_no))
    .map(c => c.sicil_no)

  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const part of chunk(aktifSiciller, 120)) {
    if (!part.length) continue
    const { data: kRows, error: kErr } = await supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .in('asil', part)
    if (kErr) return { hata: kErr.message }
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroRaporRow)
      kadroByAsil.set(r.asil, list)
    }
  }

  let guncellenen = 0
  let atlanan = 0
  const guncellenenSiciller: string[] = []

  for (const c of calisanRaw ?? []) {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (sonAyrilis) continue
    if ((c.gorev_turu ?? 'Çalışan') === 'Aylıksız İzin') {
      atlanan++
      continue
    }
    const rows = kadroByAsil.get(c.sicil_no) ?? []
    const sec = secilenKadroSatirAsil(rows, D)
    if (!sec || !isIsciOrSozlesmeli(sec.statu)) {
      atlanan++
      continue
    }
    const bas = toDateOnly(sec.kuruma_giris_tarihi)
    if (!bas || bas > D) {
      atlanan++
      continue
    }
    const toplamGun = diffDays(bas, D)
    const { yil, ay, gun } = gunu360Parcala(toplamGun)
    const { error: upErr } = await supabase
      .from('calisan')
      .update({
        hizmet_suresi_yil: yil,
        hizmet_suresi_ay: ay,
        hizmet_suresi_gun: gun,
      })
      .eq('sicil_no', c.sicil_no)
    if (upErr) return { hata: upErr.message }
    guncellenen++
    guncellenenSiciller.push(c.sicil_no)
  }

  for (const sicil of new Set(guncellenenSiciller)) {
    await revalidatePersonelDetayPaths(sicil)
  }
  revalidatePath('/personel')
  revalidatePath('/personel/hizmet-sureleri-giris')

  return { guncellenen, atlanan }
}
