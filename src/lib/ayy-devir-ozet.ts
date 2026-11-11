/**
 * AYY kapalı dönem devir özeti: kapatınca yaz, sonraki dönemde oku.
 * Amaç: her gezintide önceki dönemi yeniden hesaplamamak.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrevPersonelIzOverflowInfo } from '@/lib/ayy-hesap'

export type AyyDevirOzet = {
  sdBySiraNo: Record<string, number>
  izBySiraNo: Record<string, number>
  /** sira_no → sicil (SD override için) */
  sicilBySiraNo: Record<string, string>
  zabitaOverflowBySicil: Record<string, PrevPersonelIzOverflowInfo>
  yariZamanliOdBySicil: Record<string, number>
}

export function ayyDevirOzetBos(): AyyDevirOzet {
  return {
    sdBySiraNo: {},
    izBySiraNo: {},
    sicilBySiraNo: {},
    zabitaOverflowBySicil: {},
    yariZamanliOdBySicil: {},
  }
}

export async function ayyDevirOzetVarMi(
  supabase: SupabaseClient,
  donemId: number,
): Promise<boolean> {
  const { data } = await supabase
    .from('ayy_devir_ozet_meta')
    .select('donem_id')
    .eq('donem_id', donemId)
    .maybeSingle()
  return Boolean(data?.donem_id)
}

export async function ayyDevirOzetOku(
  supabase: SupabaseClient,
  donemId: number,
): Promise<AyyDevirOzet | null> {
  const { data: meta } = await supabase
    .from('ayy_devir_ozet_meta')
    .select('donem_id')
    .eq('donem_id', donemId)
    .maybeSingle()
  if (!meta) return null

  const [{ data: izinler }, { data: siciller }] = await Promise.all([
    supabase.from('ayy_devir_izin').select('sira_no, sicil_no, sd, iz').eq('donem_id', donemId),
    supabase.from('ayy_devir_sicil').select('sicil_no, tur, gun, ad_soyad, unvan').eq('donem_id', donemId),
  ])

  const ozet = ayyDevirOzetBos()
  for (const r of izinler ?? []) {
    const sira = String(r.sira_no ?? '').trim()
    if (!sira) continue
    const sd = Number(r.sd) || 0
    const iz = Number(r.iz) || 0
    const sicil = String(r.sicil_no ?? '').trim()
    if (sicil) ozet.sicilBySiraNo[sira] = sicil
    if (sd > 0) ozet.sdBySiraNo[sira] = sd
    if (iz > 0) ozet.izBySiraNo[sira] = iz
  }
  for (const r of siciller ?? []) {
    const sicil = String(r.sicil_no ?? '').trim()
    if (!sicil) continue
    const gun = Number(r.gun) || 0
    if (gun <= 0) continue
    if (r.tur === 'yari_zamanli') {
      ozet.yariZamanliOdBySicil[sicil] = gun
    } else if (r.tur === 'zabita_overflow') {
      ozet.zabitaOverflowBySicil[sicil] = {
        overflow: gun,
        ad_soyad: r.ad_soyad ?? sicil,
        unvan: r.unvan ?? '',
      }
    }
  }
  return ozet
}

/** Kapalı dönem için özeti yazar (varsa silip yeniden yazar). */
export async function ayyDevirOzetYaz(
  supabase: SupabaseClient,
  donemId: number,
  ozet: AyyDevirOzet,
): Promise<{ hata?: string }> {
  await supabase.from('ayy_devir_izin').delete().eq('donem_id', donemId)
  await supabase.from('ayy_devir_sicil').delete().eq('donem_id', donemId)
  await supabase.from('ayy_devir_ozet_meta').delete().eq('donem_id', donemId)

  const izinRows: { donem_id: number; sira_no: string; sicil_no: string | null; sd: number; iz: number }[] = []
  const siraSet = new Set([
    ...Object.keys(ozet.sdBySiraNo),
    ...Object.keys(ozet.izBySiraNo),
  ])
  for (const sira of siraSet) {
    const sd = ozet.sdBySiraNo[sira] ?? 0
    const iz = ozet.izBySiraNo[sira] ?? 0
    if (sd <= 0 && iz <= 0) continue
    izinRows.push({
      donem_id: donemId,
      sira_no: sira,
      sicil_no: ozet.sicilBySiraNo[sira] ?? null,
      sd,
      iz,
    })
  }

  const sicilRows: {
    donem_id: number
    sicil_no: string
    tur: 'yari_zamanli' | 'zabita_overflow'
    gun: number
    ad_soyad: string | null
    unvan: string | null
  }[] = []

  for (const [sicil, gun] of Object.entries(ozet.yariZamanliOdBySicil)) {
    if (gun <= 0) continue
    sicilRows.push({
      donem_id: donemId,
      sicil_no: sicil,
      tur: 'yari_zamanli',
      gun,
      ad_soyad: null,
      unvan: null,
    })
  }
  for (const [sicil, info] of Object.entries(ozet.zabitaOverflowBySicil)) {
    if (info.overflow <= 0) continue
    sicilRows.push({
      donem_id: donemId,
      sicil_no: sicil,
      tur: 'zabita_overflow',
      gun: info.overflow,
      ad_soyad: info.ad_soyad ?? null,
      unvan: info.unvan ?? null,
    })
  }

  if (izinRows.length > 0) {
    const { error } = await supabase.from('ayy_devir_izin').insert(izinRows as never[])
    if (error) return { hata: error.message }
  }
  if (sicilRows.length > 0) {
    const { error } = await supabase.from('ayy_devir_sicil').insert(sicilRows as never[])
    if (error) return { hata: error.message }
  }

  const { error: metaErr } = await supabase
    .from('ayy_devir_ozet_meta')
    .insert({ donem_id: donemId } as never)
  if (metaErr) return { hata: metaErr.message }
  return {}
}
