import { tarihDahilAralikta, tarihGun } from '@/lib/terfi-donem-aralik'
import {
  parseKidemYili,
  yanOdemeTanimdan,
  unvanSinifiThMi,
  unvanYanOdemeBilgisayarMi,
  thKidemEksi5BandiMi,
} from '@/lib/kazanc-yan-odeme'
import {
  TH_HIZMET_SURESI_5_YIL_NOTU,
  TH_SINIF_HIZMET_DURUM,
  thBesinciYilDonumuIso,
  thYanOdemeYilSec,
} from '@/lib/th-hizmet-yili'
import {
  teknisyenEkGostergeUygula,
  unvanTeknisyenMi,
  type TeknisyenEkGostergeBaglam,
} from '@/lib/kazanc-teknisyen-ek-gosterge'

export type TerfiEttirDurumEtiket =
  | 'Derece İlerledi'
  | 'Sadece Kademe'
  | 'Tavan Kademe (Lise)'
  | 'Tavan Kademe'
  | 'Eğitim Sınırında'
  | 'Kıdem Yılı İlerledi'
  | 'Sınıf Hizmet Süresi Arttı'
  | 'İyi Hal İlerlemesi'
  | 'Hazırlık Okudu'
  | 'Yükseklisansını Tamamladı'
  | 'Doktorasını Tamamladı'
  | '—'

/** Lise → min 3; Ön Lisans / Lisans → min 1 */
export function minDereceEgitim(ogrenimTuru: string | null | undefined): number {
  const raw = (ogrenimTuru ?? '').trim().toLowerCase()
  const t = raw.normalize('NFD').replace(/\p{M}/gu, '')
  if (t.includes('meslek') && t.includes('lise')) return 3
  if (t === 'lise' || (t.includes('lise') && !t.includes('lisans') && !t.includes('on'))) return 3
  if (t.includes('onlisans') || (t.includes('ön') && t.includes('lisans'))) return 1
  if (/\blisans\b/.test(t) && !t.includes('on')) return 1
  return 1
}

function parseNum(s: string | null | undefined): number | null {
  if (s == null || !String(s).trim()) return null
  const n = Number.parseInt(String(s).trim(), 10)
  return Number.isFinite(n) ? n : null
}

export type IlerlemeSonuc = {
  yeniDerece: number
  yeniKademe: number
  dereceDegisti: boolean
  kademeDegisti: boolean
  durum: TerfiEttirDurumEtiket
}

function etiketTavan(minD: number): TerfiEttirDurumEtiket {
  return minD >= 3 ? 'Tavan Kademe (Lise)' : 'Tavan Kademe'
}

/**
 * Tek KHA veya EKEA derece/kademe çifti için ilerleme kuralı.
 */
export function hesaplaDkIlerleme(derece: number, kademe: number, minDerece: number): IlerlemeSonuc {
  const d = derece
  const k = kademe
  if (d < 1 || k < 1) {
    return {
      yeniDerece: d,
      yeniKademe: k,
      dereceDegisti: false,
      kademeDegisti: false,
      durum: '—',
    }
  }

  if (k < 3) {
    return {
      yeniDerece: d,
      yeniKademe: k + 1,
      dereceDegisti: false,
      kademeDegisti: true,
      durum: 'Sadece Kademe',
    }
  }

  if (k === 3) {
    if (d > minDerece) {
      return {
        yeniDerece: d - 1,
        yeniKademe: 1,
        dereceDegisti: true,
        kademeDegisti: true,
        durum: 'Derece İlerledi',
      }
    }
    if (d === minDerece) {
      return {
        yeniDerece: d,
        yeniKademe: 4,
        dereceDegisti: false,
        kademeDegisti: true,
        durum: etiketTavan(minDerece),
      }
    }
  }

  if (k >= 4) {
    return {
      yeniDerece: d,
      yeniKademe: k,
      dereceDegisti: false,
      kademeDegisti: false,
      durum: 'Eğitim Sınırında',
    }
  }

  return {
    yeniDerece: d,
    yeniKademe: k,
    dereceDegisti: false,
    kademeDegisti: false,
    durum: '—',
  }
}

