import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import { isFirmaCalisanAktif } from '@/lib/firma-calisan-durum'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { trNormalize } from '@/lib/turkce-search'

export type Istihdam = 'memur' | 'sozlesmeli' | 'isci' | 'adabel' | 'diger'
export type SayfaYonu = 'yatay' | 'dikey'

export const ISTIHDAM_SECENEKLERI: { id: Istihdam; etiket: string }[] = [
  { id: 'memur', etiket: 'Memur' },
  { id: 'sozlesmeli', etiket: 'Sözleşmeli' },
  { id: 'isci', etiket: 'İşçi' },
  { id: 'adabel', etiket: 'ADABEL' },
  { id: 'diger', etiket: 'Diğer' },
]

export interface SihirbazBaslik {
  key: string
  etiket: string
  grup: string
  /** ADABEL havuzunda da dolan başlıklar. */
  adabel: boolean
}

export const SIHIRBAZ_BASLIKLARI: SihirbazBaslik[] = [
  { key: 'sicil_no', etiket: 'Sicil No', grup: 'Kimlik ve iletişim', adabel: true },
  { key: 'ad_soyad', etiket: 'Adı Soyadı', grup: 'Kimlik ve iletişim', adabel: true },
  { key: 'tckn', etiket: 'T.C. Kimlik No', grup: 'Kimlik ve iletişim', adabel: true },
  { key: 'sgk_ssk_sicil_no', etiket: 'SGK/SSK Sicil No', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'dogum_tarihi', etiket: 'Doğum Tarihi', grup: 'Kimlik ve iletişim', adabel: true },
  { key: 'cinsiyet', etiket: 'Cinsiyet', grup: 'Kimlik ve iletişim', adabel: true },
  { key: 'kan_grubu', etiket: 'Kan Grubu', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'dogum_yeri', etiket: 'Doğum Yeri', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'anne_adi', etiket: 'Anne Adı', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'baba_adi', etiket: 'Baba Adı', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'askerlik_durumu', etiket: 'Askerlik Durumu', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'telefon', etiket: 'Telefon', grup: 'Kimlik ve iletişim', adabel: true },
  { key: 'e_posta', etiket: 'E-posta', grup: 'Kimlik ve iletişim', adabel: true },
  { key: 'mahalle', etiket: 'Mahalle', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'adres', etiket: 'Açık adres', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'yakini', etiket: 'Yakını', grup: 'Kimlik ve iletişim', adabel: false },
  { key: 'yakini_telefonu', etiket: 'Yakını Telefonu', grup: 'Kimlik ve iletişim', adabel: false },

  { key: 'gorev_yeri', etiket: 'Görev yeri', grup: 'Görev', adabel: false },
  { key: 'yerleske', etiket: 'Yerleşke adresi', grup: 'Görev', adabel: true },
  { key: 'gorev_turu', etiket: 'Görev türü', grup: 'Görev', adabel: false },
  { key: 'gorev_turu_tarihi', etiket: 'Görev türü tarihi', grup: 'Görev', adabel: false },
  { key: 'gorev_turu_bitis', etiket: 'Görev türü bitiş tarihi', grup: 'Görev', adabel: false },
  { key: 'yemek_hakki', etiket: 'Yemek hakkı', grup: 'Görev', adabel: false },
  { key: 'gorev_turu_aciklama', etiket: 'Görevlendirme açıklaması', grup: 'Görev', adabel: false },
  { key: 'gorev_durumu', etiket: 'Görev durumu', grup: 'Görev', adabel: false },
  { key: 'yuruttugu_unvan', etiket: 'Yürüttüğü unvan', grup: 'Görev', adabel: false },
  { key: 'memuriyet_tarihi', etiket: 'Memuriyete giriş', grup: 'Görev', adabel: false },
  { key: 'kuruma_giris', etiket: 'Kuruma giriş', grup: 'Görev', adabel: true },
  { key: 'hizmet_suresi', etiket: 'Hizmet süresi', grup: 'Görev', adabel: false },
  { key: 'th_hizmet_baslangic', etiket: 'Teknik hizmet başlangıcı', grup: 'Görev', adabel: false },
  { key: 'tasinir_gorevi', etiket: 'Taşınır görevi', grup: 'Görev', adabel: false },

  { key: 'statu', etiket: 'Statü', grup: 'Kadro', adabel: true },
  { key: 'kadro_unvani', etiket: 'Kadro unvanı', grup: 'Kadro', adabel: false },
  { key: 'sinif', etiket: 'Sınıf', grup: 'Kadro', adabel: false },
  { key: 'kadro_derecesi', etiket: 'Kadro derecesi', grup: 'Kadro', adabel: false },
  { key: 'kadro_sira_no', etiket: 'Kadro sıra no', grup: 'Kadro', adabel: false },
  { key: 'kadro_mudurlugu', etiket: 'Kadro müdürlüğü', grup: 'Kadro', adabel: false },
  { key: 'gorev_unvani', etiket: 'Görev unvanı', grup: 'Kadro', adabel: true },
  { key: 'gorev_mudurlugu', etiket: 'Görev müdürlüğü', grup: 'Kadro', adabel: true },
  { key: 'kadro_durumu', etiket: 'Kadro durumu', grup: 'Kadro', adabel: false },

  { key: 'ogrenim', etiket: 'Öğrenim', grup: 'Öğrenim', adabel: true },
  { key: 'okul', etiket: 'Okul', grup: 'Öğrenim', adabel: false },
  { key: 'bolum', etiket: 'Bölüm', grup: 'Öğrenim', adabel: false },
  { key: 'meslegi', etiket: 'Mesleği', grup: 'Öğrenim', adabel: true },
  { key: 'mezuniyet', etiket: 'Mezuniyet tarihi', grup: 'Öğrenim', adabel: false },
  { key: 'kadrosu_ile_ilgili', etiket: 'Kadrosu ile ilgili', grup: 'Öğrenim', adabel: false },
  { key: 'teknik_ogrenim', etiket: 'Teknik öğrenim', grup: 'Öğrenim', adabel: false },

  { key: 'sendika', etiket: 'Sendika', grup: 'Sendika', adabel: false },
  { key: 'sendika_baslangic', etiket: 'Sendika başlangıcı', grup: 'Sendika', adabel: false },
  { key: 'sendika_bitis', etiket: 'Sendika bitişi', grup: 'Sendika', adabel: false },

  { key: 'medeni_hal', etiket: 'Medeni hal', grup: 'Aile', adabel: false },
  { key: 'es_ad', etiket: 'Eşin adı soyadı', grup: 'Aile', adabel: false },
  { key: 'es_tckn', etiket: 'Eşin T.C. kimlik no', grup: 'Aile', adabel: false },
  { key: 'es_is', etiket: 'Eşin iş durumu', grup: 'Aile', adabel: false },
  { key: 'es_gelir', etiket: 'Eşin gelir durumu', grup: 'Aile', adabel: false },
  { key: 'cocuk_sayisi', etiket: 'Çocuk sayısı', grup: 'Aile', adabel: false },

  /** Seçince Devreden / Hak Edilen / Kullanılan / Kalan sütunları açılır. */
  { key: 'izin_hak', etiket: 'Hak', grup: 'İzin', adabel: false },
  /** Seçince Ayrılış / Başlama / İzin Türü / Durum / Gün Bilgisi sütunları açılır. */
  { key: 'izin_kullanilan_secim', etiket: 'Kullanılan İzin', grup: 'İzin', adabel: false },
]

