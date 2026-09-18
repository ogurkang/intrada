import type { SupabaseClient } from '@supabase/supabase-js'
import { kazancLookupOzelKalemIle, ozelKalemUnvanIdleri } from '@/lib/kazanc-ozel-kalem'
import {
  eslestirOgrenimId,
  kazancIcinOgrenimSec,
  kazancLookupYedekOgrenimIds,
} from '@/lib/kazanc-ogrenim-sec'
import { mudurKariyerOgrenimKaynagi } from '@/lib/kazanc-mudur-th-overlay'
import {
  ogrenimYuksekMi,
  teknisyenEkGostergeBaglamKur,
  teknisyenKariyerUnvanFromOgrenimRows,
  type TeknisyenEkGostergeBaglam,
  type KazancSatirLookup,
} from '@/lib/kazanc-teknisyen-ek-gosterge'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'
import type { Database } from '@/types/database'
import type { KazancPuan } from '@/lib/terfi-ettir-hesap'
import {
  kazancPuanEsit,
  vekilMudurFarkHesapla,
  vekilMudurUnvaniMi,
} from '@/lib/kazanc-vekil-mudur-fark'

type Sb = SupabaseClient<Database>

type KadroSatir = {
  id: number
  asil: string | null
  vekil: string | null
  kadro_derecesi: string | null
  kadro_unvan_id: number | null
  kadro_unvani: string | null
  gorev_unvan_id: number | null
  gorev_unvani: string | null
  ayrilis_tarihi: string | null
}

type UnvanSatir = {
  id: number
  unvan_adi: string
  sinif_adi: string | null
  destek_yardimci_birim: boolean | null
}

export type VekilMudurFarkBaglam = {
  lookup: KazancSatirLookup
  tanimOgList: { id: number; isim: string }[]
  unvanlar: UnvanSatir[]
  baglam: TeknisyenEkGostergeBaglam
}

function kadroAktifMi(ayrilis: string | null | undefined, bugun = new Date().toISOString().slice(0, 10)): boolean {
  const t = String(ayrilis ?? '').trim().slice(0, 10)
  if (!t) return true
  return t > bugun
}

function kadroUnvanAdi(k: KadroSatir): string {
  return String(k.kadro_unvani ?? k.gorev_unvani ?? '').trim()
}

function kazancPayload(p: KazancPuan) {
  return {
    ek_gosterge: p.ek_gosterge,
    ek_odeme: p.ek_odeme,
    oht: p.oht,
    yan_odeme: p.yan_odeme,
    sds_orani: p.sds_orani,
  }
}

function terfiPuan(row: {
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  yan_odeme_eksi5: string | null
  sds_orani: string | null
}): KazancPuan {
  return {
    ek_gosterge: row.ek_gosterge,
    ek_odeme: row.ek_odeme,
    oht: row.oht,
    yan_odeme: row.yan_odeme,
    yan_odeme_eksi5: row.yan_odeme_eksi5,
    sds_orani: row.sds_orani,
  }
}

export async function yukleVekilMudurFarkBaglam(supabase: Sb): Promise<VekilMudurFarkBaglam> {
  const [{ data: unvanAdRaw }, { data: kazancRaw }, { data: tanimOg }] = await Promise.all([
    supabase.from('tanim_unvan').select('id, unvan_adi, sinif_adi, destek_yardimci_birim').eq('aktif', true),
    supabase.from('tanim_kazanc_bilgisi').select('*'),
    supabase.from('tanim_ogrenim').select('id, isim'),
  ])
  const unvanlar = (unvanAdRaw ?? []) as UnvanSatir[]
  const tanimOgList = sortTanimOgrenimByIsim((tanimOg ?? []).map(o => ({ id: o.id, isim: o.isim })))
  const baglam = teknisyenEkGostergeBaglamKur({
    unvanlar: unvanlar.map(u => ({ id: u.id, unvan_adi: u.unvan_adi })),
    tanimOgList,
  })
  const kazancMap = new Map<string, KazancPuan>()
  for (const row of kazancRaw ?? []) {
    kazancMap.set(`${row.unvan_id}-${row.ogrenim_id}-${row.derece}`, {
      ek_gosterge: row.ek_gosterge,
      ek_odeme: row.ek_odeme,
      oht: row.oht,
      yan_odeme: row.yan_odeme,
      yan_odeme_eksi5: row.yan_odeme_eksi5,
      yan_odeme_bilgisayarsiz: row.yan_odeme_bilgisayarsiz,
      sds_orani: row.sds_orani,
    })
  }
  const ham = (unvanId: number, ogrenimId: number, derece: number) =>
    kazancMap.get(`${unvanId}-${ogrenimId}-${derece}`) ?? null
  const lisansGrupIds = baglam.lisansOnlisansOgrenimIds
  const lookupYedek = (unvanId: number, ogrenimId: number, derece: number) => {
    const row = ham(unvanId, ogrenimId, derece)
    if (row) return row
    for (const ogId of kazancLookupYedekOgrenimIds(ogrenimId, tanimOgList, lisansGrupIds)) {
      if (ogId === ogrenimId) continue
      const alt = ham(unvanId, ogId, derece)
      if (alt) return alt
    }
    return null
  }
  const lookup = kazancLookupOzelKalemIle(
    lookupYedek,
    ozelKalemUnvanIdleri(unvanlar.map(u => ({ id: u.id, unvan_adi: u.unvan_adi }))),
  )
  return { lookup, tanimOgList, unvanlar, baglam }
}