export function dkString(d: number, k: number): string {
  return `${d}/${k}`
}

export type KazancPuan = {
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  yan_odeme_eksi5: string | null
  yan_odeme_bilgisayarsiz?: string | null
  sds_orani: string | null
}

export function kazancSatirToPuan(row: KazancPuan | null | undefined): KazancPuan {
  if (!row) {
    return {
      ek_gosterge: null,
      ek_odeme: null,
      oht: null,
      yan_odeme: null,
      yan_odeme_eksi5: null,
      yan_odeme_bilgisayarsiz: null,
      sds_orani: null,
    }
  }
  return {
    ek_gosterge: row.ek_gosterge ?? null,
    ek_odeme: row.ek_odeme ?? null,
    oht: row.oht ?? null,
    yan_odeme: row.yan_odeme ?? null,
    yan_odeme_eksi5: row.yan_odeme_eksi5 ?? null,
    yan_odeme_bilgisayarsiz: row.yan_odeme_bilgisayarsiz ?? null,
    sds_orani: row.sds_orani ?? null,
  }
}

/** TH kıdem bandı veya V.H.K.İ. yetkinliğine göre `yan_odeme` tanımdan seçilir. */
export function puanThYanOdemeIle(
  puanSon: KazancPuan,
  tanim: KazancPuan | null,
  kidem: number | null,
  thMi: boolean,
  unvanAdi?: string | null,
  bilgisayarKullaniyor?: boolean | null,
): { puan: KazancPuan; tanimArti5: string | null } {
  if (!tanim) {
    return { puan: puanSon, tanimArti5: null }
  }
  const uygulanan = yanOdemeTanimdan(tanim, kidem, thMi, unvanAdi, bilgisayarKullaniyor)
  const uygulananDolu = String(uygulanan ?? '').trim() !== ''
  const ozel = thMi || unvanYanOdemeBilgisayarMi(unvanAdi)
  if (!ozel) {
    return { puan: puanSon, tanimArti5: tanim.yan_odeme ?? null }
  }
  return {
    puan: {
      ...puanSon,
      yan_odeme_eksi5: tanim.yan_odeme_eksi5,
      yan_odeme_bilgisayarsiz: tanim.yan_odeme_bilgisayarsiz,
      yan_odeme: uygulananDolu ? uygulanan : puanSon.yan_odeme,
    },
    tanimArti5: tanim.yan_odeme,
  }
}

export type TerfiKaynak = {
  sicil_no: string
  ad_soyad: string | null
  unvan_adi: string | null
  /** `tanim_unvan.sinif_adi` — TH’de yan ödeme kıdem yılına göre seçilir */
  unvan_sinif: string | null
  /** `kadro_hareketleri.kadro_derecesi` (görev satırı) */
  kadro_derecesi: string | null
  ogrenim_turu: string | null
  ogrenim_id: number | null
  unvan_id: number | null
  kha_derece: string | null
  kha_kademe: string | null
  kha_tarihi: string | null
  ekea_derece: string | null
  ekea_kademe: string | null
  ekea_tarihi: string | null
  kidem_yili: string | null
  kidem_tarihi: string | null
  iyi_hal_terfi_tarihi: string | null
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  yan_odeme_eksi5: string | null
  sds_orani: string | null
  terfi_id: number | null
  /** `calisan.bilgisayar_kullaniyor` — V.H.K.İ. / Bilgisayar İşletmeni yan ödemesi */
  bilgisayar_kullaniyor: boolean | null
  /** Aktif öğrenimde önlisans / lisans / YL / doktora kaydı var. */
  yuksek_ogrenim_var: boolean
  /** Yüksek öğrenim kaydında kadrosu ile ilgili işaretli. */
  kadrosu_ile_ilgili: boolean
  /** `calisan.th_hizmet_baslangic` — TH −5/+5 bandı (yoksa kıdem yılı) */
  th_hizmet_baslangic?: string | null
}