/** «Hak» seçildiğinde rapora eklenen sütunlar (/izin/haklar). */
export const SIHIRBAZ_IZIN_HAK_SUTUNLARI: SihirbazBaslik[] = [
  { key: 'izin_devreden', etiket: 'Devreden', grup: 'İzin', adabel: false },
  { key: 'izin_hak_edilen', etiket: 'Hak Edilen', grup: 'İzin', adabel: false },
  { key: 'izin_kullanilan', etiket: 'Kullanılan', grup: 'İzin', adabel: false },
  { key: 'izin_kalan', etiket: 'Kalan', grup: 'İzin', adabel: false },
]

/** «Kullanılan İzin» seçildiğinde rapora eklenen sütunlar. */
export const SIHIRBAZ_IZIN_KULLANILAN_SUTUNLARI: SihirbazBaslik[] = [
  { key: 'izin_ayrilis', etiket: 'Ayrılış', grup: 'İzin', adabel: false },
  { key: 'izin_baslama', etiket: 'Başlama', grup: 'İzin', adabel: false },
  { key: 'izin_tur', etiket: 'İzin Türü', grup: 'İzin', adabel: false },
  { key: 'izin_durum', etiket: 'Durum', grup: 'İzin', adabel: false },
  { key: 'izin_gun', etiket: 'Gün Bilgisi', grup: 'İzin', adabel: false },
]

