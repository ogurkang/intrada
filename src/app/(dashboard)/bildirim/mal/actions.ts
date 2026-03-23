'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function parseJson(fd: FormData, key: string): Json {
  try {
    const raw = String(fd.get(key) ?? '[]')
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : []) as Json
  } catch { return [] }
}

function parseSonNetMaas(fd: FormData): number | null {
  const raw = fd.get('son_net_maas')
  if (raw == null || raw === '') return null
  const n = parseFloat(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function validateKimlikVeOnay(kimlik_json: Json): string | null {
  if (!Array.isArray(kimlik_json) || kimlik_json.length === 0) {
    return 'Kimlik bilgileri eksik.'
  }
  const ilk = kimlik_json[0] as Record<string, unknown>
  const ad0 = String(ilk?.ad_soyad ?? ilk?.adSoyad ?? '').trim()
  if (!ad0) return 'Bildiren kişi adı soyadı zorunludur.'
  for (let i = 1; i < kimlik_json.length; i++) {
    const r = kimlik_json[i] as Record<string, unknown>
    const ad = String(r?.ad_soyad ?? r?.adSoyad ?? '').trim()
    const y = String(r?.yakinlik ?? '').trim()
    if (!ad || !y) return `Eklenen kişi satırı ${i + 1}: ad soyad ve yakınlık zorunludur.`
  }
  return null
}

const TASINMAZ_CINS_SET = new Set(['Bina', 'Arsa', 'Arazi'])

function validateTasinmaz(kimlik_json: Json, tasinmaz_json: Json): string | null {
  const kArr = Array.isArray(kimlik_json) ? kimlik_json : []
  const kLen = kArr.length
  if (!Array.isArray(tasinmaz_json)) return 'Taşınmaz verisi geçersiz.'
  for (let i = 0; i < tasinmaz_json.length; i++) {
    const row = tasinmaz_json[i] as Record<string, unknown>
    const cins = String(row.tasinmaz_cinsi ?? row.cins ?? '').trim()
    const adres = String(row.adres ?? row.adresi ?? '').trim()
    const hisse = String(row.hisse_miktari ?? row.hissesi ?? '').trim()
    const deger = String(row.degeri ?? row.deger ?? '').trim()
    const edinme = String(row.edinme_tarihi ?? '').trim()
    const dolu = Boolean(cins || adres || hisse || deger || edinme)
    if (!dolu) continue
    if (!TASINMAZ_CINS_SET.has(cins)) {
      return `Taşınmaz satırı ${i + 1}: taşınmaz cinsi Bina, Arsa veya Arazi olmalıdır.`
    }
    if (!adres) return `Taşınmaz satırı ${i + 1}: adres zorunludur.`
    if (!hisse) return `Taşınmaz satırı ${i + 1}: hisse miktarı zorunludur.`
    if (!deger) return `Taşınmaz satırı ${i + 1}: değer zorunludur.`
    if (!edinme) return `Taşınmaz satırı ${i + 1}: edinme tarihi zorunludur.`
    const idx = Number(row.malik_kimlik_indeksi)
    if (!Number.isFinite(idx) || idx < 0 || idx >= kLen) {
      return `Taşınmaz satırı ${i + 1}: malik (kimlik satırı) geçersiz.`
    }
    const kRow = kArr[idx] as Record<string, unknown>
    const tc = String(kRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)
    if (!tc) {
      return `Taşınmaz satırı ${i + 1}: seçilen malik için kimlik satırında TCKN girilmelidir (Excel’e yazılır).`
    }
  }
  return null
}

function validateKooperatif(kimlik_json: Json, kooperatif_json: Json): string | null {
  const kArr = Array.isArray(kimlik_json) ? kimlik_json : []
  const kLen = kArr.length
  if (!Array.isArray(kooperatif_json)) return 'Kooperatif verisi geçersiz.'
  for (let i = 0; i < kooperatif_json.length; i++) {
    const row = kooperatif_json[i] as Record<string, unknown>
    const adi = String(row.adi_yeri ?? row.ad_yeri ?? row.adYeri ?? '').trim()
    const hisseD = String(row.hisse_degeri ?? row.hisseDegeri ?? '').trim()
    const uyelik = String(row.uyelik_tarihi ?? row.uyelikTarihi ?? '').trim()
    const dolu = Boolean(adi || hisseD || uyelik)
    if (!dolu) continue
    if (!adi) return `Kooperatif satırı ${i + 1}: kooperatifin adı ve yeri zorunludur.`
    if (!hisseD) return `Kooperatif satırı ${i + 1}: hisse değeri zorunludur.`
    if (!uyelik) return `Kooperatif satırı ${i + 1}: üyelik tarihi zorunludur.`
    const idx = Number(row.hissedar_kimlik_indeksi ?? row.hissedarKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0 || idx >= kLen) {
      return `Kooperatif satırı ${i + 1}: hissedar (kimlik satırı) geçersiz.`
    }
    const kRow = kArr[idx] as Record<string, unknown>
    const tc = String(kRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)
    if (!tc) {
      return `Kooperatif satırı ${i + 1}: seçilen hissedar için kimlik satırında TCKN girilmelidir (Excel’e yazılır).`
    }
  }
  return null
}

const TASIT_CINS_SET = new Set(['Kara', 'Deniz', 'Hava'])
const DIGER_TASINIR_CINS_SET = new Set(['Pul', 'Silah', 'Antika', 'Diğer'])

/** edinme_degeri: sayı veya TR metin */
function parseEdinmeDeger(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v).trim()
  if (s.includes(',')) {
    const tr = s.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(tr)
    return Number.isFinite(n) ? n : 0
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function validateTasitlar(kimlik_json: Json, tasitlar_json: Json): string | null {
  const kArr = Array.isArray(kimlik_json) ? kimlik_json : []
  const kLen = kArr.length
  if (!Array.isArray(tasitlar_json)) return 'Taşıt verisi geçersiz.'
  for (let i = 0; i < tasitlar_json.length; i++) {
    const row = tasitlar_json[i] as Record<string, unknown>
    const cins = String(row.tasit_cinsi ?? row.tasitCinsi ?? '').trim()
    const plaka = String(row.plaka_no ?? row.plakaNo ?? '').trim()
    const marka = String(row.marka_model ?? row.markaModel ?? '').trim()
    const yil = String(row.model_yili ?? row.modelYili ?? '').trim()
    const edinme = String(row.edinme_tarihi ?? '').trim()
    const dolu = Boolean(cins || plaka || marka || yil || edinme || row.edinme_degeri)
    if (!dolu) continue
    if (!TASIT_CINS_SET.has(cins)) {
      return `Taşıt satırı ${i + 1}: taşıt cinsi Kara, Deniz veya Hava olmalıdır.`
    }
    if (!plaka) return `Taşıt satırı ${i + 1}: plaka no zorunludur.`
    if (!marka) return `Taşıt satırı ${i + 1}: marka/model zorunludur.`
    if (!yil) return `Taşıt satırı ${i + 1}: model yılı zorunludur.`
    const edVal = parseEdinmeDeger(row.edinme_degeri ?? row.edinmeDegeri)
    if (!Number.isFinite(edVal) || edVal <= 0) return `Taşıt satırı ${i + 1}: geçerli edinme değeri giriniz.`
    if (!edinme) return `Taşıt satırı ${i + 1}: edinme tarihi zorunludur.`
    const idx = Number(row.sahip_kimlik_indeksi ?? row.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0 || idx >= kLen) {
      return `Taşıt satırı ${i + 1}: sahip (kimlik) seçimi geçersiz.`
    }
    const kRow = kArr[idx] as Record<string, unknown>
    const tc = String(kRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)
    if (!tc) {
      return `Taşıt satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`
    }
  }
  return null
}

const BANKA_NITELIK_SET = new Set(['Para', 'Hisse Senedi', 'Tahvil', 'Fon', 'Diğer'])
const BANKA_CINS_SET = new Set(['Türk Lirası', 'Dolar', 'Euro', 'Diğer'])

function validateBankaMenkul(kimlik_json: Json, banka_json: Json): string | null {
  const kArr = Array.isArray(kimlik_json) ? kimlik_json : []
  const kLen = kArr.length
  if (!Array.isArray(banka_json)) return 'Banka / menkul verisi geçersiz.'
  for (let i = 0; i < banka_json.length; i++) {
    const row = banka_json[i] as Record<string, unknown>
    const nitelik = String(row.nitelik ?? '').trim()
    const cins = String(row.cins ?? row.cinsi ?? '').trim()
    const miktarProbe = parseEdinmeDeger(row.miktar)
    const kurProbe = parseEdinmeDeger(row.guncel_kur ?? row.guncelKur)
    const dolu = Boolean(nitelik || cins || miktarProbe > 0 || kurProbe > 0)
    if (!dolu) continue
    if (!BANKA_NITELIK_SET.has(nitelik)) {
      return `Banka / menkul satırı ${i + 1}: nitelik geçerli değil.`
    }
    if (!BANKA_CINS_SET.has(cins)) {
      return `Banka / menkul satırı ${i + 1}: cinsi geçerli değil.`
    }
    const miktar = parseEdinmeDeger(row.miktar)
    const kur = parseEdinmeDeger(row.guncel_kur ?? row.guncelKur)
    if (!Number.isFinite(miktar) || miktar <= 0) {
      return `Banka / menkul satırı ${i + 1}: geçerli miktar giriniz.`
    }
    if (!Number.isFinite(kur) || kur <= 0) {
      return `Banka / menkul satırı ${i + 1}: geçerli güncel kur giriniz.`
    }
    const idx = Number(row.sahip_kimlik_indeksi ?? row.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0 || idx >= kLen) {
      return `Banka / menkul satırı ${i + 1}: sahip (kimlik) seçimi geçersiz.`
    }
    const kRow = kArr[idx] as Record<string, unknown>
    const tc = String(kRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)
    if (!tc) {
      return `Banka / menkul satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`
    }
  }
  return null
}

const ALTIN_CINSI_SET = new Set(['Altın', 'Mücevher', 'Diğer'])
const ALTIN_TURU_SET = new Set([
  'Gram',
  'Çeyrek',
  'Yarım',
  'Tam',
  'Reşat',
  'Cumhuriyet',
  'Bilezik',
  'Tektaş',
  'Diğer',
])

function validateAltinMucevher(kimlik_json: Json, altin_json: Json): string | null {
  const kArr = Array.isArray(kimlik_json) ? kimlik_json : []
  const kLen = kArr.length
  if (!Array.isArray(altin_json)) return 'Altın / mücevher verisi geçersiz.'
  for (let i = 0; i < altin_json.length; i++) {
    const row = altin_json[i] as Record<string, unknown>
    const cinsi = String(row.cinsi ?? row.cins ?? '').trim()
    const turu = String(row.turu ?? row.tur ?? '').trim()
    const miktarProbe = parseEdinmeDeger(row.miktar)
    const kurProbe = parseEdinmeDeger(row.guncel_kur ?? row.guncelKur)
    const dolu = Boolean(cinsi || turu || miktarProbe > 0 || kurProbe > 0)
    if (!dolu) continue
    if (!ALTIN_CINSI_SET.has(cinsi)) {
      return `Altın / mücevher satırı ${i + 1}: cinsi geçerli değil.`
    }
    if (!ALTIN_TURU_SET.has(turu)) {
      return `Altın / mücevher satırı ${i + 1}: türü geçerli değil.`
    }
    const miktar = parseEdinmeDeger(row.miktar)
    const kur = parseEdinmeDeger(row.guncel_kur ?? row.guncelKur)
    if (!Number.isFinite(miktar) || miktar <= 0) {
      return `Altın / mücevher satırı ${i + 1}: geçerli miktar giriniz.`
    }
    if (!Number.isFinite(kur) || kur <= 0) {
      return `Altın / mücevher satırı ${i + 1}: geçerli güncel kur giriniz.`
    }
    const idx = Number(row.sahip_kimlik_indeksi ?? row.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0 || idx >= kLen) {
      return `Altın / mücevher satırı ${i + 1}: sahip (kimlik) seçimi geçersiz.`
    }
    const kRow = kArr[idx] as Record<string, unknown>
    const tc = String(kRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)
    if (!tc) {
      return `Altın / mücevher satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`
    }
  }
  return null
}

const BORC_BIRIM_SET = new Set(['Türk Lirası', 'Dolar', 'Euro', 'Diğer'])

function validateBorcAlacak(borc_json: Json): string | null {
  if (!Array.isArray(borc_json)) return 'Borç / alacak verisi geçersiz.'
  for (let i = 0; i < borc_json.length; i++) {
    const row = borc_json[i] as Record<string, unknown>
    const borclu = String(row.borclu ?? row.borclu_adi_soyad ?? '').trim()
    const alacakli = String(row.alacakli ?? row.alacakli_adi_soyad ?? '').trim()
    const birim = String(row.birimi ?? '').trim()
    const miktarProbe = parseEdinmeDeger(row.miktar)
    const kurProbe = parseEdinmeDeger(row.guncel_kur ?? row.guncelKur)
    const dolu = Boolean(borclu || alacakli || birim || miktarProbe > 0 || kurProbe > 0)
    if (!dolu) continue
    if (!borclu) return `Borç / alacak satırı ${i + 1}: borçlunun adı soyadı zorunludur.`
    if (!alacakli) return `Borç / alacak satırı ${i + 1}: alacaklının adı soyadı zorunludur.`
    if (!BORC_BIRIM_SET.has(birim)) return `Borç / alacak satırı ${i + 1}: birim geçerli değil.`
    const miktar = parseEdinmeDeger(row.miktar)
    const kur = parseEdinmeDeger(row.guncel_kur ?? row.guncelKur)
    if (!Number.isFinite(miktar) || miktar <= 0) {
      return `Borç / alacak satırı ${i + 1}: geçerli miktar giriniz.`
    }
    if (!Number.isFinite(kur) || kur <= 0) {
      return `Borç / alacak satırı ${i + 1}: geçerli güncel kur giriniz.`
    }
  }
  return null
}

function validateHaklar(kimlik_json: Json, haklar_json: Json): string | null {
  const kArr = Array.isArray(kimlik_json) ? kimlik_json : []
  const kLen = kArr.length
  if (!Array.isArray(haklar_json)) return 'Haklar / diğer unsurlar verisi geçersiz.'
  for (let i = 0; i < haklar_json.length; i++) {
    const row = haklar_json[i] as Record<string, unknown>
    const unsur = String(row.unsur ?? row.tanim ?? row.tur ?? '').trim()
    const edinme = String(row.edinme_sekli ?? row.edinmeSekli ?? row.edinme ?? '').trim()
    const dolu = Boolean(unsur || edinme)
    if (!dolu) continue
    if (!unsur) {
      return `Haklar / diğer unsurlar satırı ${i + 1}: hak veya beyanı gerekli görülen diğer servet unsurları zorunludur.`
    }
    if (!edinme) {
      return `Haklar / diğer unsurlar satırı ${i + 1}: edinme şekli zorunludur.`
    }
    const idx = Number(row.sahip_kimlik_indeksi ?? row.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0 || idx >= kLen) {
      return `Haklar / diğer unsurlar satırı ${i + 1}: sahip (kimlik) seçimi geçersiz.`
    }
    const kRow = kArr[idx] as Record<string, unknown>
    const tc = String(kRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)
    if (!tc) {
      return `Haklar / diğer unsurlar satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`
    }
  }
  return null
}

function validateDigerTasinir(kimlik_json: Json, diger_json: Json): string | null {
  const kArr = Array.isArray(kimlik_json) ? kimlik_json : []
  const kLen = kArr.length
  if (!Array.isArray(diger_json)) return 'Diğer taşınır verisi geçersiz.'
  for (let i = 0; i < diger_json.length; i++) {
    const row = diger_json[i] as Record<string, unknown>
    const cinsi = String(row.tasinir_cinsi ?? row.tasinirCinsi ?? '').trim()
    const yil = String(row.model_yili ?? row.modelYili ?? '').trim()
    const edinme = String(row.edinme_tarihi ?? '').trim()
    const dolu = Boolean(cinsi || yil || edinme || row.edinme_degeri)
    if (!dolu) continue
    if (!DIGER_TASINIR_CINS_SET.has(cinsi)) {
      return `Diğer taşınır satırı ${i + 1}: cins Pul, Silah, Antika veya Diğer olmalıdır.`
    }
    if (!yil) return `Diğer taşınır satırı ${i + 1}: model yılı zorunludur.`
    const edVal = parseEdinmeDeger(row.edinme_degeri ?? row.edinmeDegeri)
    if (!Number.isFinite(edVal) || edVal <= 0) return `Diğer taşınır satırı ${i + 1}: geçerli edinme değeri giriniz.`
    if (!edinme) return `Diğer taşınır satırı ${i + 1}: edinme tarihi zorunludur.`
    const idx = Number(row.sahip_kimlik_indeksi ?? row.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0 || idx >= kLen) {
      return `Diğer taşınır satırı ${i + 1}: sahip (kimlik) seçimi geçersiz.`
    }
    const kRow = kArr[idx] as Record<string, unknown>
    const tc = String(kRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)
    if (!tc) {
      return `Diğer taşınır satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`
    }
  }
  return null
}

export async function malBildirimEkle(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Personel (sicil) zorunludur.' }

  const son_net_maas = parseSonNetMaas(fd)
  if (son_net_maas == null || son_net_maas <= 0) return { hata: 'Geçerli net maaş giriniz.' }

  const beyan_turu = str(fd, 'beyan_turu')
  const onay_tarihi = str(fd, 'onay_tarihi')
  if (!beyan_turu) return { hata: 'Beyan türü seçiniz.' }
  if (!onay_tarihi) return { hata: 'Onay tarihi seçiniz.' }

  const kimlik_json = parseJson(fd, 'kimlik_json')
  const kimlikHata = validateKimlikVeOnay(kimlik_json)
  if (kimlikHata) return { hata: kimlikHata }

  const tasinmaz_json = parseJson(fd, 'tasinmaz_json')
  const tasinmHata = validateTasinmaz(kimlik_json, tasinmaz_json)
  if (tasinmHata) return { hata: tasinmHata }

  const kooperatif_json = parseJson(fd, 'kooperatif_json')
  const koopHata = validateKooperatif(kimlik_json, kooperatif_json)
  if (koopHata) return { hata: koopHata }

  const tasitlar_json = parseJson(fd, 'tasitlar_json')
  const tasitHata = validateTasitlar(kimlik_json, tasitlar_json)
  if (tasitHata) return { hata: tasitHata }

  const diger_tasinirlar_json = parseJson(fd, 'diger_tasinirlar_json')
  const digerHata = validateDigerTasinir(kimlik_json, diger_tasinirlar_json)
  if (digerHata) return { hata: digerHata }

  const banka_menkul_json = parseJson(fd, 'banka_menkul_json')
  const bankaHata = validateBankaMenkul(kimlik_json, banka_menkul_json)
  if (bankaHata) return { hata: bankaHata }

  const altin_mucevher_json = parseJson(fd, 'altin_mucevher_json')
  const altinHata = validateAltinMucevher(kimlik_json, altin_mucevher_json)
  if (altinHata) return { hata: altinHata }

  const borc_alacak_json = parseJson(fd, 'borc_alacak_json')
  const borcHata = validateBorcAlacak(borc_alacak_json)
  if (borcHata) return { hata: borcHata }

  const haklar_json = parseJson(fd, 'haklar_json')
  const haklarHata = validateHaklar(kimlik_json, haklar_json)
  if (haklarHata) return { hata: haklarHata }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access) && access.mode === 'kullanici') {
    if (String(access.sicilNo).trim() !== String(sicil_no).trim()) {
      return { hata: 'Yalnızca kendi siciliniz için beyan ekleyebilirsiniz.' }
    }
  }

  const { data: kh } = await supabase
    .from('kadro_hareketleri')
    .select('asil, statu, durumu')
    .eq('durumu', 'Dolu')
    .eq('asil', sicil_no)
    .limit(5)

  const memurMu = (kh ?? []).some(
    r => String(r.statu ?? '').trim().toLowerCase() === 'memur',
  )
  if (!memurMu) return { hata: 'Bu personel memur kadrosunda (dolu) görünmüyor.' }

  const { error } = await supabase.from('mal_bildirimi').insert({
    sicil_no,
    son_net_maas,
    beyan_turu,
    onay_tarihi,
    aciklama: str(fd, 'aciklama'),
    kimlik_json,
    tasinmaz_json,
    kooperatif_json,
    tasitlar_json,
    diger_tasinirlar_json,
    banka_menkul_json,
    altin_mucevher_json,
    borc_alacak_json,
    haklar_json,
  })

  if (error) return { hata: error.message }
  revalidatePath('/bildirim/mal')
  return {}
}

/** Ekleme ile aynı alanlar (kimlik, açıklama, onay, net maaş); sicil değişmez. */
export async function malBildirimGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const son_net_maas = parseSonNetMaas(fd)
  if (son_net_maas == null || son_net_maas <= 0) return { hata: 'Geçerli net maaş giriniz.' }

  const beyan_turu = str(fd, 'beyan_turu')
  const onay_tarihi = str(fd, 'onay_tarihi')
  if (!beyan_turu) return { hata: 'Beyan türü seçiniz.' }
  if (!onay_tarihi) return { hata: 'Onay tarihi seçiniz.' }

  const kimlik_json = parseJson(fd, 'kimlik_json')
  const kimlikHata = validateKimlikVeOnay(kimlik_json)
  if (kimlikHata) return { hata: kimlikHata }

  const tasinmaz_json = parseJson(fd, 'tasinmaz_json')
  const tasinmHata = validateTasinmaz(kimlik_json, tasinmaz_json)
  if (tasinmHata) return { hata: tasinmHata }

  const kooperatif_json = parseJson(fd, 'kooperatif_json')
  const koopHata = validateKooperatif(kimlik_json, kooperatif_json)
  if (koopHata) return { hata: koopHata }

  const tasitlar_json = parseJson(fd, 'tasitlar_json')
  const tasitHata = validateTasitlar(kimlik_json, tasitlar_json)
  if (tasitHata) return { hata: tasitHata }

  const diger_tasinirlar_json = parseJson(fd, 'diger_tasinirlar_json')
  const digerHata = validateDigerTasinir(kimlik_json, diger_tasinirlar_json)
  if (digerHata) return { hata: digerHata }

  const banka_menkul_json = parseJson(fd, 'banka_menkul_json')
  const bankaHata = validateBankaMenkul(kimlik_json, banka_menkul_json)
  if (bankaHata) return { hata: bankaHata }

  const altin_mucevher_json = parseJson(fd, 'altin_mucevher_json')
  const altinHata = validateAltinMucevher(kimlik_json, altin_mucevher_json)
  if (altinHata) return { hata: altinHata }

  const borc_alacak_json = parseJson(fd, 'borc_alacak_json')
  const borcHata = validateBorcAlacak(borc_alacak_json)
  if (borcHata) return { hata: borcHata }

  const haklar_json = parseJson(fd, 'haklar_json')
  const haklarHata = validateHaklar(kimlik_json, haklar_json)
  if (haklarHata) return { hata: haklarHata }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  const { data: mevcutRow } = await supabase.from('mal_bildirimi').select('sicil_no').eq('id', id).maybeSingle()
  if (!mevcutRow) return { hata: 'Kayıt bulunamadı.' }
  if (!isAdminLike(access) && access.mode === 'kullanici') {
    if (String(access.sicilNo).trim() !== String(mevcutRow.sicil_no).trim()) {
      return { hata: 'Bu kaydı güncelleme yetkiniz yok.' }
    }
  }

  const { data: pubRow } = await supabase.from('mal_bildirimi').select('public_id').eq('id', id).maybeSingle()
  const urlSeg = pubRow?.public_id ? String(pubRow.public_id) : String(id)

  const { error } = await supabase
    .from('mal_bildirimi')
    .update({
      son_net_maas,
      beyan_turu,
      onay_tarihi,
      aciklama: str(fd, 'aciklama'),
      kimlik_json,
      tasinmaz_json,
      kooperatif_json,
      tasitlar_json,
      diger_tasinirlar_json,
      banka_menkul_json,
      altin_mucevher_json,
      borc_alacak_json,
      haklar_json,
    })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath('/bildirim/mal')
  revalidatePath(`/bildirim/mal/${urlSeg}`)
  revalidatePath(`/bildirim/mal/${urlSeg}/duzenle`)
  revalidatePath(`/link/${urlSeg}`)
  return {}
}

export async function malBildirimSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  const { data: row } = await supabase.from('mal_bildirimi').select('sicil_no').eq('id', id).maybeSingle()
  if (!row) return { hata: 'Kayıt bulunamadı.' }
  if (!isAdminLike(access) && access.mode === 'kullanici') {
    if (String(access.sicilNo).trim() !== String(row.sicil_no).trim()) {
      return { hata: 'Bu kaydı silme yetkiniz yok.' }
    }
  }
  const { error } = await supabase.from('mal_bildirimi').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/mal')
  return {}
}
