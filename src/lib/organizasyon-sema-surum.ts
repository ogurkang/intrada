import type { SupabaseClient } from '@supabase/supabase-js'
import { performansMudurUnvaniMi } from '@/lib/performans-unvan'
import {
  mudurlukEslesmeBaz,
  mudurlukBazTamEslesir,
  organizasyonPersonelIndeksKur,
  unvanMudurEslesmeBaz,
  type KadroUnvanSatir,
} from '@/lib/organizasyon-birim'
import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { revalidatePath } from 'next/cache'

/**
 * Ağustos 2026 sonrası (işlem tarihi / kayit_zamani) müdür kadro değişiminde org şeması sürümü.
 * Yürürlük tarihi dikkate alınmaz.
 */
export const ORG_SEMA_SURUM_BASLANGIC = '2026-08-01'

const LISTE = '/tanimlar/organizasyon'

function yilPrefix(yil: number): string {
  return `Organizasyon Şeması - ${yil}/`
}

function islemTarihiGun(isoOrDate: string | null | undefined): string {
  const s = String(isoOrDate ?? '').trim()
  if (!s) return new Date().toISOString().slice(0, 10)
  return s.slice(0, 10)
}

export function unvanMudurMuKayit(u: {
  mudur_mu?: boolean | null
  unvan_adi?: string | null
} | null | undefined): boolean {
  if (!u) return false
  if (u.mudur_mu === true) return true
  return performansMudurUnvaniMi(String(u.unvan_adi ?? ''))
}

export function unvanMetniMudurMu(unvan: string | null | undefined): boolean {
  return performansMudurUnvaniMi(String(unvan ?? ''))
}

/** İşlem tarihi (kayit_zamani) Ağustos 2026 sonrası mı? */
export function orgSemaSurumIslemTarihiUygunMu(islemTarihi: string | null | undefined): boolean {
  return islemTarihiGun(islemTarihi) >= ORG_SEMA_SURUM_BASLANGIC
}

export async function personelHareketiMudurKadroDegistiMi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  opts: {
    /** kayit_zamani / işlem anı — yürürlük değil */
    islemTarihi: string | null
    oncekiKadroId: number | null
    yeniKadroId: number | null
    eskiUnvan: string | null
    yeniUnvan: string | null
  },
): Promise<boolean> {
  if (!orgSemaSurumIslemTarihiUygunMu(opts.islemTarihi)) return false

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

  if (unvanMetniMudurMu(opts.eskiUnvan) || unvanMetniMudurMu(opts.yeniUnvan)) {
    return true
  }
  return false
}

export type MudurSicilHarita = Map<string, string[]>

export function mudurHaritaKopyala(src: MudurSicilHarita): MudurSicilHarita {
  const out: MudurSicilHarita = new Map()
  for (const [k, v] of src) out.set(k, [...v])
  return out
}

/** Unvan metninden müdürlük eşleşme tabanı. */
export function mudurUnvanBaz(unvan: string | null | undefined): string {
  if (!unvanMetniMudurMu(unvan)) return ''
  return unvanMudurEslesmeBaz(unvan)
}

/**
 * Bir müdür hareketini haritaya uygular (ileri).
 * - Müdürlüğe geliyorsa sicili o baza yazar (öncekileri değiştirmez; aynı baza ekler / tekilleştirir).
 * - Müdürlükten ayrılıyorsa sicili o bazdan çıkarır.
 */
export function mudurHareketiHaritayaUygula(
  harita: MudurSicilHarita,
  opts: { sicil: string; eskiUnvan: string | null; yeniUnvan: string | null },
): void {
  const sicil = String(opts.sicil ?? '').trim()
  if (!sicil) return
  const eskiBaz = mudurUnvanBaz(opts.eskiUnvan)
  const yeniBaz = mudurUnvanBaz(opts.yeniUnvan)

  if (eskiBaz && (!yeniBaz || eskiBaz !== yeniBaz)) {
    const list = (harita.get(eskiBaz) ?? []).filter(s => s !== sicil)
    if (list.length) harita.set(eskiBaz, list)
    else harita.delete(eskiBaz)
  }
  if (yeniBaz) {
    const list = [...new Set([...(harita.get(yeniBaz) ?? []).filter(s => s !== sicil), sicil])]
      .sort((a, b) => a.localeCompare(b, 'tr'))
    harita.set(yeniBaz, list)
  }
}

/** İleri hareketin tersi (geriye dönük state için). */
export function mudurHareketiHaritadanGeriAl(
  harita: MudurSicilHarita,
  opts: { sicil: string; eskiUnvan: string | null; yeniUnvan: string | null },
): void {
  // İleri: eski→çık, yeni→gir  ⇒  geri: yeni→çık, eski→gir
  mudurHareketiHaritayaUygula(harita, {
    sicil: opts.sicil,
    eskiUnvan: opts.yeniUnvan,
    yeniUnvan: opts.eskiUnvan,
  })
}