export type TerfiEttirOnizlemeSatir = {
  sicil_no: string
  ad_soyad: string | null
  unvan_adi: string | null
  unvan_sinif: string | null
  /** Tanımdaki +5 yıl sütunu (uygulanan `yan_odeme` kıdeme göre −5 olabilir) */
  tanim_yan_odeme_arti5: string | null
  kadro_derecesi: string | null
  ogrenim_turu: string | null
  kha_tarihi: string | null
  ekea_tarihi: string | null
  kidem_tarihi_eski: string
  kidem_tarihi_yeni: string
  iyi_hal_tarihi_eski: string
  iyi_hal_tarihi_yeni: string
  kidem_yili_eski: string
  kidem_yili_yeni: string
  dk_kha_eski: string
  dk_kha_yeni: string
  dk_ekea_eski: string
  dk_ekea_yeni: string
  ek_gosterge_eski: string
  ek_gosterge_yeni: string
  ek_odeme_eski: string
  ek_odeme_yeni: string
  oht_eski: string
  oht_yeni: string
  yan_odeme_eski: string
  yan_odeme_yeni: string
  yan_odeme_eksi5_eski: string
  yan_odeme_eksi5_yeni: string
  sds_eski: string
  sds_yeni: string
  durum: TerfiEttirDurumEtiket
  /** Terfi log `sonraki.aciklama` — örn. hizmet süresi 5 yılı geçti */
  th_hizmet_notu?: string | null
  th_hizmet_baslangic?: string | null
  /** Derece ilerledi ama unvan+öğrenim+derece için kazanç tanımı yok; puanlar eski değerde bırakıldı */
  kazanc_tanimi_eksik?: boolean
  /** Kazanç tanımı bulunamayan dereceler */
  kazanc_eksik_dereceler?: number[]
  terfi_id: number | null
  /** Öğrenim terfi modalından eklenen satır */
  ogrenim_terfi?: boolean
  ogrenim_olay?: 'hazirlik' | 'yuksek_lisans' | 'doktora'
  yeni_ogrenim_turu?: string | null
  payload: {
    kha_derece: string | null
    kha_kademe: string | null
    ekea_derece: string | null
    ekea_kademe: string | null
    kha_tarihi: string | null
    ekea_tarihi: string | null
    kidem_tarihi: string | null
    kidem_yili: string | null
    iyi_hal_terfi_tarihi: string | null
    ek_gosterge: string | null
    ek_odeme: string | null
    oht: string | null
    yan_odeme: string | null
    yan_odeme_eksi5: string | null
    sds_orani: string | null
  }
}

