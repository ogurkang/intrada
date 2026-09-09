import type { KazancPuan, TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import {
  parseKidemYili,
  thYanOdemeKuralEtiket,
  thYanOdemeTanimdan,
  unvanSinifiThMi,
} from '@/lib/kazanc-yan-odeme'
import { parseKazancPuan, formatKazancPuan, tasinirTutarBul } from '@/lib/kazanc-tasinir-yetkili'
import { tasinirGoreviNormalize, tasinirGoreviSapmaEtiket } from '@/lib/tasinir-gorevi'

/** Kazanç tanımıyla karşılaştırılan alanlar */
export const KAZANC_ALANLARI = [
  { key: 'ek_gosterge', etiket: 'Ek Gösterge' },
  { key: 'ek_odeme', etiket: 'Ek Ödeme' },
  { key: 'oht', etiket: 'ÖHT' },
  { key: 'yan_odeme', etiket: 'Yan Ödeme' },
  { key: 'sds_orani', etiket: 'SDS' },
] as const

export type KazancAlanKey = (typeof KAZANC_ALANLARI)[number]['key']

export type KazancSapmaSatir = {
  sicil_no: string
  ad_soyad: string | null
  unvan_id: number | null
  unvan_adi: string | null
  ogrenim_turu: string | null
  /** `terfi_hareketleri.kha_derece` — kazanılmış hak aylığı derecesi */
  derece: number
  kidem_yili: string | null
  /** TH’de kıdem bandına göre hangi yan ödeme sütununun esas alındığı */
  yan_odeme_kural: string
  /** Alan bazında personeldeki değer ve tanımdaki değer; eşitse `farkli: false` */
  alanlar: Record<
    KazancAlanKey,
    { mevcut: string | null; tanim: string | null; farkli: boolean; aciklama?: string | null }
  >
  /** Tanımdan ayrışan alan sayısı */
  farkAdedi: number
}

/** Kazanç tanımı hiç bulunamayan personel (ünvan/öğrenim/derece üçlüsü tabloda yok) */
export type KazancTanimsizSatir = {
  sicil_no: string
  ad_soyad: string | null
  unvan_id: number | null
  unvan_adi: string | null
  ogrenim_turu: string | null
  /** `terfi_hareketleri.kha_derece` — okunamadıysa null */
  derece: number | null
  /** Tanımın neden aranamadığı: eksik ana veri mi, yoksa tanım mı yok */
  neden: 'unvan_yok' | 'ogrenim_yok' | 'derece_yok' | 'tanim_yok'
}

export type KazancSapmaSonuc = {
  sapanlar: KazancSapmaSatir[]
  tanimsizlar: KazancTanimsizSatir[]
  /** Tanımı bulunup karşılaştırılabilen personel sayısı */
  kontrolEdilen: number
}

function norm(v: unknown): string {
  return String(v ?? '').trim()
}

function tanimAlanDegeri(
  tanim: KazancPuan,
  key: KazancAlanKey,
  kidem: number | null,
  thMi: boolean,
): string | null {
  if (key === 'yan_odeme') return thYanOdemeTanimdan(tanim, kidem, thMi)
  return tanim[key] ?? null
}

function puanEsit(a: string, b: string): boolean {
  const na = parseKazancPuan(a)
  const nb = parseKazancPuan(b)
  if (na != null && nb != null) return na === nb
  return a === b
}

function yanOdemeSapmaKarsilastir(
  mevcutHam: string,
  tanimHam: string,
  tasinirGorevi: string | null | undefined,
  tutarByGorev: Record<string, string> | null | undefined,
): { mevcut: string | null; tanim: string | null; farkli: boolean; aciklama?: string | null } {
  const mevcut = norm(mevcutHam)
  const tanim = norm(tanimHam)
  const gorev = tasinirGoreviNormalize(tasinirGorevi)
  const ekStr = gorev ? tasinirTutarBul(gorev, tutarByGorev) : null
  const nM = parseKazancPuan(mevcut)
  const nT = parseKazancPuan(tanim)
  const nE = parseKazancPuan(ekStr)

  if (puanEsit(mevcut, tanim)) {
    if (gorev && nM != null && nE != null) {
      return {
        mevcut: formatKazancPuan(nM + nE),
        tanim: tanim || null,
        farkli: true,
        aciklama: tasinirGoreviSapmaEtiket(gorev),
      }
    }
    return { mevcut: mevcut || null, tanim: tanim || null, farkli: false }
  }

  if (gorev && nM != null && nT != null && nE != null && nM - nE === nT) {
    return {
      mevcut: mevcut || null,
      tanim: tanim || null,
      farkli: true,
      aciklama: tasinirGoreviSapmaEtiket(gorev),
    }
  }

  return { mevcut: mevcut || null, tanim: tanim || null, farkli: true }
}

export type KazancSapmaTasinirCtx = {
  tasinirGoreviBySicil: Map<string, string | null>
  tasinirTutarByGorev: Record<string, string>
}

/**
 * Aktif memurların `terfi_hareketleri`'ndeki kazanç değerlerini, kadro ünvanı +
 * öğrenim + KHA derecesi için tanımlı kazanç satırıyla karşılaştırır.
 *
 * TH sınıfında yan ödeme kıdem yılına göre seçilir: 0–4 → −5 yıl sütunu,
 * 5–25 → +5 yıl sütunu. Personeldeki mevcut değer `yan_odeme` alanıdır.
 *
 * Taşınır görevi olanlarda: personel yan ödemesinden TKY puanı düşünce tanımla
 * eşitleniyorsa (veya kadro puanı tanıma eşitken görünen toplam TKY kadar büyükse)
 * amber çerçeve kalır; açıklama `TKY Görevi` (veya kontrol yetkilisi adı) olur.
 *
 * Sapma tek başına hata anlamına gelmez: kişiye özel yan ödeme/SDS farkları
 * olabileceği gibi tanımın kendisi de eskimiş olabilir. Rapor karar için veri üretir.
 */
export function kazancSapmaHesapla(
  kaynaklar: TerfiKaynak[],
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null,
  tasinirCtx?: KazancSapmaTasinirCtx | null,
): KazancSapmaSonuc {
  const sapanlar: KazancSapmaSatir[] = []
  const tanimsizlar: KazancTanimsizSatir[] = []
  let kontrolEdilen = 0

  for (const r of kaynaklar) {
    const derece = Number.parseInt(norm(r.kha_derece), 10)
    const dereceGecerli = Number.isFinite(derece)

    if (r.unvan_id == null || r.ogrenim_id == null || !dereceGecerli) {
      tanimsizlar.push({
        sicil_no: r.sicil_no,
        ad_soyad: r.ad_soyad,
        unvan_id: r.unvan_id,
        unvan_adi: r.unvan_adi,
        ogrenim_turu: r.ogrenim_turu,
        derece: dereceGecerli ? derece : null,
        neden: r.unvan_id == null ? 'unvan_yok' : r.ogrenim_id == null ? 'ogrenim_yok' : 'derece_yok',
      })
      continue
    }

    const tanim = kazancLookup(r.unvan_id, r.ogrenim_id, derece)
    if (!tanim) {
      tanimsizlar.push({
        sicil_no: r.sicil_no,
        ad_soyad: r.ad_soyad,
        unvan_id: r.unvan_id,
        unvan_adi: r.unvan_adi,
        ogrenim_turu: r.ogrenim_turu,
        derece,
        neden: 'tanim_yok',
      })
      continue
    }

    kontrolEdilen++
    const thMi = unvanSinifiThMi(r.unvan_sinif)
    const kidem = parseKidemYili(r.kidem_yili)
    const alanlar = {} as KazancSapmaSatir['alanlar']
    let farkAdedi = 0
    for (const { key } of KAZANC_ALANLARI) {
      const mevcut = norm(r[key])
      const tanimDeger = norm(tanimAlanDegeri(tanim, key, kidem, thMi))
      if (key === 'yan_odeme') {
        const k = yanOdemeSapmaKarsilastir(
          mevcut,
          tanimDeger,
          tasinirCtx?.tasinirGoreviBySicil.get(r.sicil_no),
          tasinirCtx?.tasinirTutarByGorev,
        )
        if (k.farkli) farkAdedi++
        alanlar[key] = k
        continue
      }
      const farkli = mevcut !== tanimDeger
      if (farkli) farkAdedi++
      alanlar[key] = { mevcut: mevcut || null, tanim: tanimDeger || null, farkli }
    }
    if (farkAdedi === 0) continue

    sapanlar.push({
      sicil_no: r.sicil_no,
      ad_soyad: r.ad_soyad,
      unvan_id: r.unvan_id,
      unvan_adi: r.unvan_adi,
      ogrenim_turu: r.ogrenim_turu,
      derece,
      kidem_yili: r.kidem_yili,
      yan_odeme_kural: thYanOdemeKuralEtiket(kidem, thMi),
      alanlar,
      farkAdedi,
    })
  }

  const sicilSirala = (a: { sicil_no: string }, b: { sicil_no: string }) =>
    (Number.parseInt(a.sicil_no, 10) || 0) - (Number.parseInt(b.sicil_no, 10) || 0) ||
    a.sicil_no.localeCompare(b.sicil_no, 'tr')

  return {
    sapanlar: sapanlar.sort(sicilSirala),
    tanimsizlar: tanimsizlar.sort(sicilSirala),
    kontrolEdilen,
  }
}
