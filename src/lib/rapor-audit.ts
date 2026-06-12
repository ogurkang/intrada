import type { SupabaseClient } from '@supabase/supabase-js'
import { alanDegisiklikleriHesapla, degisiklikOzeti, degisiklikPayload, writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { raporTanimByKod } from '@/lib/rapor-tanimlari'

export const RAPOR_KAPSAM_ALAN_ETIKETLERI: Record<string, string> = {
  rapor_olusturulma_tarihi: 'Rapor Oluşturulma Tarihi',
  kayit_sayisi: 'Seçili Kayıt Sayısı',
  kayit_ozet: 'Seçili Kayıtlar (özet)',
  yil: 'Yıl',
  sira_bas: 'Sıra Başlangıç',
  sira_bit: 'Sıra Bitiş',
  excel_kayit_sayisi: 'Excel Kayıt Sayısı',
}

export interface RaporKapsamSnapshot {
  rapor_olusturulma_tarihi?: string | null
  kayit_sayisi?: number | null
  kayit_ozet?: string | null
  yil?: number | null
  sira_bas?: number | null
  sira_bit?: number | null
  excel_kayit_sayisi?: number | null
}

function normalizeKeys(keys: string[]): string[] {
  return Array.from(new Set(keys.map(k => String(k ?? '').trim()).filter(Boolean)))
}

export function raporKayitOzet(keys: string[], max = 8): string {
  const list = normalizeKeys(keys)
  if (!list.length) return '—'
  if (list.length <= max) return list.join(', ')
  return `${list.slice(0, max).join(', ')} … (+${list.length - max})`
}

export function raporAyarListeKapsamSnapshot(
  keys: string[],
  raporOlusturulmaTarihi?: string | null,
): RaporKapsamSnapshot {
  const list = normalizeKeys(keys)
  return {
    rapor_olusturulma_tarihi: raporOlusturulmaTarihi ?? null,
    kayit_sayisi: list.length,
    kayit_ozet: raporKayitOzet(list),
  }
}

export function raporExcelAralikKapsamSnapshot(input: {
  yil: number
  siraBas: number
  siraBit: number
  kayitSayisi: number
  raporOlusturulmaTarihi?: string | null
}): RaporKapsamSnapshot {
  return {
    rapor_olusturulma_tarihi: input.raporOlusturulmaTarihi ?? null,
    yil: input.yil,
    sira_bas: input.siraBas,
    sira_bit: input.siraBit,
    excel_kayit_sayisi: input.kayitSayisi,
  }
}

export function raporKapsamDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return alanDegisiklikleriHesapla(
    (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>,
    (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>,
    RAPOR_KAPSAM_ALAN_ETIKETLERI,
  )
}

export function raporKapsamDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'rapor_olusturulma_tarihi') {
    const d = new Date(String(deger))
    return Number.isNaN(d.getTime()) ? String(deger) : d.toLocaleDateString('tr-TR')
  }
  return String(deger)
}

async function raporOlusturulmaTarihiAl(
  supabase: SupabaseClient,
  raporKod: string,
): Promise<string | null> {
  const statik = raporTanimByKod(raporKod)?.olusturulma_tarihi ?? null
  const { data } = await supabase
    .from('rapor_tanim')
    .select('olusturulma_tarihi')
    .eq('kod', raporKod)
    .maybeSingle()
  return data?.olusturulma_tarihi ?? statik
}

export async function writeRaporKapsamAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    raporKod: string
    islem: string
    ozet: string
    onceki?: RaporKapsamSnapshot | null
    sonraki?: RaporKapsamSnapshot | null
  },
): Promise<void> {
  const olusturulma = await raporOlusturulmaTarihiAl(supabase, input.raporKod)
  const onceki = input.onceki ? { ...input.onceki } : {}
  const sonraki = { ...(input.sonraki ?? {}), rapor_olusturulma_tarihi: olusturulma }

  if (!Object.keys(onceki).length && Object.keys(sonraki).length) {
    ;(onceki as RaporKapsamSnapshot).rapor_olusturulma_tarihi = olusturulma
  }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'rapor',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'rapor_tanim',
    ref_id: input.raporKod,
    onceki: Object.keys(onceki).length ? onceki : null,
    sonraki,
  })
}

export async function logRaporAyarListeDegisikligi(
  supabase: SupabaseClient,
  raporKod: string,
  oncekiKeys: string[],
  sonrakiKeys: string[],
): Promise<void> {
  const olusturulma = await raporOlusturulmaTarihiAl(supabase, raporKod)
  const oncekiSnap = raporAyarListeKapsamSnapshot(oncekiKeys, olusturulma)
  const sonrakiSnap = raporAyarListeKapsamSnapshot(sonrakiKeys, olusturulma)
  const degisiklikler = alanDegisiklikleriHesapla(
    oncekiSnap as Record<string, unknown>,
    sonrakiSnap as Record<string, unknown>,
    RAPOR_KAPSAM_ALAN_ETIKETLERI,
  )
  if (degisiklikler.length === 0) return

  const payload = degisiklikPayload(degisiklikler)
  await writeRaporKapsamAuditLogSafe(supabase, {
    raporKod,
    islem: 'Kapsam Güncelle',
    ozet: degisiklikOzeti(degisiklikler, 'Rapor kapsamı güncellendi'),
    onceki: payload.onceki as RaporKapsamSnapshot,
    sonraki: payload.sonraki as RaporKapsamSnapshot,
  })
}
