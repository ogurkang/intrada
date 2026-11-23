import type { SupabaseClient } from '@supabase/supabase-js'
import { mudurlukBazEslesir, mudurlukEslesmeBaz, unvanMudurEslesmeBaz } from '@/lib/organizasyon-birim'
import { performansMudurUnvaniMi } from '@/lib/performans-unvan'
import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'

export type PpHarcamaYetkilisiSatir = {
  siraNo: number
  harcamaYetkilisi: string
  harcamaBirimi: string
  sicilNo: string
}

export type PpHarcamaYetkilileriRapor = {
  satirlar: PpHarcamaYetkilisiSatir[]
  guncellemeAt: string | null
  /** true = DB’de mühürlü liste; false = canlı kadro (henüz kaydedilmemiş) */
  kayitli: boolean
}

export type PpHarcamaYetkilileriSirala = 'yetkili' | 'birim'
export type PpHarcamaYetkilileriYon = 'asc' | 'desc'

type CanliSatir = {
  harcamaYetkilisi: string
  harcamaBirimi: string
  sicilNo: string
}

function kadroUnvani(r: { kadro_unvani?: string | null; gorev_unvani?: string | null }): string {
  return String(r.kadro_unvani ?? '').trim() || String(r.gorev_unvani ?? '').trim()
}

function birimAdiCoz(
  r: { kadro_mudurlugu?: string | null; gorev_mudurlugu?: string | null },
  unvan: string,
  mudurlukAdlari: string[],
): string {
  const alan = String(r.gorev_mudurlugu ?? '').trim() || String(r.kadro_mudurlugu ?? '').trim()
  if (alan) return alan
  const baz = unvanMudurEslesmeBaz(unvan)
  if (!baz) return ''
  const eslesen = mudurlukAdlari.find(m => mudurlukBazEslesir(mudurlukEslesmeBaz(m), baz))
  if (eslesen) return eslesen
  const ham = unvan.replace(/\s*müdürlüğü\s*$/i, '').replace(/\s*müdürü\s*$/i, '').trim()
  return ham ? `${ham} Müdürlüğü` : ''
}

export function ppHarcamaYetkilileriSirala(
  satirlar: PpHarcamaYetkilisiSatir[],
  alan: PpHarcamaYetkilileriSirala,
  yon: PpHarcamaYetkilileriYon,
): PpHarcamaYetkilisiSatir[] {
  const carpan = yon === 'desc' ? -1 : 1
  return [...satirlar].sort((a, b) => {
    if (alan === 'birim') {
      const d = a.harcamaBirimi.localeCompare(b.harcamaBirimi, 'tr')
      if (d !== 0) return d * carpan
      return a.harcamaYetkilisi.localeCompare(b.harcamaYetkilisi, 'tr')
    }
    const d = a.harcamaYetkilisi.localeCompare(b.harcamaYetkilisi, 'tr')
    if (d !== 0) return d * carpan
    return a.harcamaBirimi.localeCompare(b.harcamaBirimi, 'tr')
  }).map((s, i) => ({ ...s, siraNo: i + 1 }))
}

/** Kadro hareketinden canlı müdür listesi (asil + vekil). */
export async function ppHarcamaYetkilileriCanliYukle(
  supabase: SupabaseClient,
): Promise<CanliSatir[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: kadroRaw }, { data: calisanRaw }, { data: mudRaw }] = await Promise.all([
    fetchAllKadroHareketleri(
      supabase,
      'id, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil, iptal_karar_tarihi, iptal_karar_no, durumu',
    ),
    sb.from('calisan').select('sicil_no, ad_soyad'),
    sb.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true),
  ])

  const adBySicil = new Map<string, string>()
  for (const c of calisanRaw ?? []) {
    const sicil = String(c.sicil_no ?? '').trim()
    if (!sicil) continue
    adBySicil.set(sicil, String(c.ad_soyad ?? '').trim() || '—')
  }
  const mudurlukAdlari = ((mudRaw ?? []) as { mudurluk_adi: string }[])
    .map(m => String(m.mudurluk_adi ?? '').trim())
    .filter(Boolean)

  const tekil = new Map<string, CanliSatir>()
  for (const k of kadroRaw ?? []) {
    if (k.iptal_karar_tarihi || k.iptal_karar_no) continue
    if (k.durumu === 'İptal' || k.durumu === 'Boş') continue
    const unvan = kadroUnvani(k)
    if (!unvan || !performansMudurUnvaniMi(unvan)) continue
    const birim = birimAdiCoz(k, unvan, mudurlukAdlari)
    if (!birim) continue

    for (const sicilHam of [k.asil, k.vekil]) {
      const sicil = String(sicilHam ?? '').trim()
      if (!sicil) continue
      const ad = adBySicil.get(sicil) ?? '—'
      const key = `${sicil}\0${birim}`
      if (!tekil.has(key)) {
        tekil.set(key, {
          harcamaYetkilisi: ad,
          harcamaBirimi: birim,
          sicilNo: sicil,
        })
      }
    }
  }

  return [...tekil.values()].sort((a, b) =>
    a.harcamaYetkilisi.localeCompare(b.harcamaYetkilisi, 'tr')
    || a.harcamaBirimi.localeCompare(b.harcamaBirimi, 'tr'),
  )
}

