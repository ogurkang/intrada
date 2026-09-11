import type { KazancPuan, TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import {
  parseKidemYili,
  unvanSinifiThMi,
  yanOdemeKuralKisa,
  yanOdemeNotlariBirlestir,
  yanOdemeTanimdan,
} from '@/lib/kazanc-yan-odeme'
import { thYanOdemeYilSec } from '@/lib/th-hizmet-yili'
import {
  parseKazancPuan,
  formatKazancPuan,
  tasinirTutarBul,
  yanOdemeTasinirGosterimMetni,
} from '@/lib/kazanc-tasinir-yetkili'
import { tasinirGoreviNormalize, tasinirGoreviSapmaEtiket } from '@/lib/tasinir-gorevi'
import { teknisyenOgrenimUyum, type TeknisyenEkGostergeBaglam, type TeknisyenOgrenimUyum } from '@/lib/kazanc-teknisyen-ek-gosterge'
import { kazancTaniminiKuralla, terfiKaynaktanKuralOpts } from '@/lib/kazanc-kural-uygula'

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
  /** `kadro_hareketleri.kadro_derecesi` */
  kadro_derecesi: string | null
  /** `terfi_hareketleri.kha_derece` — kazanılmış hak aylığı derecesi */
  derece: number
  kidem_yili: string | null
  /** Kısa kural: Bilgisayarlı / −5 Yıl / TKY Görevi … */
  yan_odeme_kural: string
  /** Alan bazında personeldeki değer ve tanımdaki değer; eşitse `farkli: false` */
  alanlar: Record<
    KazancAlanKey,
    { mevcut: string | null; tanim: string | null; farkli: boolean; aciklama?: string | null }
  >
  /** Tanımdan ayrışan alan sayısı */
  farkAdedi: number
  /** Teknisyen yüksek öğrenim kuralı: Tekniker → uyumlu, Bilgisayar İşletmeni → uyumsuz */
  ogrenim_uyum: TeknisyenOgrenimUyum | null
  /** Tekniker + varsayılan Teknik Öğrenim tiki */
  teknik_ogrenim: boolean
}

/** Kazanç tanımı hiç bulunamayan personel (ünvan/öğrenim/derece üçlüsü tabloda yok) */
export type KazancTanimsizSatir = {
  sicil_no: string
  ad_soyad: string | null
  unvan_id: number | null
  unvan_adi: string | null
  ogrenim_turu: string | null
  /** `kadro_hareketleri.kadro_derecesi` */
  kadro_derecesi: string | null
  /** `terfi_hareketleri.kha_derece` — okunamadıysa null */
  derece: number | null
  /** Tanımın neden aranamadığı: eksik ana veri mi, yoksa tanım mı yok */
  neden: 'unvan_yok' | 'ogrenim_yok' | 'derece_yok' | 'tanim_yok'
}

export type KazancSapmaSonuc = {
  sapanlar: KazancSapmaSatir[]
  uyusanlar: KazancSapmaSatir[]
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
  unvanAdi: string | null,
  bilgisayarKullaniyor: boolean | null,
): string | null {
  if (key === 'yan_odeme') return yanOdemeTanimdan(tanim, kidem, thMi, unvanAdi, bilgisayarKullaniyor)
  return tanim[key] ?? null
}

function puanEsit(a: string, b: string): boolean {
  const na = parseKazancPuan(a)
  const nb = parseKazancPuan(b)
  if (na != null && nb != null) return na === nb
  return a === b
}

/** TKY görevi varken ekranda kadro + TKY toplamı; kayıt zaten toplam ise tekrar eklenmez. */
function yanOdemeSapmaGosterim(
  mevcut: string,
  tanim: string,
  tasinirGorevi: string | null | undefined,
  tutarByGorev: Record<string, string> | null | undefined,
): string | null {
  const nM = parseKazancPuan(mevcut)
  const nT = parseKazancPuan(tanim)
  const nE = parseKazancPuan(tasinirTutarBul(tasinirGorevi, tutarByGorev))
  if (nM != null && nE != null && nT != null && (nM === nT + nE || nM - nE === nT)) {
    return formatKazancPuan(nM)
  }
  return yanOdemeTasinirGosterimMetni(mevcut, tasinirGorevi, tutarByGorev) || mevcut || null
}

function yanOdemeSapmaKarsilastir(
  mevcutHam: string,
  tanimHam: string,
  tasinirGorevi: string | null | undefined,
  tutarByGorev: Record<string, string> | null | undefined,
  kuralKisa: string | null,
): { mevcut: string | null; tanim: string | null; farkli: boolean; aciklama?: string | null } {
  const mevcut = norm(mevcutHam)
  const tanim = norm(tanimHam)
  const gorev = tasinirGoreviNormalize(tasinirGorevi)
  const nM = parseKazancPuan(mevcut)
  const nT = parseKazancPuan(tanim)
  const nE = parseKazancPuan(gorev ? tasinirTutarBul(gorev, tutarByGorev) : null)
  const gosterilen = yanOdemeSapmaGosterim(mevcut, tanim, tasinirGorevi, tutarByGorev)
  const tkyEtiket = gorev && nE != null ? tasinirGoreviSapmaEtiket(gorev) : null
  const aciklama = yanOdemeNotlariBirlestir(kuralKisa, tkyEtiket)
  const kadroEsit = puanEsit(mevcut, tanim)
  const tkyAciklar = gorev && nM != null && nT != null && nE != null && nM - nE === nT

  if (kadroEsit || tkyAciklar) {
    return { mevcut: gosterilen, tanim: tanim || null, farkli: false, aciklama }
  }

  return { mevcut: gosterilen, tanim: tanim || null, farkli: true, aciklama }
}

