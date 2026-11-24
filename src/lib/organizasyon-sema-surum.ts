import type { SupabaseClient } from '@supabase/supabase-js'
import { performansMudurUnvaniMi } from '@/lib/performans-unvan'
import {
  mudurlukEslesmeBaz,
  mudurlukBazTamEslesir,
  organizasyonPersonelIndeksKur,
  type KadroUnvanSatir,
} from '@/lib/organizasyon-birim'
import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { revalidatePath } from 'next/cache'

/** Temmuz 2026 sonrası müdür kadro değişiminde org şeması sürümü. */
export const ORG_SEMA_SURUM_BASLANGIC = '2026-07-01'

const LISTE = '/tanimlar/organizasyon'

function yilPrefix(yil: number): string {
  return `Organizasyon Şeması - ${yil}/`
}

/**
 * Unvan müdür mü? Önce mudur_mu bayrağı; kolon yoksa / false ise ada bakılır (geçiş).
 */
export function unvanMudurMuKayit(u: {
  mudur_mu?: boolean | null
  unvan_adi?: string | null
} | null | undefined): boolean {
  if (!u) return false
  if (u.mudur_mu === true) return true
  return performansMudurUnvaniMi(String(u.unvan_adi ?? ''))
}

export async function personelHareketiMudurKadroDegistiMi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  opts: {
    yururlukTarihi: string | null
    oncekiKadroId: number | null
    yeniKadroId: number | null
    eskiUnvan: string | null
    yeniUnvan: string | null
  },
): Promise<boolean> {
  // Özellik Temmuz 2026’dan itibaren açıktır. Yürürlük tarihi eski olsa bile
  // (geçmiş atama kaydı), bugün müdür kadrosu değişiyorsa sürüm alınır.
  const bugun = new Date().toISOString().slice(0, 10)
  if (bugun < ORG_SEMA_SURUM_BASLANGIC) return false

  const ids = [opts.oncekiKadroId, opts.yeniKadroId].filter((n): n is number => n != null && n > 0)
  if (ids.length) {
    const { data: kadrolar } = await supabase
      .from('kadro_hareketleri')
      .select('id, kadro_unvan_id, gorev_unvan_id, kadro_unvani, gorev_unvani')
      .in('id', ids)
    const unvanIdAdaylari: Array<number | null> = (kadrolar ?? []).flatMap(
      (k: { kadro_unvan_id: number | null; gorev_unvan_id: number | null }) =>
        [k.kadro_unvan_id, k.gorev_unvan_id],
    )
    const unvanIds = [...new Set(unvanIdAdaylari.filter((n): n is number => n != null))]
    if (unvanIds.length) {
      const { data: unvanlar } = await supabase
        .from('tanim_unvan')
        .select('id, unvan_adi, mudur_mu')
        .in('id', unvanIds)
      if ((unvanlar ?? []).some((u: { mudur_mu?: boolean; unvan_adi: string }) => unvanMudurMuKayit(u))) {
        return true
      }
    }
    for (const k of kadrolar ?? []) {
      const ad = String(k.gorev_unvani ?? k.kadro_unvani ?? '').trim()
      if (performansMudurUnvaniMi(ad)) return true
    }
  }

  if (performansMudurUnvaniMi(opts.eskiUnvan ?? '') || performansMudurUnvaniMi(opts.yeniUnvan ?? '')) {
    return true
  }
  return false
}