/** Aktif (veya verilen) org şemasındaki müdür/başkan birimlerine haritadan sicil yazar. */
export async function organizasyonMudurSnapshotYaz(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  organizasyonId: number,
  mudurSicilByBaz: MudurSicilHarita,
  baskanSicilleri: string[] = [],
): Promise<void> {
  const { data: birimler } = await supabase
    .from('tanim_organizasyon_birim')
    .select('id, mudurluk_id, birim_turu, personel_sicil_no, tanim_mudurluk ( mudurluk_adi )')
    .eq('organizasyon_id', organizasyonId)

  for (const b of birimler ?? []) {
    const tur = String(b.birim_turu ?? '')
    if (tur === 'baskan_yardimcisi') continue

    let sicil: string | null = null
    if (tur === 'baskan') {
      sicil = baskanSicilleri.join(',') || null
    } else if (tur === 'mudurluk') {
      const mudAd = Array.isArray(b.tanim_mudurluk)
        ? b.tanim_mudurluk[0]?.mudurluk_adi
        : b.tanim_mudurluk?.mudurluk_adi
      const baz = mudurlukEslesmeBaz(mudAd)
      const siciller: string[] = []
      if (baz) {
        for (const [k, vals] of mudurSicilByBaz) {
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

/** Kadrodan canlı müdür haritası + başkan sicilleri. */
export async function organizasyonCanliMudurHaritasi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
): Promise<{ mudurSicilByBaz: MudurSicilHarita; baskanSicilleri: string[] }> {
  const { data: kadroRaw } = await fetchAllKadroHareketleri(
    supabase,
    'durumu, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil, asil_calisan:calisan!kadro_hareketleri_asil_fkey ( ad_soyad ), vekil_calisan:calisan!kadro_hareketleri_vekil_fkey ( ad_soyad )',
    (q: { in: (c: string, v: string[]) => unknown }) => q.in('durumu', ['Dolu', 'Vekil']),
  )
  const indeks = organizasyonPersonelIndeksKur((kadroRaw ?? []) as unknown as KadroUnvanSatir[])
  return {
    mudurSicilByBaz: mudurHaritaKopyala(indeks.mudurSicilByBaz),
    baskanSicilleri: [...indeks.baskanSicilleri],
  }
}

/** Aktif org’a canlı kadrodan snapshot (BY satırlarına dokunmaz). */
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
  const canli = await organizasyonCanliMudurHaritasi(supabase)
  await organizasyonMudurSnapshotYaz(supabase, orgId, canli.mudurSicilByBaz, canli.baskanSicilleri)
}

async function sonrakiSiraAdi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  yil = new Date().getFullYear(),
): Promise<string> {
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
  // Eski «Organizasyon Şeması - 2026» (slash yok) baseline sayılır
  const { data: eskiAd } = await supabase
    .from('tanim_organizasyon')
    .select('organizasyon_adi')
    .eq('organizasyon_adi', `Organizasyon Şeması - ${yil}`)
    .limit(1)
  if ((eskiAd ?? []).length && maxSira < 1) maxSira = 1

  return `${prefix}${maxSira + 1}`
}

/**
 * Aktif organizasyonu kopyalar; adı «Organizasyon Şeması - YYYY/sıra».
 * Eski aktif pasifleştirilir. Birim personel_sicil_no kopyalanır (snapshot).
 */
export async function organizasyonSemaSurumuKaydet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  neden: string,
): Promise<{ ok: true; yeniId: number; ad: string; eskiId: number } | { ok: false; hata: string }> {
  const { data: aktif } = await supabase
    .from('tanim_organizasyon')
    .select('id, organizasyon_adi')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!aktif?.id) return { ok: false, hata: 'Aktif organizasyon şeması yok.' }

  const yeniAd = await sonrakiSiraAdi(supabase)

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

  // Eski adı slash’sızsa /1 yap (ilk sürüm netliği)
  const yil = new Date().getFullYear()
  if (String(aktif.organizasyon_adi) === `Organizasyon Şeması - ${yil}`) {
    await supabase
      .from('tanim_organizasyon')
      .update({ organizasyon_adi: `Organizasyon Şeması - ${yil}/1` })
      .eq('id', aktif.id)
  }

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
    /* ignore */
  }

  void neden
  return { ok: true, yeniId: yeniOrg.id, ad: yeniAd, eskiId: aktif.id }
}