export type KazancSapmaTasinirCtx = {
  tasinirGoreviBySicil: Map<string, string | null>
  tasinirTutarByGorev: Record<string, string>
}

/**
 * Aktif memurların `terfi_hareketleri`'ndeki kazanç değerlerini, kadro ünvanı +
 * öğrenim + KHA derecesi için tanımlı kazanç satırıyla karşılaştırır.
 *
 * TH: hizmet yılı 0–4 → −5 yıl, 5. yıl dönümü ve sonrası → +5 yıl
 * (tarih yoksa kıdem yılı). V.H.K.İ. / Bilgisayar İşletmeni:
 * yetkinliğe göre Bilgisayarlı veya Bilgisayarsız sütun.
 *
 * TKY görevi tanımı açıklıyorsa (kadro puanı eşit veya kayıttan TKY düşünce eşit)
 * sapma sayılmaz; uyum listesinde `TKY Görevi` etiketi durur.
 */
export function kazancSapmaHesapla(
  kaynaklar: TerfiKaynak[],
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null,
  tasinirCtx?: KazancSapmaTasinirCtx | null,
  teknisyenEkGosterge?: TeknisyenEkGostergeBaglam | null,
): KazancSapmaSonuc {
  const sapanlar: KazancSapmaSatir[] = []
  const uyusanlar: KazancSapmaSatir[] = []
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
        kadro_derecesi: r.kadro_derecesi ?? null,
        derece: dereceGecerli ? derece : null,
        neden: r.unvan_id == null ? 'unvan_yok' : r.ogrenim_id == null ? 'ogrenim_yok' : 'derece_yok',
      })
      continue
    }

    const tanimHam = kazancLookup(r.unvan_id, r.ogrenim_id, derece)
    if (!tanimHam) {
      tanimsizlar.push({
        sicil_no: r.sicil_no,
        ad_soyad: r.ad_soyad,
        unvan_id: r.unvan_id,
        unvan_adi: r.unvan_adi,
        ogrenim_turu: r.ogrenim_turu,
        kadro_derecesi: r.kadro_derecesi ?? null,
        derece,
        neden: 'tanim_yok',
      })
      continue
    }

    kontrolEdilen++
    const tanim = kazancTaniminiKuralla(tanimHam, kazancLookup, terfiKaynaktanKuralOpts(r, derece, teknisyenEkGosterge))
    const thMi = unvanSinifiThMi(r.unvan_sinif)
    const kidem = thYanOdemeYilSec({
      thMi,
      thHizmetBaslangic: r.th_hizmet_baslangic,
      kidemYili: parseKidemYili(r.kidem_yili),
    })
    const kuralKisa = yanOdemeKuralKisa(kidem, thMi, r.unvan_adi, r.bilgisayar_kullaniyor)
    const alanlar = {} as KazancSapmaSatir['alanlar']
    let farkAdedi = 0
    for (const { key } of KAZANC_ALANLARI) {
      const mevcut = norm(r[key])
      const tanimDeger = norm(
        tanimAlanDegeri(tanim, key, kidem, thMi, r.unvan_adi, r.bilgisayar_kullaniyor ?? null),
      )
      if (key === 'yan_odeme') {
        const k = yanOdemeSapmaKarsilastir(
          mevcut,
          tanimDeger,
          tasinirCtx?.tasinirGoreviBySicil.get(String(r.sicil_no).trim()),
          tasinirCtx?.tasinirTutarByGorev,
          kuralKisa,
        )
        if (k.farkli) farkAdedi++
        alanlar[key] = k
        continue
      }
      const farkli = mevcut !== tanimDeger
      if (farkli) farkAdedi++
      alanlar[key] = { mevcut: mevcut || null, tanim: tanimDeger || null, farkli }
    }

    const satir: KazancSapmaSatir = {
      sicil_no: r.sicil_no,
      ad_soyad: r.ad_soyad,
      unvan_id: r.unvan_id,
      unvan_adi: r.unvan_adi,
      ogrenim_turu: r.ogrenim_turu,
      kadro_derecesi: r.kadro_derecesi ?? null,
      derece,
      kidem_yili: r.kidem_yili,
      yan_odeme_kural: alanlar.yan_odeme.aciklama ?? kuralKisa ?? 'Yan Ödeme',
      alanlar,
      farkAdedi,
      ogrenim_uyum: teknisyenOgrenimUyum({
        unvanAdi: r.unvan_adi,
        yuksekOgrenimVar: r.yuksek_ogrenim_var,
        kadrosuIleIlgili: r.kadrosu_ile_ilgili,
      }),
      teknik_ogrenim: r.teknik_ogrenim === true,
    }

    if (farkAdedi === 0) uyusanlar.push(satir)
    else sapanlar.push(satir)
  }

  const sicilSirala = (a: { sicil_no: string }, b: { sicil_no: string }) =>
    (Number.parseInt(a.sicil_no, 10) || 0) - (Number.parseInt(b.sicil_no, 10) || 0) ||
    a.sicil_no.localeCompare(b.sicil_no, 'tr')

  return {
    sapanlar: sapanlar.sort(sicilSirala),
    uyusanlar: uyusanlar.sort(sicilSirala),
    tanimsizlar: tanimsizlar.sort(sicilSirala),
    kontrolEdilen,
  }
}