/** Aktif (veya verilen) org şemasındaki müdür/başkan birimlerine kadrodan sicil snapshot yazar. */
export async function organizasyonMudurSnapshotAl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  organizasyonId?: number,
): Promise<void> {
  let orgId = organizasyonId
  if (orgId == null) {
    const { data: aktif } = await supabase
      .from('tanim_organizasyon')
      .select('id')
      .eq('aktif', true)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()
    orgId = aktif?.id
  }
  if (orgId == null) return

  const [{ data: birimler }, { data: kadroRaw }] = await Promise.all([
    supabase
      .from('tanim_organizasyon_birim')
      .select('id, mudurluk_id, birim_turu, personel_sicil_no, tanim_mudurluk ( mudurluk_adi )')
      .eq('organizasyon_id', orgId),
    fetchAllKadroHareketleri(
      supabase,
      'durumu, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil, asil_calisan:calisan!kadro_hareketleri_asil_fkey ( ad_soyad ), vekil_calisan:calisan!kadro_hareketleri_vekil_fkey ( ad_soyad )',
      (q: { in: (c: string, v: string[]) => unknown }) => q.in('durumu', ['Dolu', 'Vekil']),
    ),
  ])

  const indeks = organizasyonPersonelIndeksKur((kadroRaw ?? []) as unknown as KadroUnvanSatir[])

  for (const b of birimler ?? []) {
    const tur = String(b.birim_turu ?? '')
    if (tur === 'baskan_yardimcisi') continue

    let sicil: string | null = null
    if (tur === 'baskan') {
      sicil = indeks.baskanSicilleri.join(',') || null
    } else if (tur === 'mudurluk') {
      const mudAd = Array.isArray(b.tanim_mudurluk)
        ? b.tanim_mudurluk[0]?.mudurluk_adi
        : b.tanim_mudurluk?.mudurluk_adi
      const baz = mudurlukEslesmeBaz(mudAd)
      const siciller: string[] = []
      if (baz) {
        for (const [k, vals] of indeks.mudurSicilByBaz) {
          if (mudurlukBazTamEslesir(baz, k)) siciller.push(...vals)
        }
      }
      sicil = [...new Set(siciller)].sort((a, b) => a.localeCompare(b, 'tr')).join(',') || null
    } else {
      continue
    }

    if (String(b.personel_sicil_no ?? '') === String(sicil ?? '')) continue
    await supabase
      .from('tanim_organizasyon_birim')
      .update({ personel_sicil_no: sicil })
      .eq('id', b.id)
  }
}

/**
 * Aktif organizasyonu kopyalar; adı «Organizasyon Şeması - YYYY/sıra».
 * Eski aktif pasifleştirilir.
 */