export interface SihirbazSatir {
  id: string
  istihdam: Istihdam
  ad: string
  deger: Record<string, string>
}

export function sihirbazBasliklari(istihdam: Istihdam | Istihdam[]): SihirbazBaslik[] {
  const liste = Array.isArray(istihdam) ? istihdam : [istihdam]
  const yalnizAdabel = liste.length > 0 && liste.every(s => s === 'adabel')
  if (yalnizAdabel) return SIHIRBAZ_BASLIKLARI.filter(b => b.adabel)
  return SIHIRBAZ_BASLIKLARI
}

export function sihirbazGruplari(istihdam: Istihdam | Istihdam[]): { grup: string; basliklar: SihirbazBaslik[] }[] {
  const liste = sihirbazBasliklari(istihdam)
  const gruplar: { grup: string; basliklar: SihirbazBaslik[] }[] = []
  for (const b of liste) {
    const son = gruplar[gruplar.length - 1]
    if (son?.grup === b.grup) son.basliklar.push(b)
    else gruplar.push({ grup: b.grup, basliklar: [b] })
  }
  return gruplar
}

/** Seçim anahtarlarını önizleme / Excel sütunlarına açar (Hak ve Kullanılan İzin paketleri). */
export function sihirbazGorunenBasliklar(
  seciliKeys: string[],
  istihdam: Istihdam | Istihdam[],
): SihirbazBaslik[] {
  const harita = new Map(sihirbazBasliklari(istihdam).map(b => [b.key, b]))
  const out: SihirbazBaslik[] = []
  for (const key of seciliKeys) {
    if (key === 'izin_hak') {
      out.push(...SIHIRBAZ_IZIN_HAK_SUTUNLARI)
      continue
    }
    if (key === 'izin_kullanilan_secim') {
      out.push(...SIHIRBAZ_IZIN_KULLANILAN_SUTUNLARI)
      continue
    }
    const b = harita.get(key)
    if (b) out.push(b)
  }
  return out
}

function unvanSinifBul(
  unvanSinif: Map<string, string>,
  kadroUnvani: string | null | undefined,
  gorevUnvani: string | null | undefined,
): string {
  const k = String(kadroUnvani ?? '').trim()
  const g = String(gorevUnvani ?? '').trim()
  if (k && unvanSinif.has(k)) return unvanSinif.get(k)!
  if (g && unvanSinif.has(g)) return unvanSinif.get(g)!
  return '—'
}

function izinKayitMetinleri(kayitlar: SihirbazIzinKayit[] | undefined) {
  if (!kayitlar?.length) {
    return {
      izin_ayrilis: '—',
      izin_baslama: '—',
      izin_tur: '—',
      izin_durum: '—',
      izin_gun: '—',
    }
  }
  return {
    izin_ayrilis: kayitlar.map(k => k.ayrilis).join('\n'),
    izin_baslama: kayitlar.map(k => k.baslama).join('\n'),
    izin_tur: kayitlar.map(k => k.tur).join('\n'),
    izin_durum: kayitlar.map(k => k.durum).join('\n'),
    izin_gun: kayitlar.map(k => String(k.gun)).join('\n'),
  }
}

export interface SihirbazIzinKayit {
  ayrilis: string
  baslama: string
  tur: string
  durum: string
  gun: number
}

export interface SihirbazIzinHak {
  sicil_no: string
  devreden_gun: number
  hak_edilen_gun: number
  kullanilan_gun: number
  kalan_gun: number
}

function txt(v: string | number | null | undefined) {
  const s = String(v ?? '').trim()
  return s || '—'
}