export async function personelHareketiOncesiOrgSemaDondur(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  opts: {
    islemTarihi: string | null
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

export async function personelHareketiSonrasiOrgSemaSurumu(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  opts: {
    islemTarihi: string | null
    oncekiKadroId: number | null
    yeniKadroId: number | null
    eskiUnvan: string | null
    yeniUnvan: string | null
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

export type OrgSemaGeriyeDonukHareket = {
  id: number
  sicil_no: string
  eski_unvan: string | null
  yeni_unvan: string | null
  kayit_zamani: string
}

/**
 * Ağustos sonrası müdür personel hareketlerinden geriye dönük sürümler üretir.
 * Mevcut şema /1 olur; her hareket için yeni /sıra (son aktif = güncel).
 */
export async function organizasyonSemaGeriyeDonukOlustur(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
): Promise<{ ok: true; adlar: string[] } | { ok: false; hata: string }> {
  const { data: phRaw, error: phErr } = await supabase
    .from('personel_hareketleri')
    .select('id, sicil_no, eski_unvan, yeni_unvan, kayit_zamani')
    .gte('kayit_zamani', `${ORG_SEMA_SURUM_BASLANGIC}T00:00:00`)
    .order('kayit_zamani', { ascending: true })

  if (phErr) return { ok: false, hata: phErr.message }

  const hareketler: OrgSemaGeriyeDonukHareket[] = ((phRaw ?? []) as OrgSemaGeriyeDonukHareket[])
    .filter(h => unvanMetniMudurMu(h.eski_unvan) || unvanMetniMudurMu(h.yeni_unvan))

  if (hareketler.length === 0) {
    return { ok: false, hata: 'Ağustos sonrası müdür personel hareketi bulunamadı.' }
  }

  // Zaten /2+ varsa tekrar çalıştırma
  const { data: mevcut } = await supabase
    .from('tanim_organizasyon')
    .select('organizasyon_adi')
    .ilike('organizasyon_adi', 'Organizasyon Şeması - 2026/%')
  const maxMevcut = (mevcut ?? []).reduce((m: number, r: { organizasyon_adi: string }) => {
    const x = String(r.organizasyon_adi).match(/\/(\d+)$/)
    return x ? Math.max(m, Number(x[1])) : m
  }, 0)
  if (maxMevcut >= 2) {
    return { ok: false, hata: `Zaten sürümler var (max /${maxMevcut}). Tekrar oluşturmadı.` }
  }

  const canli = await organizasyonCanliMudurHaritasi(supabase)
  let harita = mudurHaritaKopyala(canli.mudurSicilByBaz)

  // Güncelden geriye: tüm hareketleri ters uygula → ilk hareket öncesi durum
  for (let i = hareketler.length - 1; i >= 0; i--) {
    const h = hareketler[i]
    mudurHareketiHaritadanGeriAl(harita, {
      sicil: h.sicil_no,
      eskiUnvan: h.eski_unvan,
      yeniUnvan: h.yeni_unvan,
    })
  }

  const { data: aktif } = await supabase
    .from('tanim_organizasyon')
    .select('id, organizasyon_adi')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!aktif?.id) return { ok: false, hata: 'Aktif organizasyon yok.' }

  // /1 = ilk hareket öncesi
  await supabase
    .from('tanim_organizasyon')
    .update({ organizasyon_adi: 'Organizasyon Şeması - 2026/1', aktif: false })
    .eq('id', aktif.id)
  await organizasyonMudurSnapshotYaz(supabase, aktif.id, harita, canli.baskanSicilleri)

  const adlar: string[] = ['Organizasyon Şeması - 2026/1']
  let kaynakOrgId = aktif.id as number

  // Her hareket sonrası yeni sürüm
  for (let i = 0; i < hareketler.length; i++) {
    const h = hareketler[i]
    mudurHareketiHaritayaUygula(harita, {
      sicil: h.sicil_no,
      eskiUnvan: h.eski_unvan,
      yeniUnvan: h.yeni_unvan,
    })

    const sira = i + 2
    const yeniAd = `Organizasyon Şeması - 2026/${sira}`
    const sonMu = i === hareketler.length - 1

    const { data: birimler, error: birimHata } = await supabase
      .from('tanim_organizasyon_birim')
      .select('id, mudurluk_id, birim_turu, personel_sicil_no, ust_birim_id, sira_no')
      .eq('organizasyon_id', kaynakOrgId)
      .order('sira_no', { ascending: true })
    if (birimHata) return { ok: false, hata: birimHata.message }

    const { data: yeniOrg, error: orgHata } = await supabase
      .from('tanim_organizasyon')
      .insert({ organizasyon_adi: yeniAd, aktif: sonMu })
      .select('id')
      .single()
    if (orgHata || !yeniOrg?.id) {
      return { ok: false, hata: orgHata?.message ?? 'Org oluşturulamadı' }
    }

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
            personel_sicil_no: null,
            ust_birim_id: ustYeni,
            sira_no: b.sira_no,
          })
          .select('id')
          .single()
        if (error || !yeniBirim?.id) {
          return { ok: false, hata: error?.message ?? 'Birim kopyalanamadı' }
        }
        idMap.set(b.id, yeniBirim.id)
      }
      kalan.length = 0
      kalan.push(...buTur.filter(b => !idMap.has(b.id)))
    }

    await organizasyonMudurSnapshotYaz(supabase, yeniOrg.id, harita, canli.baskanSicilleri)
    adlar.push(yeniAd)
    kaynakOrgId = yeniOrg.id
  }

  try {
    revalidatePath(LISTE)
  } catch {
    /* ignore */
  }

  return { ok: true, adlar }
}