export async function organizasyonSemaSurumuKaydet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  neden: string,
): Promise<{ ok: true; yeniId: number; ad: string } | { ok: false; hata: string }> {
  const { data: aktif } = await supabase
    .from('tanim_organizasyon')
    .select('id, organizasyon_adi')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!aktif?.id) return { ok: false, hata: 'Aktif organizasyon şeması yok.' }

  const yil = new Date().getFullYear()
  const prefix = yilPrefix(yil)
  const { data: ayniYil } = await supabase
    .from('tanim_organizasyon')
    .select('organizasyon_adi')
    .ilike('organizasyon_adi', `${prefix}%`)

  let maxSira = 0
  for (const r of ayniYil ?? []) {
    const ad = String(r.organizasyon_adi ?? '')
    const m = ad.slice(prefix.length).match(/^(\d+)/)
    if (m) maxSira = Math.max(maxSira, Number(m[1]))
  }
  const yeniAd = `${prefix}${maxSira + 1}`

  const { data: birimler, error: birimHata } = await supabase
    .from('tanim_organizasyon_birim')
    .select('id, mudurluk_id, birim_turu, personel_sicil_no, ust_birim_id, sira_no')
    .eq('organizasyon_id', aktif.id)
    .order('sira_no', { ascending: true })

  if (birimHata) return { ok: false, hata: birimHata.message }

  const { data: yeniOrg, error: orgHata } = await supabase
    .from('tanim_organizasyon')
    .insert({ organizasyon_adi: yeniAd, aktif: true })
    .select('id')
    .single()

  if (orgHata || !yeniOrg?.id) {
    return { ok: false, hata: orgHata?.message ?? 'Yeni organizasyon oluşturulamadı.' }
  }

  await supabase
    .from('tanim_organizasyon')
    .update({ aktif: false })
    .eq('id', aktif.id)

  const eskiListe = (birimler ?? []) as {
    id: number
    mudurluk_id: number | null
    birim_turu: string
    personel_sicil_no: string | null
    ust_birim_id: number | null
    sira_no: number
  }[]

  const idMap = new Map<number, number>()
  const kalan = [...eskiListe]
  let guvenlik = 0
  while (kalan.length && guvenlik < 50) {
    guvenlik += 1
    const buTur: typeof kalan = []
    for (const b of kalan) {
      if (b.ust_birim_id != null && !idMap.has(b.ust_birim_id)) {
        buTur.push(b)
        continue
      }
      const ustYeni = b.ust_birim_id != null ? (idMap.get(b.ust_birim_id) ?? null) : null
      const { data: yeniBirim, error } = await supabase
        .from('tanim_organizasyon_birim')
        .insert({
          organizasyon_id: yeniOrg.id,
          mudurluk_id: b.mudurluk_id,
          birim_turu: b.birim_turu,
          personel_sicil_no: b.personel_sicil_no,
          ust_birim_id: ustYeni,
          sira_no: b.sira_no,
        })
        .select('id')
        .single()
      if (error || !yeniBirim?.id) {
        return { ok: false, hata: error?.message ?? 'Birim kopyalanamadı.' }
      }
      idMap.set(b.id, yeniBirim.id)
    }
    kalan.length = 0
    kalan.push(...buTur.filter(b => !idMap.has(b.id)))
  }

  try {
    revalidatePath(LISTE)
    revalidatePath(`${LISTE}/${yeniOrg.id}`)
    revalidatePath(`${LISTE}/${aktif.id}`)
  } catch {
    /* server action dışı çağrıda revalidate yok sayılır */
  }

  void neden
  return { ok: true, yeniId: yeniOrg.id, ad: yeniAd }
}

/**
 * Kadro güncellenmeden önce: müdür değişecekse aktif şemaya o anki müdürleri yaz (eski sürüm dondurulur).
 */
export async function personelHareketiOncesiOrgSemaDondur(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  opts: {
    yururlukTarihi: string | null
    oncekiKadroId: number | null
    yeniKadroId: number | null
    eskiUnvan: string | null
    yeniUnvan: string | null
  },
): Promise<boolean> {
  try {
    const degisti = await personelHareketiMudurKadroDegistiMi(supabase, opts)
    if (!degisti) return false
    await organizasyonMudurSnapshotAl(supabase)
    return true
  } catch {
    return false
  }
}

/**
 * Kadro güncellendikten sonra: dondurulmuş şemayı kopyala; yeni aktifte güncel müdürleri yaz.
 * Hata ana kaydı bozmaz.
 */
export async function personelHareketiSonrasiOrgSemaSurumu(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  opts: {
    yururlukTarihi: string | null
    oncekiKadroId: number | null
    yeniKadroId: number | null
    eskiUnvan: string | null
    yeniUnvan: string | null
    /** true ise öncesi dondurma zaten yapıldı; tekrar kontrol etme */
    donduruldu?: boolean
  },
): Promise<{ ok: boolean; ad?: string; hata?: string }> {
  try {
    const degisti = opts.donduruldu === true
      ? true
      : await personelHareketiMudurKadroDegistiMi(supabase, opts)
    if (!degisti) return { ok: false, hata: 'müdür-degil' }
    const sonuc = await organizasyonSemaSurumuKaydet(supabase, 'Müdür kadro değişimi (personel hareketi)')
    if (!sonuc.ok) {
      console.error('[org-sema-surum]', sonuc.hata)
      return { ok: false, hata: sonuc.hata }
    }
    await organizasyonMudurSnapshotAl(supabase, sonuc.yeniId)
    return { ok: true, ad: sonuc.ad }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'org sürüm hatası'
    console.error('[org-sema-surum]', msg)
    return { ok: false, hata: msg }
  }
}
