import { fetchAllCalisan, fetchAllCalisanOgrenim } from '@/lib/supabase-sayfala'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import { anaKadroSec } from '@/lib/kadro-ana-sicil'
import type { KazancPuan, TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'
import {
  ogrenimYuksekMi,
  teknisyenEkGostergeBaglamKur,
  teknisyenKariyerUnvanFromOgrenimRows,
  type TeknisyenEkGostergeBaglam,
  type TeknisyenKariyerUnvan,
} from '@/lib/kazanc-teknisyen-ek-gosterge'
import { eslestirOgrenimId, kazancIcinOgrenimSec, kazancLookupYedekOgrenimIds } from '@/lib/kazanc-ogrenim-sec'
import { kazancLookupOzelKalemIle, ozelKalemUnvanIdleri } from '@/lib/kazanc-ozel-kalem'
import { mudurKariyerOgrenimKaynagi } from '@/lib/kazanc-mudur-th-overlay'
import { personelAktifMi, sonAyrilisHaritasiOlustur } from '@/lib/personel-ayrilis'
import { yuruttuguUnvanKolonuYokMu } from '@/lib/kazanc-yuruttugu-unvan'
import { terfiSatirAnahtari } from '@/lib/terfi-ettir-hesap'
import { vekilMudurUnvaniMi } from '@/lib/kazanc-vekil-mudur-fark'

type KadroEslestirmeSatir = Pick<
  Tables<'kadro_hareketleri'>,
  | 'id'
  | 'asil'
  | 'vekil'
  | 'gorev_unvan_id'
  | 'kadro_unvan_id'
  | 'gorev_unvani'
  | 'kadro_unvani'
  | 'kadro_derecesi'
  | 'durumu'
  | 'ayrilis_tarihi'
>

function sicilEsit(a: string | null | undefined, b: string): boolean {
  return (a ?? '').trim() === b.trim()
}

function kadroAktifMi(ayrilis: string | null | undefined, bugun = new Date().toISOString().slice(0, 10)): boolean {
  const t = String(ayrilis ?? '').trim().slice(0, 10)
  if (!t) return true
  return t > bugun
}

async function yukleKadroSatirlariMemurIcin(
  supabase: SupabaseClient<Database>,
  memurSiciller: string[],
): Promise<KadroEslestirmeSatir[]> {
  if (!memurSiciller.length) return []
  const CHUNK = 80
  const rows: KadroEslestirmeSatir[] = []
  for (let i = 0; i < memurSiciller.length; i += CHUNK) {
    const chunk = memurSiciller.slice(i, i + CHUNK)
    const { data } = await supabase
      .from('kadro_hareketleri')
      .select(
        'id, asil, vekil, gorev_unvan_id, kadro_unvan_id, gorev_unvani, kadro_unvani, kadro_derecesi, durumu, ayrilis_tarihi',
      )
      .or(chunk.map(s => `asil.eq.${s},vekil.eq.${s}`).join(','))
    rows.push(...((data ?? []) as KadroEslestirmeSatir[]))
  }
  return rows
}

/** Personel detay / Terfi Bilgileri ile uyumlu ana kadro seçimi. */
function secilenKadroSatir(sicil: string, khRows: KadroEslestirmeSatir[]): KadroEslestirmeSatir | null {
  const s = sicil.trim()
  const ilgili = khRows.filter(r => sicilEsit(r.asil, s) || sicilEsit(r.vekil, s))
  if (!ilgili.length) return null

  const aktif = ilgili.filter(r => kadroAktifMi(r.ayrilis_tarihi))
  const ana = anaKadroSec(aktif as Tables<'kadro_hareketleri'>[], s)
  if (ana) return ana as KadroEslestirmeSatir

  const fallbackAktif = [...aktif].sort((a, b) => b.id - a.id)[0]
  if (fallbackAktif) return fallbackAktif

  return [...ilgili].sort((a, b) => b.id - a.id)[0] ?? null
}

function khaDereceDoluMu(kha: string | null | undefined): boolean {
  return Number.isFinite(Number.parseInt(String(kha ?? '').trim(), 10))
}

/**
 * Sicil başına terfi kaydı seçimi.
 * En yeni kaydı körlemesine almak, kapsam dışı veya KHA’sı boş bir kopyayı
 * asıl/vekil kadro kayıtlarının önüne geçirebiliyor (ör. sicil 246).
 * Öncelik: kapsam içi → tercih edilen kadroya bağlı → KHA derecesi dolu → kayıt zamanı.
 */
function terfiKaydiSec(
  kayitlar: Tables<'terfi_hareketleri'>[],
  tercihKadroId?: number | null,
): Tables<'terfi_hareketleri'> | null {
  if (!kayitlar.length) return null
  const kapsamIci = kayitlar.filter(k => !k.kapsam_disi)
  const havuz = kapsamIci.length ? kapsamIci : kayitlar

  const kadroId = tercihKadroId != null && tercihKadroId > 0 ? tercihKadroId : null
  const kadroyaBagli = kadroId != null ? havuz.filter(k => k.kadro_id === kadroId) : []
  const aday = kadroyaBagli.length ? kadroyaBagli : havuz

  const khaDolu = aday.filter(k => khaDereceDoluMu(k.kha_derece))
  const secim = khaDolu.length ? khaDolu : aday
  return [...secim].sort((a, b) => b.kayit_zamani.localeCompare(a.kayit_zamani))[0] ?? null
}

/**
 * Terfi Ettir önizlemesi için memur kaynakları + kazanç lookup haritası.
 */
export async function yukleTerfiEttirKaynakVeKazanc(
  supabase: SupabaseClient<Database>,
): Promise<{
  kaynaklar: TerfiKaynak[]
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null
  kazancEntries: Array<{ key: string; puan: KazancPuan }>
  tanimOgList: { id: number; isim: string }[]
  teknisyenEkGosterge: TeknisyenEkGostergeBaglam
  memurPersoneller: { sicil_no: string; ad_soyad: string; alt?: string }[]
}> {
  type CalisanYurutSatir = {
    sicil_no: string
    ad_soyad: string | null
    bilgisayar_kullaniyor: boolean | null
    th_hizmet_baslangic: string | null
    yuruttugu_unvan_id?: number | null
  }
  const calisanSelectYurut =
    'sicil_no, ad_soyad, bilgisayar_kullaniyor, th_hizmet_baslangic, yuruttugu_unvan_id'
  const calisanSelectTemel = 'sicil_no, ad_soyad, bilgisayar_kullaniyor, th_hizmet_baslangic'
  const [{ data: kayitlar }, calisanlarIlk, { data: kadroOzet }, { data: phRaw }, { data: tanimOg }] =
    await Promise.all([
      supabase.from('terfi_hareketleri').select('*').order('sicil_no'),
      fetchAllCalisan<CalisanYurutSatir>(supabase, calisanSelectYurut),
      supabase.from('personel_kadro_ozet').select('sicil_no, ad_soyad, gorev_unvani, statu').order('sicil_no'),
      supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi, ayrilis_nedeni').order('yururluk_tarihi', { ascending: false }),
      supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true),
    ])
  const calisanlarSonuc = yuruttuguUnvanKolonuYokMu(calisanlarIlk.error)
    ? await fetchAllCalisan<CalisanYurutSatir>(supabase, calisanSelectTemel)
    : calisanlarIlk
  const calisanlar = calisanlarSonuc.data

  const sonAyrilisHaritasi = sonAyrilisHaritasiOlustur(phRaw ?? [])
  const aktifSiciller = new Set<string>()
  ;(calisanlar ?? []).forEach((c) => {
    if (personelAktifMi(sonAyrilisHaritasi.get(c.sicil_no))) aktifSiciller.add(c.sicil_no)
  })

  const kadroMap = new Map((kadroOzet ?? []).map((k) => [k.sicil_no, k]))
  // Ad-soyad için tek güncel kaynak `calisan` tablosudur. Terfi hareketindeki
  // tarihsel kopya, personel kartında yapılan ad değişikliğini gölgelememeli.
  const calisanAdBySicil = new Map(
    (calisanlar ?? []).map((c) => [c.sicil_no, c.ad_soyad?.trim() || c.sicil_no]),
  )
  const yetkinlikBySicil = new Map<string, boolean | null>()
  const thHizmetBySicil = new Map<string, string | null>()
  const yuruttuguUnvanIdBySicil = new Map<string, number | null>()
  for (const c of calisanlar ?? []) {
    yetkinlikBySicil.set(c.sicil_no, c.bilgisayar_kullaniyor ?? null)
    thHizmetBySicil.set(c.sicil_no, c.th_hizmet_baslangic ?? null)
    yuruttuguUnvanIdBySicil.set(c.sicil_no, c.yuruttugu_unvan_id ?? null)
  }
  const terfiBySicil = new Map<string, Tables<'terfi_hareketleri'>[]>()
  for (const k of kayitlar ?? []) {
    const list = terfiBySicil.get(k.sicil_no)
    if (list) list.push(k)
    else terfiBySicil.set(k.sicil_no, [k])
  }
  const terfiMap: Record<string, Tables<'terfi_hareketleri'>> = {}
  for (const [sicil, list] of terfiBySicil) {
    const sec = terfiKaydiSec(list)
    if (sec) terfiMap[sicil] = sec
  }

  const memurSiciller = [...aktifSiciller].filter((sicil) => {
    const row = kadroMap.get(sicil) as { statu?: string } | undefined
    return row?.statu === 'Memur'
  })

  const ogrenimTuruBySicil = new Map<string, string>()
  const kazancOgrenimTuruBySicil = new Map<string, string>()
  const ogrenimMeslekBySicil = new Map<string, string | null>()
  const ogrenimBolumBySicil = new Map<string, string | null>()
  const yuksekOgrenimBySicil = new Map<string, boolean>()
  const kadrosuIleIlgiliBySicil = new Map<string, boolean>()
  const teknisyenKariyerBySicil = new Map<string, TeknisyenKariyerUnvan>()
  const teknikOgrenimBySicil = new Map<string, boolean>()
  if (memurSiciller.length > 0) {
    const ogRes: Array<{
      sicil_no: string
      ogrenim_turu: string | null
      kadrosu_ile_ilgili: boolean | null
      teknik_ogrenim: boolean | null
      varsayilan: boolean | null
      kayit_zamani: string | null
      meslegi: string | null
      bolum: string | null
      aktif: boolean | null
    }> = []
    const OG_CHUNK = 80
    for (let i = 0; i < memurSiciller.length; i += OG_CHUNK) {
      const chunk = memurSiciller.slice(i, i + OG_CHUNK)
      const { data } = await fetchAllCalisanOgrenim<(typeof ogRes)[number]>(
        supabase,
        'sicil_no, ogrenim_turu, kadrosu_ile_ilgili, teknik_ogrenim, varsayilan, kayit_zamani, meslegi, bolum, aktif',
        q => q.in('sicil_no', chunk),
      )
      ogRes.push(...(data ?? []))
    }
    const ogBySicil = new Map<string, typeof ogRes>()
    for (const o of ogRes) {
      const list = ogBySicil.get(o.sicil_no)
      if (list) list.push(o)
      else ogBySicil.set(o.sicil_no, [o])
      if (ogrenimYuksekMi(o.ogrenim_turu)) {
        yuksekOgrenimBySicil.set(o.sicil_no, true)
      }
      if (o.varsayilan && o.teknik_ogrenim) teknikOgrenimBySicil.set(o.sicil_no, true)
    }
    for (const [sicil, rows] of ogBySicil) {
      const kariyer = teknisyenKariyerUnvanFromOgrenimRows(rows)
      if (kariyer) {
        teknisyenKariyerBySicil.set(sicil, kariyer)
        kadrosuIleIlgiliBySicil.set(sicil, true)
      }
      const varsayilan = rows.find(r => r.varsayilan)
      const gosterim = (varsayilan?.ogrenim_turu ?? kazancIcinOgrenimSec(rows)?.ogrenim_turu ?? '').trim()
      if (gosterim) ogrenimTuruBySicil.set(sicil, gosterim)
      const kazancOg = kazancIcinOgrenimSec(rows)
      if (kazancOg) {
        const kt = (kazancOg.ogrenim_turu ?? '').trim()
        if (kt) kazancOgrenimTuruBySicil.set(sicil, kt)
      }
      const kariyerOg = mudurKariyerOgrenimKaynagi(varsayilan, kazancOg)
      ogrenimMeslekBySicil.set(sicil, kariyerOg.meslegi)
      ogrenimBolumBySicil.set(sicil, kariyerOg.bolum)
    }
  }

  const khRows = await yukleKadroSatirlariMemurIcin(supabase, memurSiciller)
  const unvanIdBySicil = new Map<string, number>()
  const kadroUnvaniBySicil = new Map<string, string | null>()
  const kadroDerecesiBySicil = new Map<string, string | null>()
  const asilMiBySicil = new Map<string, boolean>()
  for (const sicil of memurSiciller) {
    const r = secilenKadroSatir(sicil, khRows)
    if (!r) continue
    kadroDerecesiBySicil.set(sicil, r.kadro_derecesi ?? null)
    kadroUnvaniBySicil.set(sicil, r.kadro_unvani ?? null)
    asilMiBySicil.set(sicil, sicilEsit(r.asil, sicil))
    // Kazanç / sapma kadro ünvanına bakılır. Vekalette gorev_unvan_id müdür kadrosuna
    // işaret eder; onu öne almak sicil 246 gibi asıl mühendisleri yanlış tanıma götürür.
    const uid = r.kadro_unvan_id ?? r.gorev_unvan_id
    if (uid != null) unvanIdBySicil.set(sicil, uid)
    const sec = terfiKaydiSec(terfiBySicil.get(sicil) ?? [], r.id)
    if (sec) terfiMap[sicil] = sec
  }

  const sinifByUnvanId = new Map<number, string | null>()
  const unvanAdiById = new Map<number, string>()
  const destekByUnvanId = new Map<number, boolean>()
  const { data: unvanAdRaw } = await supabase
    .from('tanim_unvan')
    .select('id, unvan_adi, sinif_adi, destek_yardimci_birim')
    .eq('aktif', true)
  for (const u of unvanAdRaw ?? []) {
    unvanAdiById.set(u.id, u.unvan_adi)
    destekByUnvanId.set(u.id, u.destek_yardimci_birim === true)
    sinifByUnvanId.set(u.id, u.sinif_adi ?? null)
  }

  const { data: kazancRaw } = await supabase.from('tanim_kazanc_bilgisi').select('*')
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

  const tanimOgList = sortTanimOgrenimByIsim((tanimOg ?? []).map((o) => ({ id: o.id, isim: o.isim })))
  const kaynaklar: TerfiKaynak[] = []

  for (const sicil_no of memurSiciller.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))) {
    const t = terfiMap[sicil_no]
    if (!t) continue
    const k = kadroMap.get(sicil_no)
    const ogId = eslestirOgrenimId(kazancOgrenimTuruBySicil.get(sicil_no) ?? ogrenimTuruBySicil.get(sicil_no), tanimOgList)
    const unvanId = unvanIdBySicil.get(sicil_no) ?? null
    const yurutId = yuruttuguUnvanIdBySicil.get(sicil_no) ?? null
    kaynaklar.push({
      sicil_no,
      ad_soyad: calisanAdBySicil.get(sicil_no) ?? k?.ad_soyad ?? sicil_no,
      unvan_adi:
        (unvanId != null ? unvanAdiById.get(unvanId) : undefined) ??
        kadroUnvaniBySicil.get(sicil_no) ??
        k?.gorev_unvani ??
        null,
      unvan_sinif: unvanId != null ? (sinifByUnvanId.get(unvanId) ?? null) : null,
      kadro_derecesi: kadroDerecesiBySicil.get(sicil_no) ?? null,
      ogrenim_turu: kazancOgrenimTuruBySicil.get(sicil_no) ?? ogrenimTuruBySicil.get(sicil_no) ?? null,
      ogrenim_id: ogId,
      unvan_id: unvanId,
      kha_derece: t.kha_derece,
      kha_kademe: t.kha_kademe,
      kha_tarihi: t.kha_tarihi,
      ekea_derece: t.ekea_derece,
      ekea_kademe: t.ekea_kademe,
      ekea_tarihi: t.ekea_tarihi,
      kidem_yili: t.kidem_yili,
      kidem_tarihi: t.kidem_tarihi,
      iyi_hal_terfi_tarihi: t.iyi_hal_terfi_tarihi,
      ek_gosterge: t.ek_gosterge,
      ek_odeme: t.ek_odeme,
      oht: t.oht,
      yan_odeme: t.yan_odeme,
      yan_odeme_eksi5: t.yan_odeme_eksi5,
      sds_orani: t.sds_orani,
      terfi_id: t.id,
      bilgisayar_kullaniyor: yetkinlikBySicil.get(sicil_no) ?? null,
      yuksek_ogrenim_var: yuksekOgrenimBySicil.get(sicil_no) === true,
      kadrosu_ile_ilgili: kadrosuIleIlgiliBySicil.get(sicil_no) === true,
      teknisyen_kariyer: teknisyenKariyerBySicil.get(sicil_no) ?? null,
      teknik_ogrenim: teknikOgrenimBySicil.get(sicil_no) === true,
      ogrenim_meslegi: ogrenimMeslekBySicil.get(sicil_no) ?? null,
      ogrenim_bolum: ogrenimBolumBySicil.get(sicil_no) ?? null,
      asil_mi: asilMiBySicil.get(sicil_no) === true,
      destek_yardimci_birim: unvanId != null ? destekByUnvanId.get(unvanId) === true : false,
      th_hizmet_baslangic: thHizmetBySicil.get(sicil_no) ?? null,
      yuruttugu_unvan_id: yurutId,
      yuruttugu_unvan_adi: yurutId != null ? unvanAdiById.get(yurutId) ?? null : null,
      kadro_rolu: asilMiBySicil.get(sicil_no) === true ? 'Asil' : 'Vekil',
      satir_id: terfiSatirAnahtari(sicil_no, t.id, asilMiBySicil.get(sicil_no) === true ? 'Asil' : 'Vekil'),
    })
  }

  const khBySicil = new Map<string, KadroEslestirmeSatir[]>()
  for (const row of khRows) {
    for (const s of [row.asil, row.vekil]) {
      const sicil = (s ?? '').trim()
      if (!sicil) continue
      const list = khBySicil.get(sicil)
      if (list) list.push(row)
      else khBySicil.set(sicil, [row])
    }
  }

  const vekilEk: TerfiKaynak[] = []
  for (const kaynak of kaynaklar) {
    const sicil = kaynak.sicil_no
    const ilgili = (khBySicil.get(sicil) ?? []).filter(r => kadroAktifMi(r.ayrilis_tarihi))
    const asilKh = ilgili.find(r => sicilEsit(r.asil, sicil))
    if (!asilKh) continue
    const vekilMudurKh = ilgili.filter(
      r => sicilEsit(r.vekil, sicil) && vekilMudurUnvaniMi(r.kadro_unvani ?? r.gorev_unvani),
    )
    if (!vekilMudurKh.length) continue
    const asilUnvanId = asilKh.kadro_unvan_id ?? asilKh.gorev_unvan_id ?? null
    const asilUnvanAdi =
      (asilUnvanId != null ? unvanAdiById.get(asilUnvanId) : undefined) ?? asilKh.kadro_unvani ?? asilKh.gorev_unvani ?? null
    for (const vk of vekilMudurKh) {
      const vt = terfiKaydiSec(terfiBySicil.get(sicil) ?? [], vk.id)
      if (!vt || vt.id === kaynak.terfi_id) continue
      const vekilUnvanId = vk.kadro_unvan_id ?? vk.gorev_unvan_id ?? null
      vekilEk.push({
        sicil_no: sicil,
        ad_soyad: kaynak.ad_soyad,
        unvan_adi:
          (vekilUnvanId != null ? unvanAdiById.get(vekilUnvanId) : undefined) ??
          vk.kadro_unvani ??
          vk.gorev_unvani ??
          null,
        unvan_sinif: vekilUnvanId != null ? (sinifByUnvanId.get(vekilUnvanId) ?? null) : null,
        kadro_derecesi: vk.kadro_derecesi ?? null,
        ogrenim_turu: kaynak.ogrenim_turu,
        ogrenim_id: kaynak.ogrenim_id,
        unvan_id: vekilUnvanId,
        kha_derece: vt.kha_derece ?? kaynak.kha_derece,
        kha_kademe: vt.kha_kademe ?? kaynak.kha_kademe,
        kha_tarihi: vt.kha_tarihi ?? kaynak.kha_tarihi,
        ekea_derece: vt.ekea_derece ?? kaynak.ekea_derece,
        ekea_kademe: vt.ekea_kademe ?? kaynak.ekea_kademe,
        ekea_tarihi: vt.ekea_tarihi ?? kaynak.ekea_tarihi,
        kidem_yili: vt.kidem_yili ?? kaynak.kidem_yili,
        kidem_tarihi: vt.kidem_tarihi ?? kaynak.kidem_tarihi,
        iyi_hal_terfi_tarihi: vt.iyi_hal_terfi_tarihi ?? kaynak.iyi_hal_terfi_tarihi,
        ek_gosterge: vt.ek_gosterge,
        ek_odeme: vt.ek_odeme,
        oht: vt.oht,
        yan_odeme: vt.yan_odeme,
        yan_odeme_eksi5: vt.yan_odeme_eksi5,
        sds_orani: vt.sds_orani,
        terfi_id: vt.id,
        bilgisayar_kullaniyor: kaynak.bilgisayar_kullaniyor,
        yuksek_ogrenim_var: kaynak.yuksek_ogrenim_var,
        kadrosu_ile_ilgili: kaynak.kadrosu_ile_ilgili,
        teknisyen_kariyer: kaynak.teknisyen_kariyer,
        teknik_ogrenim: kaynak.teknik_ogrenim,
        ogrenim_meslegi: kaynak.ogrenim_meslegi,
        ogrenim_bolum: kaynak.ogrenim_bolum,
        asil_mi: false,
        destek_yardimci_birim: vekilUnvanId != null ? destekByUnvanId.get(vekilUnvanId) === true : false,
        th_hizmet_baslangic: kaynak.th_hizmet_baslangic,
        yuruttugu_unvan_id: kaynak.yuruttugu_unvan_id,
        yuruttugu_unvan_adi: kaynak.yuruttugu_unvan_adi,
        kadro_rolu: 'Vekil',
        satir_id: terfiSatirAnahtari(sicil, vt.id, 'Vekil'),
        vekil_mudur_fark_mi: true,
        asil_unvan_id: asilUnvanId,
        asil_unvan_adi: asilUnvanAdi,
        asil_kadro_derecesi: asilKh.kadro_derecesi ?? null,
        asil_destek_yardimci_birim: asilUnvanId != null ? destekByUnvanId.get(asilUnvanId) === true : false,
        asil_unvan_sinif: asilUnvanId != null ? (sinifByUnvanId.get(asilUnvanId) ?? null) : null,
      })
    }
  }
  kaynaklar.push(...vekilEk)
  kaynaklar.sort((a, b) => {
    const sicil = (parseInt(a.sicil_no, 10) || 0) - (parseInt(b.sicil_no, 10) || 0) || a.sicil_no.localeCompare(b.sicil_no, 'tr')
    if (sicil !== 0) return sicil
    const ra = a.kadro_rolu === 'Asil' ? 0 : a.kadro_rolu === 'Vekil' ? 1 : 2
    const rb = b.kadro_rolu === 'Asil' ? 0 : b.kadro_rolu === 'Vekil' ? 1 : 2
    if (ra !== rb) return ra - rb
    return (a.terfi_id ?? 0) - (b.terfi_id ?? 0)
  })

  const kazancLookupHam = (unvanId: number, ogrenimId: number, derece: number): KazancPuan | null =>
    kazancMap.get(`${unvanId}-${ogrenimId}-${derece}`) ?? null

  const kazancEntries = [...kazancMap.entries()].map(([key, puan]) => ({ key, puan }))
  const teknisyenEkGosterge = teknisyenEkGostergeBaglamKur({
    unvanlar: (unvanAdRaw ?? []).map(u => ({ id: u.id, unvan_adi: u.unvan_adi })),
    tanimOgList,
  })
  const lisansGrupIds = teknisyenEkGosterge.lisansOnlisansOgrenimIds
  const kazancLookupYedek = (unvanId: number, ogrenimId: number, derece: number): KazancPuan | null => {
    const row = kazancLookupHam(unvanId, ogrenimId, derece)
    if (row) return row
    for (const ogId of kazancLookupYedekOgrenimIds(ogrenimId, tanimOgList, lisansGrupIds)) {
      if (ogId === ogrenimId) continue
      const alt = kazancLookupHam(unvanId, ogId, derece)
      if (alt) return alt
    }
    return null
  }
  const kazancLookup = kazancLookupOzelKalemIle(
    kazancLookupYedek,
    ozelKalemUnvanIdleri((unvanAdRaw ?? []).map(u => ({ id: u.id, unvan_adi: u.unvan_adi }))),
  )

  const memurPersoneller = memurSiciller
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
    .map(sicil_no => {
      const k = kadroMap.get(sicil_no)
      return {
        sicil_no,
        ad_soyad: calisanAdBySicil.get(sicil_no) ?? k?.ad_soyad ?? sicil_no,
        alt: ogrenimTuruBySicil.get(sicil_no) ? `Öğrenim: ${ogrenimTuruBySicil.get(sicil_no)}` : undefined,
      }
    })

  return { kaynaklar, kazancLookup, kazancEntries, tanimOgList, teknisyenEkGosterge, memurPersoneller }
}
