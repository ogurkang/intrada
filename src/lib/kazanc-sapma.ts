import type { KazancPuan, TerfiKaynak } from '@/lib/terfi-ettir-hesap'

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
  derece: number
  /** Alan bazında personeldeki değer ve tanımdaki değer; eşitse `farkli: false` */
  alanlar: Record<KazancAlanKey, { mevcut: string | null; tanim: string | null; farkli: boolean }>
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

/**
 * Aktif memurların `terfi_hareketleri`'ndeki kazanç değerlerini, kadro ünvanı +
 * öğrenim + KHA derecesi için tanımlı kazanç satırıyla karşılaştırır.
 *
 * Sapma tek başına hata anlamına gelmez: kişiye özel yan ödeme/SDS farkları
 * olabileceği gibi tanımın kendisi de eskimiş olabilir. Rapor karar için veri üretir.
 */
export function kazancSapmaHesapla(
  kaynaklar: TerfiKaynak[],
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null,
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
    const alanlar = {} as KazancSapmaSatir['alanlar']
    let farkAdedi = 0
    for (const { key } of KAZANC_ALANLARI) {
      const mevcut = norm(r[key])
      const tanimDeger = norm(tanim[key])
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