async function vekilMudurSicillerBul(supabase: Sb): Promise<string[]> {
  const { data, error } = await supabase
    .from('kadro_hareketleri')
    .select('vekil, kadro_unvani, gorev_unvani, ayrilis_tarihi')
    .not('vekil', 'is', null)
  if (error) return []
  const siciller = new Set<string>()
  for (const k of data ?? []) {
    const sicil = String(k.vekil ?? '').trim()
    if (!sicil) continue
    if (!kadroAktifMi(k.ayrilis_tarihi)) continue
    const unvan = String(k.kadro_unvani ?? k.gorev_unvani ?? '').trim()
    if (!vekilMudurUnvaniMi(unvan)) continue
    siciller.add(sicil)
  }
  return [...siciller]
}

/**
 * Asil terfiyi kendi unvan tanımına, vekil müdür terfilerini asil müdür − kendi farkına çeker.
 */
export async function uygulaVekilMudurFarkSicil(
  supabase: Sb,
  sicilNo: string,
  hazirBaglam?: VekilMudurFarkBaglam,
): Promise<{ uygulandi: boolean; hata?: string }> {
  const sicil = String(sicilNo ?? '').trim()
  if (!sicil) return { uygulandi: false }

  const [{ data: kadrolar, error: kErr }, { data: terfiler, error: tErr }, { data: ogrenimRows, error: oErr }, { data: calisan }] =
    await Promise.all([
      supabase
        .from('kadro_hareketleri')
        .select(
          'id, asil, vekil, kadro_derecesi, kadro_unvan_id, kadro_unvani, gorev_unvan_id, gorev_unvani, ayrilis_tarihi',
        )
        .or(`asil.eq.${sicil},vekil.eq.${sicil}`),
      supabase.from('terfi_hareketleri').select('*').eq('sicil_no', sicil),
      supabase
        .from('calisan_ogrenim')
        .select('ogrenim_turu, varsayilan, aktif, kayit_zamani, kadrosu_ile_ilgili, teknik_ogrenim, meslegi, bolum')
        .eq('sicil_no', sicil),
      supabase
        .from('calisan')
        .select('bilgisayar_kullaniyor, th_hizmet_baslangic')
        .eq('sicil_no', sicil)
        .maybeSingle(),
    ])
  if (kErr) return { uygulandi: false, hata: kErr.message }
  if (tErr) return { uygulandi: false, hata: tErr.message }
  if (oErr) return { uygulandi: false, hata: oErr.message }

  const asilKadro = (kadrolar ?? []).find(k => (k.asil ?? '').trim() === sicil && kadroAktifMi(k.ayrilis_tarihi))
  const vekilKadrolar = (kadrolar ?? []).filter(
    k => (k.vekil ?? '').trim() === sicil && kadroAktifMi(k.ayrilis_tarihi) && vekilMudurUnvaniMi(kadroUnvanAdi(k)),
  )
  if (!asilKadro || vekilKadrolar.length === 0) return { uygulandi: false }

  const asilTerfi =
    (terfiler ?? []).find(t => t.kadro_id === asilKadro.id) ??
    (terfiler ?? []).find(t => String(t.rol ?? '').toLowerCase() === 'asil')
  if (!asilTerfi) return { uygulandi: false }

  const bag = hazirBaglam ?? (await yukleVekilMudurFarkBaglam(supabase))
  const { lookup, tanimOgList, unvanlar, baglam } = bag

  const kazancOg = kazancIcinOgrenimSec(ogrenimRows ?? [])
  const ogrenimId = eslestirOgrenimId(kazancOg?.ogrenim_turu, tanimOgList)
  const kariyerOg = mudurKariyerOgrenimKaynagi(
    (ogrenimRows ?? []).find(r => r.varsayilan),
    kazancOg,
  )
  const teknisyenKariyer = teknisyenKariyerUnvanFromOgrenimRows(ogrenimRows ?? [])
  const khaDerece = asilTerfi.kha_derece
  const asilUnvanId = asilKadro.kadro_unvan_id ?? asilKadro.gorev_unvan_id
  const asilUnvanAdi = kadroUnvanAdi(asilKadro)
  const asilUnvan = unvanlar.find(u => u.id === asilUnvanId)

  const ortak = {
    ogrenimId,
    khaDerece: Number.parseInt(String(khaDerece ?? '').trim(), 10),
    yuksekOgrenimVar: (ogrenimRows ?? []).some(r => ogrenimYuksekMi(r.ogrenim_turu)),
    kadrosuIleIlgili: teknisyenKariyer != null,
    teknisyenKariyer,
    teknikOgrenim: (ogrenimRows ?? []).some(r => r.varsayilan && r.teknik_ogrenim),
    meslegi: kariyerOg.meslegi,
    bolum: kariyerOg.bolum,
    baglam,
  }

  let yazildi = false
  let kendiPuan: KazancPuan | null = null

  for (const vekilKadro of vekilKadrolar) {
    const vekilUnvan = kadroUnvanAdi(vekilKadro)
    const vekilTerfi =
      (terfiler ?? []).find(t => t.kadro_id === vekilKadro.id) ??
      (terfiler ?? []).find(t => String(t.rol ?? '').toLowerCase() === 'vekil')
    if (!vekilTerfi) continue

    const vekilUnvanId = vekilKadro.kadro_unvan_id ?? vekilKadro.gorev_unvan_id
    const vekilUnvanKayit = unvanlar.find(u => u.id === vekilUnvanId)
    const sonuc = vekilMudurFarkHesapla({
      lookup,
      khaDerece,
      kendiOpts: {
        ...ortak,
        unvanId: asilUnvanId,
        unvanAdi: asilUnvanAdi,
        kadroDerecesi: asilKadro.kadro_derecesi,
        asilMi: true,
        destekYardimciBirim: asilUnvan?.destek_yardimci_birim === true,
      },
      mudurOpts: {
        ...ortak,
        unvanId: vekilUnvanId,
        unvanAdi: vekilUnvan,
        kadroDerecesi: vekilKadro.kadro_derecesi,
        asilMi: true,
        destekYardimciBirim: vekilUnvanKayit?.destek_yardimci_birim === true,
      },
      yanCtx: {
        kidemYili: asilTerfi.kidem_yili,
        thHizmetBaslangic: calisan?.th_hizmet_baslangic ?? null,
        bilgisayarKullaniyor: calisan?.bilgisayar_kullaniyor ?? null,
        kendiSinif: asilUnvan?.sinif_adi ?? null,
        mudurSinif: vekilUnvanKayit?.sinif_adi ?? null,
      },
    })
    if (!sonuc) continue
    kendiPuan = sonuc.kendi

    if (!kazancPuanEsit(terfiPuan(vekilTerfi), sonuc.fark)) {
      const { error } = await supabase
        .from('terfi_hareketleri')
        .update(kazancPayload(sonuc.fark))
        .eq('id', vekilTerfi.id)
      if (error) return { uygulandi: false, hata: error.message }
      yazildi = true
    }
  }

  if (kendiPuan && !kazancPuanEsit(terfiPuan(asilTerfi), kendiPuan)) {
    const { error } = await supabase
      .from('terfi_hareketleri')
      .update(kazancPayload(kendiPuan))
      .eq('id', asilTerfi.id)
    if (error) return { uygulandi: false, hata: error.message }
    yazildi = true
  }

  return { uygulandi: yazildi }
}

/** Eski ad — tek sicil uygulaması. */
export const uygulaVekilMudurFarkDeneme = uygulaVekilMudurFarkSicil

export async function uygulaVekilMudurFarkToplu(
  supabase: Sb,
): Promise<{ uygulandi: boolean; adet: number; hata?: string }> {
  const siciller = await vekilMudurSicillerBul(supabase)
  if (!siciller.length) return { uygulandi: false, adet: 0 }
  const baglam = await yukleVekilMudurFarkBaglam(supabase)
  let adet = 0
  for (const sicil of siciller) {
    const r = await uygulaVekilMudurFarkSicil(supabase, sicil, baglam)
    if (r.hata) return { uygulandi: adet > 0, adet, hata: `${sicil}: ${r.hata}` }
    if (r.uygulandi) adet++
  }
  return { uygulandi: adet > 0, adet }
}