function canliyiSatira(canli: CanliSatir[]): PpHarcamaYetkilisiSatir[] {
  return canli.map((s, i) => ({
    siraNo: i + 1,
    harcamaYetkilisi: s.harcamaYetkilisi,
    harcamaBirimi: s.harcamaBirimi,
    sicilNo: s.sicilNo,
  }))
}

/** Ekran: kayıt varsa mühürlü liste, yoksa canlı kadro (hazır). */
export async function ppHarcamaYetkilileriEkranYukle(
  supabase: SupabaseClient,
): Promise<PpHarcamaYetkilileriRapor> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data, error } = await sb
    .from('performans_programi_harcama_yetkilileri')
    .select('sira_no, harcama_yetkilisi, harcama_birimi, sicil_no, guncelleme_at')
    .order('sira_no', { ascending: true })

  if (!error && data && (data as unknown[]).length > 0) {
    const rows = data as {
      sira_no: number
      harcama_yetkilisi: string
      harcama_birimi: string
      sicil_no: string
      guncelleme_at: string
    }[]
    return {
      kayitli: true,
      guncellemeAt: rows[0]?.guncelleme_at ?? null,
      satirlar: rows.map(r => ({
        siraNo: Number(r.sira_no) || 0,
        harcamaYetkilisi: String(r.harcama_yetkilisi ?? ''),
        harcamaBirimi: String(r.harcama_birimi ?? ''),
        sicilNo: String(r.sicil_no ?? ''),
      })),
    }
  }

  const canli = await ppHarcamaYetkilileriCanliYukle(supabase)
  return {
    kayitli: false,
    guncellemeAt: null,
    satirlar: canliyiSatira(canli),
  }
}

/** @deprecated ppHarcamaYetkilileriEkranYukle kullanın */
export async function ppHarcamaYetkilileriKayitliYukle(
  supabase: SupabaseClient,
): Promise<PpHarcamaYetkilileriRapor> {
  return ppHarcamaYetkilileriEkranYukle(supabase)
}

/** Canlı kadrodan çekip tabloyu mühürler / günceller. */
export async function ppHarcamaYetkilileriKaydet(
  supabase: SupabaseClient,
  kullanici: string,
): Promise<{ ok: true; adet: number } | { ok: false; hata: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const canli = await ppHarcamaYetkilileriCanliYukle(supabase)
  const now = new Date().toISOString()

  const { error: silHata } = await sb
    .from('performans_programi_harcama_yetkilileri')
    .delete()
    .gte('id', 1)
  if (silHata) {
    return {
      ok: false,
      hata: silHata.message?.includes('does not exist') || silHata.code === '42P01'
        ? 'Veritabanı tablosu yok. 20261123190000_pp_harcama_yetkilileri.sql dosyasını Supabase SQL editöründe çalıştırın.'
        : silHata.message,
    }
  }

  if (!canli.length) return { ok: true, adet: 0 }

  const insert = canli.map((s, i) => ({
    sira_no: i + 1,
    harcama_yetkilisi: s.harcamaYetkilisi,
    harcama_birimi: s.harcamaBirimi,
    sicil_no: s.sicilNo,
    guncelleme_at: now,
    guncelleyen: kullanici,
  }))

  const { error: ekleHata } = await sb
    .from('performans_programi_harcama_yetkilileri')
    .insert(insert)
  if (ekleHata) return { ok: false, hata: ekleHata.message }
  return { ok: true, adet: insert.length }
}
