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
} from '@/lib/kazanc-teknisyen-ek-gosterge'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'
import type { Database } from '@/types/database'
import type { KazancPuan } from '@/lib/terfi-ettir-hesap'
import {
  kazancPuanEsit,
  vekilMudurFarkDenemeMi,
  vekilMudurFarkHesapla,
  vekilMudurUnvaniMi,
} from '@/lib/kazanc-vekil-mudur-fark'

type Sb = SupabaseClient<Database>

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

/**
 * Deneme sicilinde asil terfiyi kendi unvan tanımına, vekil müdür terfisini
 * asil müdür − kendi farkına çeker. Diğer sicillere dokunmaz.
 */
export async function uygulaVekilMudurFarkDeneme(
  supabase: Sb,
  sicilNo: string,
): Promise<{ uygulandi: boolean; hata?: string }> {
  const sicil = String(sicilNo ?? '').trim()
  if (!vekilMudurFarkDenemeMi(sicil)) return { uygulandi: false }

  const [{ data: kadrolar, error: kErr }, { data: terfiler, error: tErr }, { data: ogrenimRows, error: oErr }] =
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
    ])
  if (kErr) return { uygulandi: false, hata: kErr.message }
  if (tErr) return { uygulandi: false, hata: tErr.message }
  if (oErr) return { uygulandi: false, hata: oErr.message }

  const asilKadro = (kadrolar ?? []).find(k => (k.asil ?? '').trim() === sicil && !k.ayrilis_tarihi)
  const vekilKadro = (kadrolar ?? []).find(k => (k.vekil ?? '').trim() === sicil && !k.ayrilis_tarihi)
  if (!asilKadro || !vekilKadro) return { uygulandi: false }

  const vekilUnvan = String(vekilKadro.kadro_unvani ?? vekilKadro.gorev_unvani ?? '').trim()
  if (!vekilMudurUnvaniMi(vekilUnvan)) return { uygulandi: false }

  const asilTerfi =
    (terfiler ?? []).find(t => t.kadro_id === asilKadro.id) ??
    (terfiler ?? []).find(t => String(t.rol ?? '').toLowerCase() === 'asil')
  const vekilTerfi =
    (terfiler ?? []).find(t => t.kadro_id === vekilKadro.id) ??
    (terfiler ?? []).find(t => String(t.rol ?? '').toLowerCase() === 'vekil')
  if (!asilTerfi || !vekilTerfi) return { uygulandi: false }

  const [{ data: unvanAdRaw }, { data: kazancRaw }, { data: tanimOg }] = await Promise.all([
    supabase.from('tanim_unvan').select('id, unvan_adi, sinif_adi, destek_yardimci_birim').eq('aktif', true),
    supabase.from('tanim_kazanc_bilgisi').select('*'),
    supabase.from('tanim_ogrenim').select('id, isim'),
  ])

  const tanimOgList = sortTanimOgrenimByIsim((tanimOg ?? []).map(o => ({ id: o.id, isim: o.isim })))
  const baglam = teknisyenEkGostergeBaglamKur({
    unvanlar: (unvanAdRaw ?? []).map(u => ({ id: u.id, unvan_adi: u.unvan_adi })),
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
    ozelKalemUnvanIdleri((unvanAdRaw ?? []).map(u => ({ id: u.id, unvan_adi: u.unvan_adi }))),
  )

  const kazancOg = kazancIcinOgrenimSec(ogrenimRows ?? [])
  const ogrenimId = eslestirOgrenimId(kazancOg?.ogrenim_turu, tanimOgList)
  const kariyerOg = mudurKariyerOgrenimKaynagi(
    (ogrenimRows ?? []).find(r => r.varsayilan),
    kazancOg,
  )
  const teknisyenKariyer = teknisyenKariyerUnvanFromOgrenimRows(ogrenimRows ?? [])
  const khaDerece = asilTerfi.kha_derece
  const asilUnvanId = asilKadro.kadro_unvan_id ?? asilKadro.gorev_unvan_id
  const vekilUnvanId = vekilKadro.kadro_unvan_id ?? vekilKadro.gorev_unvan_id
  const asilUnvanAdi = String(asilKadro.kadro_unvani ?? asilKadro.gorev_unvani ?? '').trim()
  const asilUnvan = (unvanAdRaw ?? []).find(u => u.id === asilUnvanId)
  const vekilUnvanKayit = (unvanAdRaw ?? []).find(u => u.id === vekilUnvanId)

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
  })
  if (!sonuc) return { uygulandi: false, hata: 'Kazanç tanımı hesaplanamadı.' }

  let yazildi = false
  if (!kazancPuanEsit(terfiPuan(asilTerfi), sonuc.kendi)) {
    const { error } = await supabase
      .from('terfi_hareketleri')
      .update(kazancPayload(sonuc.kendi))
      .eq('id', asilTerfi.id)
    if (error) return { uygulandi: false, hata: error.message }
    yazildi = true
  }
  if (!kazancPuanEsit(terfiPuan(vekilTerfi), sonuc.fark)) {
    const { error } = await supabase
      .from('terfi_hareketleri')
      .update(kazancPayload(sonuc.fark))
      .eq('id', vekilTerfi.id)
    if (error) return { uygulandi: false, hata: error.message }
    yazildi = true
  }
  return { uygulandi: yazildi }
}