type KazancLookup = (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null

function birlesDurum(a: TerfiEttirDurumEtiket, b: TerfiEttirDurumEtiket): TerfiEttirDurumEtiket {
  const labels = new Set<string>()
  const ekle = (x: TerfiEttirDurumEtiket) => {
    if (x === '—') return
    for (const p of x.split(', ')) {
      const t = p.trim()
      if (t) labels.add(t)
    }
  }
  ekle(a)
  ekle(b)
  if (!labels.size) return '—'
  return [...labels].join(', ') as TerfiEttirDurumEtiket
}

function yilIleri(t: string | null | undefined, yil: number): string | null {
  if (t == null || !String(t).trim()) return null
  const iso = String(t).slice(0, 10)
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  d.setFullYear(d.getFullYear() + yil)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function birYilIleri(t: string | null | undefined): string | null {
  return yilIleri(t, 1)
}

function thEksi5UygulaniyorMu(
  mevcutYan: string | null | undefined,
  tanim: KazancPuan | null,
  thMi: boolean,
): boolean {
  if (!thMi || !tanim) return false
  const eksi5 = String(tanim.yan_odeme_eksi5 ?? '').trim()
  const arti5 = String(tanim.yan_odeme ?? '').trim()
  const mevcut = String(mevcutYan ?? '').trim()
  return !!eksi5 && mevcut === eksi5 && mevcut !== arti5
}

/**
 * Terfi tarih penceresi ve kazanç lookup ile önizleme satırları üretir.
 */
export function buildTerfiEttirOnizleme(
  kaynaklar: TerfiKaynak[],
  terfiBas: string,
  terfiBit: string,
  kazancLookup: KazancLookup,
  teknisyenEkGosterge?: TeknisyenEkGostergeBaglam | null,
): TerfiEttirOnizlemeSatir[] {
  const out: TerfiEttirOnizlemeSatir[] = []
  const sonrakiYilBas = birYilIleri(terfiBas)
  const sonrakiYilBit = birYilIleri(terfiBit)

  for (const r of kaynaklar) {
    const minD = minDereceEgitim(r.ogrenim_turu)
    const khaIn = tarihDahilAralikta(r.kha_tarihi, terfiBas, terfiBit)
    const ekeaIn = tarihDahilAralikta(r.ekea_tarihi, terfiBas, terfiBit)
    const kidemIn = tarihDahilAralikta(r.kidem_tarihi, terfiBas, terfiBit)
    const iyiHalIn = tarihDahilAralikta(r.iyi_hal_terfi_tarihi, terfiBas, terfiBit)
    const khaInSonrakiYil = !!sonrakiYilBas && !!sonrakiYilBit && tarihDahilAralikta(r.kha_tarihi, sonrakiYilBas, sonrakiYilBit)
    const ekeaInSonrakiYil = !!sonrakiYilBas && !!sonrakiYilBit && tarihDahilAralikta(r.ekea_tarihi, sonrakiYilBas, sonrakiYilBit)
    const kidemInSonrakiYil = !!sonrakiYilBas && !!sonrakiYilBit && tarihDahilAralikta(r.kidem_tarihi, sonrakiYilBas, sonrakiYilBit)
    const iyiHalInSonrakiYil =
      !!sonrakiYilBas && !!sonrakiYilBit && tarihDahilAralikta(r.iyi_hal_terfi_tarihi, sonrakiYilBas, sonrakiYilBit)
    const thMi = unvanSinifiThMi(r.unvan_sinif)
    const thYilBit = thYanOdemeYilSec({
      thMi,
      thHizmetBaslangic: r.th_hizmet_baslangic,
      kidemYili: parseKidemYili(r.kidem_yili),
      referansTarih: terfiBit,
    })
    const besinci = thBesinciYilDonumuIso(r.th_hizmet_baslangic)
    const besinciIn = !!besinci && tarihDahilAralikta(besinci, terfiBas, terfiBit)
    const kdPeek = parseNum(r.kha_derece)
    const tanimMevcutPeek =
      thMi && r.unvan_id != null && r.ogrenim_id != null && kdPeek != null
        ? kazancLookup(r.unvan_id, r.ogrenim_id, kdPeek)
        : null
    const thCatchUp =
      thMi &&
      !thKidemEksi5BandiMi(thYilBit) &&
      thEksi5UygulaniyorMu(r.yan_odeme, tanimMevcutPeek ? kazancSatirToPuan(tanimMevcutPeek) : null, thMi)

    const donemKapsaminda =
      khaIn || ekeaIn || kidemIn || iyiHalIn || khaInSonrakiYil || ekeaInSonrakiYil || kidemInSonrakiYil || iyiHalInSonrakiYil
    if (!donemKapsaminda && !besinciIn && !thCatchUp) continue

    const kd = parseNum(r.kha_derece)
    const kk = parseNum(r.kha_kademe)
    const ed = parseNum(r.ekea_derece)
    const ek = parseNum(r.ekea_kademe)
    if (kd == null || kk == null || ed == null || ek == null) continue
    const kidem = parseNum(r.kidem_yili)

    const gunKha = tarihGun(r.kha_tarihi)
    const gunEkea = tarihGun(r.ekea_tarihi)
    const ayniGunTerfi =
      Boolean(gunKha && gunEkea && gunKha === gunEkea && khaIn && ekeaIn)

    const puanEski = kazancSatirToPuan(r)
    const uId = r.unvan_id
    const oId = r.ogrenim_id

    const kazancEksik = new Set<number>()

    const lookup = (derece: number): KazancPuan => {
      const row = uId != null && oId != null ? kazancLookup(uId, oId, derece) : null
      if (!row) {
        kazancEksik.add(derece)
        return puanEski
      }
      return kazancSatirToPuan(row)
    }

    let newKd = kd
    let newKk = kk
    let newEd = ed
    let newEk = ek
    const newKhaTarih = khaIn ? birYilIleri(r.kha_tarihi) : (r.kha_tarihi ?? null)
    const newEkeaTarih = ekeaIn ? birYilIleri(r.ekea_tarihi) : (r.ekea_tarihi ?? null)
    const newKidemTarih = kidemIn ? birYilIleri(r.kidem_tarihi) : (r.kidem_tarihi ?? null)
    // İyi Hal: bir sonraki hak 8 yıl sonra
    const newIyiHalTarih = iyiHalIn ? yilIleri(r.iyi_hal_terfi_tarihi, 8) : (r.iyi_hal_terfi_tarihi ?? null)
    const kidemYiliIlerledi = Boolean(kidemIn && kidem != null && kidem < 25)
    const newKidemYili =
      kidem == null ? (r.kidem_yili ?? null) : String(Math.min(25, kidemIn ? kidem + 1 : kidem))
    let durum: TerfiEttirDurumEtiket = '—'
    let puanSon: KazancPuan = { ...puanEski }

    if (ayniGunTerfi) {
      const son = hesaplaDkIlerleme(kd, kk, minD)
      newKd = son.yeniDerece
      newKk = son.yeniKademe
      newEd = son.yeniDerece
      newEk = son.yeniKademe
      durum = son.durum
      if (son.dereceDegisti) {
        puanSon = { ...puanSon, ...lookup(newKd) }
      }
    } else {
      if (khaIn) {
        const sonK = hesaplaDkIlerleme(kd, kk, minD)
        newKd = sonK.yeniDerece
        newKk = sonK.yeniKademe
        durum = sonK.durum
        if (sonK.dereceDegisti) {
          puanSon = { ...puanSon, ...lookup(newKd) }
        }
      }
      if (ekeaIn) {
        const sonE = hesaplaDkIlerleme(ed, ek, minD)
        newEd = sonE.yeniDerece
        newEk = sonE.yeniKademe
        durum = birlesDurum(durum, sonE.durum)
        if (sonE.dereceDegisti) {
          puanSon = { ...puanSon, ...lookup(newEd) }
        }
      }
    }
    if (kidemYiliIlerledi) {
      durum = birlesDurum(durum, 'Kıdem Yılı İlerledi')
    }
    if (iyiHalIn) {
      // İyi Hal: KHA ve EKEA her ikisine de bağımsız olarak 1 kademe ilerlet
      const sonKH = hesaplaDkIlerleme(newKd, newKk, minD)
      newKd = sonKH.yeniDerece
      newKk = sonKH.yeniKademe
      if (sonKH.dereceDegisti) {
        puanSon = { ...puanSon, ...lookup(newKd) }
      }
      const sonEK = hesaplaDkIlerleme(newEd, newEk, minD)
      newEd = sonEK.yeniDerece
      newEk = sonEK.yeniKademe
      if (sonEK.dereceDegisti) {
        puanSon = { ...puanSon, ...lookup(newEd) }
      }
      durum = birlesDurum(durum, 'İyi Hal İlerlemesi')
    }

    const tanimYeni = uId != null && oId != null ? kazancLookup(uId, oId, newKd) : null
    const tanimYeniPuan = tanimYeni ? kazancSatirToPuan(tanimYeni) : null
    const thYilUygula = thYanOdemeYilSec({
      thMi,
      thHizmetBaslangic: r.th_hizmet_baslangic,
      kidemYili: parseKidemYili(newKidemYili),
      referansTarih: terfiBit,
    })
    const yanUyg = puanThYanOdemeIle(
      puanSon,
      tanimYeniPuan,
      thYilUygula,
      thMi,
      r.unvan_adi,
      r.bilgisayar_kullaniyor,
    )
    puanSon = yanUyg.puan
    puanSon = teknisyenEkGostergeUygula(puanSon, kazancLookup, {
      unvanAdi: r.unvan_adi,
      kadroDerecesi: r.kadro_derecesi,
      khaDerece: newKd,
      yuksekOgrenimVar: r.yuksek_ogrenim_var,
      kadrosuIleIlgili: r.kadrosu_ile_ilgili,
      baglam: teknisyenEkGosterge,
    })
    if (r.kadrosu_ile_ilgili && unvanTeknisyenMi(r.unvan_adi) && r.yuksek_ogrenim_var) {
      const overlayYan = puanThYanOdemeIle(
        puanSon,
        puanSon,
        thYilUygula,
        thMi,
        r.unvan_adi,
        r.bilgisayar_kullaniyor,
      )
      puanSon = overlayYan.puan
      yanUyg.tanimArti5 = overlayYan.tanimArti5
    }

    let thHizmetNotu: string | null = null
    if (
      thMi &&
      !thKidemEksi5BandiMi(thYilUygula) &&
      thEksi5UygulaniyorMu(
        r.yan_odeme,
        tanimMevcutPeek ? kazancSatirToPuan(tanimMevcutPeek) : null,
        thMi,
      )
    ) {
      durum = birlesDurum(durum, TH_SINIF_HIZMET_DURUM)
      thHizmetNotu = TH_HIZMET_SURESI_5_YIL_NOTU
    }

    out.push({
      sicil_no: r.sicil_no,
      ad_soyad: r.ad_soyad,
      unvan_adi: r.unvan_adi,
      unvan_sinif: r.unvan_sinif ?? null,
      tanim_yan_odeme_arti5: yanUyg.tanimArti5,
      kadro_derecesi: r.kadro_derecesi,
      ogrenim_turu: r.ogrenim_turu,
      kha_tarihi: r.kha_tarihi,
      ekea_tarihi: r.ekea_tarihi,
      kidem_tarihi_eski: r.kidem_tarihi ?? '—',
      kidem_tarihi_yeni: newKidemTarih ?? '—',
      iyi_hal_tarihi_eski: r.iyi_hal_terfi_tarihi ?? '—',
      iyi_hal_tarihi_yeni: newIyiHalTarih ?? '—',
      kidem_yili_eski: r.kidem_yili ?? '—',
      kidem_yili_yeni: newKidemYili ?? '—',
      dk_kha_eski: dkString(kd, kk),
      dk_kha_yeni: dkString(newKd, newKk),
      dk_ekea_eski: dkString(ed, ek),
      dk_ekea_yeni: dkString(newEd, newEk),
      ek_gosterge_eski: r.ek_gosterge ?? '—',
      ek_gosterge_yeni: puanSon.ek_gosterge ?? '—',
      ek_odeme_eski: r.ek_odeme ?? '—',
      ek_odeme_yeni: puanSon.ek_odeme ?? '—',
      oht_eski: r.oht ?? '—',
      oht_yeni: puanSon.oht ?? '—',
      yan_odeme_eski: r.yan_odeme ?? '—',
      yan_odeme_yeni: puanSon.yan_odeme ?? '—',
      yan_odeme_eksi5_eski: r.yan_odeme_eksi5 ?? '—',
      yan_odeme_eksi5_yeni: puanSon.yan_odeme_eksi5 ?? '—',
      sds_eski: r.sds_orani ?? '—',
      sds_yeni: puanSon.sds_orani ?? '—',
      durum,
      th_hizmet_notu: thHizmetNotu,
      th_hizmet_baslangic: r.th_hizmet_baslangic ?? null,
      kazanc_tanimi_eksik: kazancEksik.size > 0,
      kazanc_eksik_dereceler: kazancEksik.size > 0 ? [...kazancEksik].sort((a, b) => a - b) : undefined,
      terfi_id: r.terfi_id,
      payload: {
        kha_derece: String(newKd),
        kha_kademe: String(newKk),
        ekea_derece: String(newEd),
        ekea_kademe: String(newEk),
        kha_tarihi: newKhaTarih,
        ekea_tarihi: newEkeaTarih,
        kidem_tarihi: newKidemTarih,
        kidem_yili: newKidemYili,
        iyi_hal_terfi_tarihi: newIyiHalTarih,
        ek_gosterge: puanSon.ek_gosterge,
        ek_odeme: puanSon.ek_odeme,
        oht: puanSon.oht,
        yan_odeme: puanSon.yan_odeme,
        yan_odeme_eksi5: puanSon.yan_odeme_eksi5,
        sds_orani: puanSon.sds_orani,
      },
    })
  }

  return out
}