function tarih(v: string | null | undefined) {
  const s = String(v ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

function evet(v: boolean | null | undefined) {
  if (v === true) return 'Evet'
  if (v === false) return 'Hayır'
  return '—'
}

function belediyeIstihdam(statu: string | null | undefined): Istihdam {
  const st = trNormalize(statu)
  if (st === 'memur' || st.startsWith('memur ')) return 'memur'
  if (st.includes('sozlesmeli')) return 'sozlesmeli'
  if (st.includes('isci')) return 'isci'
  return 'diger'
}

function bugunTurkiye(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

interface CalisanHam {
  sicil_no: string
  ad_soyad: string | null
  tckn: string | null
  cinsiyet: string | null
  kan_grubu: string | null
  sgk_ssk_sicil_no: string | null
  telefon: string | null
  e_posta: string | null
  dogum_tarihi: string | null
  dogum_yeri: string | null
  anne_adi: string | null
  baba_adi: string | null
  adresi: string | null
  mahalle_id: number | null
  adres_detay: string | null
  yakini: string | null
  yakini_telefonu: string | null
  askerlik_durumu: string | null
  memuriyet_tarihi: string | null
  kuruma_giris_tarihi: string | null
  hizmet_suresi_yil: number | null
  hizmet_suresi_ay: number | null
  hizmet_suresi_gun: number | null
  gorev_yeri: string | null
  gorev_turu: string | null
  gorev_turu_tarihi: string | null
  gorev_turu_bitis_tarihi: string | null
  gorev_turu_yemek_hakki: boolean | null
  gorev_turu_aciklama: string | null
  gorev_durumu: string | null
  yerleske_adresi_id: number | null
  tasinir_gorevi: string | null
  th_hizmet_baslangic: string | null
  yuruttugu_unvan_id: number | null
}

interface KadroHam extends KadroRaporRow {
  kadro_derecesi?: string | null
  kadro_sira_no?: string | null
}

interface OgrenimHam {
  sicil_no?: string | null
  varsayilan?: boolean | null
  ogrenim_turu?: string | null
  okul_adi?: string | null
  bolum?: string | null
  mezuniyet_tarihi?: string | null
  mezuniyet_yili?: number | null
  meslegi?: string | null
  kadrosu_ile_ilgili?: boolean | null
  teknik_ogrenim?: boolean | null
}

interface SendikaHam {
  sicil_no: string
  sendika_id: number
  baslangic_tarihi: string
  bitis_tarihi: string | null
  aktif: boolean
}

interface AileHam {
  sicil_no: string
  medeni_hal: string | null
  esin_ad_soyad: string | null
  esin_tckn: string | null
  is_durumu: string | null
  gelir_durumu: string | null
  cocuklar_json: unknown
}

interface FirmaHam {
  id: number
  sicil_no: string | null
  ad_soyad: string
  tckn: string | null
  cinsiyet: string | null
  dogum_tarihi: string | null
  ogrenim: string | null
  telefon: string | null
  e_posta: string | null
  kuruma_giris_tarihi: string | null
  gorev_mudurlugu: string | null
  gorevi: string | null
  meslegi: string | null
  ayrilis_tarihi: string | null
  yerleske_adresi_id: number | null
}

function adresMetni(adres: string | null, detay: string | null) {
  const a = String(adres ?? '').trim()
  const d = String(detay ?? '').trim()
  if (a && d && a !== d) return `${a} ${d}`.trim()
  return a || d || '—'
}

function hizmetMetni(yil: number | null, ay: number | null, gun: number | null) {
  return `${yil ?? 0} yıl ${ay ?? 0} ay ${gun ?? 0} gün`
}

function cocukSayisi(v: unknown) {
  if (Array.isArray(v) && v.length > 0) return String(v.length)
  return '—'
}

function mezuniyetMetni(tarihDeger: string | null | undefined, yil: number | null | undefined) {
  const t = tarih(tarihDeger)
  if (t !== '—') return t
  if (yil && Number.isFinite(yil)) return String(yil)
  return '—'
}

export function raporSihirbazSatirlari(input: {
  bugun?: string
  kadro: KadroHam[]
  calisanlar: CalisanHam[]
  ogrenimler: OgrenimHam[]
  sendikalar: SendikaHam[]
  sendikaAd: Map<number, string>
  aileler: AileHam[]
  firmalar: FirmaHam[]
  mahalleAd: Map<number, string>
  yerleskeAd: Map<number, string>
  unvanAd: Map<number, string>
  /** tanim_unvan.unvan_adi → sinif_adi */
  unvanSinif?: Map<string, string>
  izinHaklari?: SihirbazIzinHak[]
  izinKayitlariBySicil?: Map<string, SihirbazIzinKayit[]>
}): SihirbazSatir[] {
  const D = input.bugun ?? bugunTurkiye()
  const calisanBySicil = new Map(input.calisanlar.map(c => [c.sicil_no, c]))
  const unvanSinif = input.unvanSinif ?? new Map<string, string>()
  const hakBySicil = new Map((input.izinHaklari ?? []).map(h => [h.sicil_no, h]))
  const izinBySicil = input.izinKayitlariBySicil ?? new Map<string, SihirbazIzinKayit[]>()

  const ogrenimBySicil = new Map<string, OgrenimHam>()
  for (const o of input.ogrenimler) {
    if (!o?.varsayilan) continue
    const sicil = String(o.sicil_no ?? '').trim()
    if (sicil) ogrenimBySicil.set(sicil, o)
  }

  const sendikaBySicil = new Map<string, SendikaHam>()
  for (const s of input.sendikalar) {
    if (!s.aktif) continue
    const bitis = String(s.bitis_tarihi ?? '').slice(0, 10)
    if (bitis && bitis <= D) continue
    const once = sendikaBySicil.get(s.sicil_no)
    if (!once || s.baslangic_tarihi >= once.baslangic_tarihi) sendikaBySicil.set(s.sicil_no, s)
  }

  const aileBySicil = new Map(input.aileler.map(a => [a.sicil_no, a]))

  const byAsil = new Map<string, KadroHam[]>()
  for (const r of input.kadro) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r)
    byAsil.set(asil, list)
  }

  const out: SihirbazSatir[] = []
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const kadro = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const c = calisanBySicil.get(sicil)
    if (!c) continue
    const o = ogrenimBySicil.get(sicil)
    const sendika = sendikaBySicil.get(sicil)
    const aile = aileBySicil.get(sicil)
    const hak = hakBySicil.get(sicil)
    const izinMetin = izinKayitMetinleri(izinBySicil.get(sicil))
    const ad = txt(c.ad_soyad)
    out.push({
      id: `b:${sicil}`,
      istihdam: belediyeIstihdam(kadro.statu),
      ad: ad === '—' ? sicil : ad,
      deger: {
        sicil_no: sicil,
        ad_soyad: ad,
        tckn: txt(c.tckn),
        sgk_ssk_sicil_no: txt(c.sgk_ssk_sicil_no),
        dogum_tarihi: tarih(c.dogum_tarihi),
        cinsiyet: txt(c.cinsiyet),
        kan_grubu: txt(c.kan_grubu),
        dogum_yeri: txt(c.dogum_yeri),
        anne_adi: txt(c.anne_adi),
        baba_adi: txt(c.baba_adi),
        askerlik_durumu: txt(c.askerlik_durumu),
        telefon: txt(c.telefon),
        e_posta: txt(c.e_posta),
        mahalle: txt(c.mahalle_id != null ? input.mahalleAd.get(c.mahalle_id) : null),
        adres: adresMetni(c.adresi, c.adres_detay),
        yakini: txt(c.yakini),
        yakini_telefonu: txt(c.yakini_telefonu),
        gorev_yeri: txt(c.gorev_yeri),
        yerleske: txt(c.yerleske_adresi_id != null ? input.yerleskeAd.get(c.yerleske_adresi_id) : null),
        gorev_turu: txt(c.gorev_turu),
        gorev_turu_tarihi: tarih(c.gorev_turu_tarihi),
        gorev_turu_bitis: tarih(c.gorev_turu_bitis_tarihi),
        yemek_hakki: evet(c.gorev_turu_yemek_hakki),
        gorev_turu_aciklama: txt(c.gorev_turu_aciklama),
        gorev_durumu: txt(c.gorev_durumu),
        yuruttugu_unvan: txt(c.yuruttugu_unvan_id != null ? input.unvanAd.get(c.yuruttugu_unvan_id) : null),
        memuriyet_tarihi: tarih(c.memuriyet_tarihi ?? kadro.memuriyet_tarihi),
        kuruma_giris: tarih(c.kuruma_giris_tarihi ?? kadro.kuruma_giris_tarihi),
        hizmet_suresi: hizmetMetni(c.hizmet_suresi_yil, c.hizmet_suresi_ay, c.hizmet_suresi_gun),
        th_hizmet_baslangic: tarih(c.th_hizmet_baslangic),
        tasinir_gorevi: txt(c.tasinir_gorevi),
        statu: txt(kadro.statu),
        kadro_unvani: txt(kadro.kadro_unvani),
        sinif: unvanSinifBul(unvanSinif, kadro.kadro_unvani, kadro.gorev_unvani),
        kadro_derecesi: txt(kadro.kadro_derecesi),
        kadro_sira_no: txt(kadro.kadro_sira_no),
        kadro_mudurlugu: txt(kadro.kadro_mudurlugu),
        gorev_unvani: txt(kadro.gorev_unvani),
        gorev_mudurlugu: txt(kadro.gorev_mudurlugu),
        kadro_durumu: txt(kadro.durumu),
        ogrenim: txt(o?.ogrenim_turu),
        okul: txt(o?.okul_adi),
        bolum: txt(o?.bolum),
        meslegi: txt(o?.meslegi),
        mezuniyet: mezuniyetMetni(o?.mezuniyet_tarihi, o?.mezuniyet_yili),
        kadrosu_ile_ilgili: o ? evet(o.kadrosu_ile_ilgili) : '—',
        teknik_ogrenim: o ? evet(o.teknik_ogrenim) : '—',
        sendika: txt(sendika ? input.sendikaAd.get(sendika.sendika_id) : null),
        sendika_baslangic: tarih(sendika?.baslangic_tarihi),
        sendika_bitis: tarih(sendika?.bitis_tarihi),
        medeni_hal: txt(aile?.medeni_hal),
        es_ad: txt(aile?.esin_ad_soyad),
        es_tckn: txt(aile?.esin_tckn),
        es_is: txt(aile?.is_durumu),
        es_gelir: txt(aile?.gelir_durumu),
        cocuk_sayisi: aile ? cocukSayisi(aile.cocuklar_json) : '—',
        izin_devreden: hak ? String(hak.devreden_gun ?? 0) : '—',
        izin_hak_edilen: hak ? String(hak.hak_edilen_gun ?? 0) : '—',
        izin_kullanilan: hak ? String(hak.kullanilan_gun ?? 0) : '—',
        izin_kalan: hak ? String(hak.kalan_gun ?? 0) : '—',
        ...izinMetin,
      },
    })
  }

  for (const f of input.firmalar) {
    if (!isFirmaCalisanAktif(f.ayrilis_tarihi, D)) continue
    const ad = txt(f.ad_soyad)
    out.push({
      id: `a:${f.id}`,
      istihdam: 'adabel',
      ad: ad === '—' ? txt(f.sicil_no) : ad,
      deger: {
        sicil_no: txt(f.sicil_no),
        ad_soyad: ad,
        tckn: txt(f.tckn),
        dogum_tarihi: tarih(f.dogum_tarihi),
        cinsiyet: txt(f.cinsiyet),
        telefon: txt(f.telefon),
        e_posta: txt(f.e_posta),
        yerleske: txt(f.yerleske_adresi_id != null ? input.yerleskeAd.get(f.yerleske_adresi_id) : null),
        kuruma_giris: tarih(f.kuruma_giris_tarihi),
        statu: FIRMA_STATU_ETIKET,
        gorev_unvani: txt(f.gorevi),
        gorev_mudurlugu: txt(f.gorev_mudurlugu),
        ogrenim: txt(f.ogrenim),
        meslegi: txt(f.meslegi),
      },
    })
  }

  out.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
  return out
}
