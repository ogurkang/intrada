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
import { OZEL_KALEM_KAZANC_DERECE, unvanKazancBirinciDereceMi } from '@/lib/kazanc-ozel-kalem'
import { yuruttuguUnvanSdsAl } from '@/lib/kazanc-yuruttugu-unvan'
import { vekilMudurFarkHesapla } from '@/lib/kazanc-vekil-mudur-fark'

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
  /** Özel Kalem / Başkan Yardımcısı: kazanç 1. derece tanımından */
  kazanc_derece_kural: string | null
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
  /** Teknisyen yüksek öğrenim kuralı: kariyer ÖHT/yan ödeme → uyumlu, Bilgisayar İşletmeni ek gösterge → uyumsuz */
  ogrenim_uyum: TeknisyenOgrenimUyum | null
  /** Tekniker + varsayılan Teknik Öğrenim tiki */
  teknik_ogrenim: boolean
  kadro_rolu?: 'Asil' | 'Vekil' | null
  satir_id?: string
  vekil_mudur_fark_mi?: boolean
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
  neden: 'unvan_yok' | 'ogrenim_yok' | 'derece_yok' | 'tanim_yok' | 'vekil_fark_tanim_yok'
  nedenAciklama: string
  kadro_rolu?: 'Asil' | 'Vekil' | null
  satir_id?: string
  vekil_mudur_fark_mi?: boolean
}

export function kazancTanimsizNedenAcikla(t: {
  neden: KazancTanimsizSatir['neden']
  unvan_adi: string | null
  ogrenim_turu: string | null
  kadro_derecesi: string | null
  derece: number | null
  kadro_rolu?: 'Asil' | 'Vekil' | null
  vekil_mudur_fark_mi?: boolean
}): string {
  const unvan = String(t.unvan_adi ?? '').trim() || 'ünvan yok'
  const ogrenim = String(t.ogrenim_turu ?? '').trim() || 'öğrenim yok'
  const kadro = String(t.kadro_derecesi ?? '').trim() || '—'
  const kha = t.derece != null ? String(t.derece) : '—'
  const rol = t.kadro_rolu ? `${t.kadro_rolu} satırında ` : ''
  switch (t.neden) {
    case 'unvan_yok':
      return `${rol}kadro unvanı kazanç tanımı tablosundaki unvanlarla eşleşmedi (${unvan}). Tanımlar › Unvan / kadro hareketi unvan id’si boş.`
    case 'ogrenim_yok':
      return `${rol}aktif öğrenim kaydı kazanç öğrenim listesiyle eşleşmedi (${ogrenim}). Personel › Öğrenim; Tanımlar › Öğrenim.`
    case 'derece_yok':
      return `${rol}KHA derecesi okunamadı; kazanç satırı dereceye bakılarak aranamıyor. Terfi › Terfi Bilgileri › KHA.`
    case 'vekil_fark_tanim_yok':
      return `${rol}vekil müdür farkı hesaplanamadı: asil unvan veya «${unvan}» + «${ogrenim}» + KHA ${kha}. derece kazanç tanımı eksik. Tanımlar › Kazanç Bilgileri.`
    default:
      return `${rol}«${unvan}» + «${ogrenim}» + KHA ${kha}. derece (kadro ${kadro}) için Tanımlar › Kazanç Bilgileri satırı yok.`
  }
}

function tanimsizSatir(
  r: TerfiKaynak,
  kha: number | null,
  derece: number | null,
  neden: KazancTanimsizSatir['neden'],
): KazancTanimsizSatir {
  const base = {
    sicil_no: r.sicil_no,
    ad_soyad: r.ad_soyad,
    unvan_id: r.unvan_id,
    unvan_adi: r.unvan_adi,
    ogrenim_turu: r.ogrenim_turu,
    kadro_derecesi: r.kadro_derecesi ?? null,
    derece: kha,
    neden,
    kadro_rolu: r.kadro_rolu ?? null,
    satir_id: r.satir_id,
    vekil_mudur_fark_mi: r.vekil_mudur_fark_mi === true,
  }
  return { ...base, nedenAciklama: kazancTanimsizNedenAcikla({ ...base, derece: kha ?? derece }) }
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
    const kha = Number.parseInt(norm(r.kha_derece), 10)
    const khaGecerli = Number.isFinite(kha)
    const birinciDerece = unvanKazancBirinciDereceMi(r.unvan_adi)
    const dereceGecerli = birinciDerece || khaGecerli
    const derece = birinciDerece ? OZEL_KALEM_KAZANC_DERECE : kha
    const kazancDereceKural = birinciDerece ? 'Kazanç: 1. derece' : null

    if (r.unvan_id == null || r.ogrenim_id == null || !dereceGecerli) {
      tanimsizlar.push(
        tanimsizSatir(
          r,
          khaGecerli ? kha : null,
          khaGecerli ? kha : null,
          r.unvan_id == null ? 'unvan_yok' : r.ogrenim_id == null ? 'ogrenim_yok' : 'derece_yok',
        ),
      )
      continue
    }

    const khaKural = khaGecerli ? kha : derece
    let tanim: KazancPuan
    let vekilFarkKural: string | null = null
    let vekilKendiEg: string | null = null

    if (r.vekil_mudur_fark_mi) {
      const fark = vekilMudurFarkHesapla({
        lookup: kazancLookup,
        khaDerece: khaKural,
        kendiOpts: terfiKaynaktanKuralOpts(
          {
            unvan_id: r.asil_unvan_id ?? null,
            ogrenim_id: r.ogrenim_id,
            unvan_adi: r.asil_unvan_adi ?? null,
            kadro_derecesi: r.asil_kadro_derecesi ?? null,
            kha_derece: r.kha_derece,
            yuksek_ogrenim_var: r.yuksek_ogrenim_var,
            kadrosu_ile_ilgili: r.kadrosu_ile_ilgili,
            teknisyen_kariyer: r.teknisyen_kariyer ?? null,
            teknik_ogrenim: r.teknik_ogrenim,
            asil_mi: true,
            destek_yardimci_birim: r.asil_destek_yardimci_birim === true,
            ogrenim_meslegi: r.ogrenim_meslegi,
            ogrenim_bolum: r.ogrenim_bolum,
          },
          khaKural,
          teknisyenEkGosterge,
        ),
        mudurOpts: terfiKaynaktanKuralOpts({ ...r, asil_mi: true }, khaKural, teknisyenEkGosterge),
        yanCtx: {
          kidemYili: r.kidem_yili,
          thHizmetBaslangic: r.th_hizmet_baslangic,
          bilgisayarKullaniyor: r.bilgisayar_kullaniyor,
          kendiSinif: r.asil_unvan_sinif ?? null,
          mudurSinif: r.unvan_sinif,
        },
      })
      if (!fark) {
        tanimsizlar.push(
          tanimsizSatir(r, khaGecerli ? kha : derece, khaGecerli ? kha : derece, 'vekil_fark_tanim_yok'),
        )
        continue
      }
      tanim = fark.fark
      vekilKendiEg = fark.kendi.ek_gosterge
      vekilFarkKural = 'Vekalet farkı (ek ödeme / ÖHT / yan ödeme / SDS; ek gösterge hariç)'
      kontrolEdilen++
    } else {
      const tanimHam = kazancLookup(r.unvan_id, r.ogrenim_id, derece)
      if (!tanimHam) {
        tanimsizlar.push(tanimsizSatir(r, khaGecerli ? kha : derece, khaGecerli ? kha : derece, 'tanim_yok'))
        continue
      }
      kontrolEdilen++
      tanim = kazancTaniminiKuralla(
        tanimHam,
        kazancLookup,
        terfiKaynaktanKuralOpts(r, khaKural, teknisyenEkGosterge),
      )
    }
    const thMi = unvanSinifiThMi(r.unvan_sinif)
    const kidem = thYanOdemeYilSec({
      thMi,
      thHizmetBaslangic: r.th_hizmet_baslangic,
      kidemYili: parseKidemYili(r.kidem_yili),
    })
    const kuralKisa = vekilFarkKural ?? yanOdemeKuralKisa(kidem, thMi, r.unvan_adi, r.bilgisayar_kullaniyor)
    const yurutSds = yuruttuguUnvanSdsAl(kazancLookup, {
      yuruttuguUnvanId: r.yuruttugu_unvan_id,
      ogrenimId: r.ogrenim_id,
      derece: khaKural,
    })
    const yurutAd = String(r.yuruttugu_unvan_adi ?? '').trim() || null
    const alanlar = {} as KazancSapmaSatir['alanlar']
    let farkAdedi = 0
    for (const { key } of KAZANC_ALANLARI) {
      const mevcut = norm(r[key])
      if (key === 'ek_gosterge' && vekilFarkKural) {
        alanlar[key] = {
          mevcut: 'fark yok',
          tanim: vekilKendiEg || 'fark yok',
          farkli: false,
          aciklama: 'Kendi unvan / kadro derecesi (asil satır); vekalet farkına girmez',
        }
        continue
      }
      const tanimDeger = vekilFarkKural
        ? norm(tanim[key])
        : norm(tanimAlanDegeri(tanim, key, kidem, thMi, r.unvan_adi, r.bilgisayar_kullaniyor ?? null))
      if (key === 'yan_odeme') {
        const k = yanOdemeSapmaKarsilastir(
          mevcut,
          tanimDeger,
          vekilFarkKural ? null : tasinirCtx?.tasinirGoreviBySicil.get(String(r.sicil_no).trim()),
          vekilFarkKural ? undefined : tasinirCtx?.tasinirTutarByGorev,
          kuralKisa,
        )
        if (k.farkli) farkAdedi++
        alanlar[key] = k
        continue
      }
      if (key === 'sds_orani' && !vekilFarkKural) {
        const hedef = r.yuruttugu_unvan_id != null ? (yurutSds ?? '') : tanimDeger
        const farkli = !puanEsit(mevcut.replace(/%/g, ''), (hedef ?? '').replace(/%/g, ''))
        if (farkli) farkAdedi++
        alanlar[key] = {
          mevcut: mevcut || null,
          tanim: hedef || null,
          farkli,
          aciklama: yurutAd,
        }
        continue
      }
      const farkli = !puanEsit(mevcut.replace(/%/g, ''), tanimDeger.replace(/%/g, ''))
      if (farkli) farkAdedi++
      alanlar[key] = {
        mevcut: mevcut || null,
        tanim: tanimDeger || null,
        farkli,
        aciklama: vekilFarkKural || undefined,
      }
    }

    const satir: KazancSapmaSatir = {
      sicil_no: r.sicil_no,
      ad_soyad: r.ad_soyad,
      unvan_id: r.unvan_id,
      unvan_adi: r.unvan_adi,
      ogrenim_turu: r.ogrenim_turu,
      kadro_derecesi: r.kadro_derecesi ?? null,
      derece: khaGecerli ? kha : derece,
      kazanc_derece_kural: vekilFarkKural ?? kazancDereceKural,
      kidem_yili: r.kidem_yili,
      yan_odeme_kural: alanlar.yan_odeme.aciklama ?? kuralKisa ?? 'Yan Ödeme',
      alanlar,
      farkAdedi,
      ogrenim_uyum: teknisyenOgrenimUyum({
        unvanAdi: r.unvan_adi,
        yuksekOgrenimVar: r.yuksek_ogrenim_var,
        kadrosuIleIlgili: r.kadrosu_ile_ilgili,
        teknisyenKariyer: r.teknisyen_kariyer ?? null,
      }),
      teknik_ogrenim: r.teknik_ogrenim === true,
      kadro_rolu: r.kadro_rolu ?? null,
      satir_id: r.satir_id,
      vekil_mudur_fark_mi: r.vekil_mudur_fark_mi === true,
    }

    if (farkAdedi === 0) uyusanlar.push(satir)
    else sapanlar.push(satir)
  }

  const sicilSirala = (
    a: { sicil_no: string; kadro_rolu?: string | null },
    b: { sicil_no: string; kadro_rolu?: string | null },
  ) =>
    (Number.parseInt(a.sicil_no, 10) || 0) - (Number.parseInt(b.sicil_no, 10) || 0) ||
    a.sicil_no.localeCompare(b.sicil_no, 'tr') ||
    (a.kadro_rolu === 'Asil' ? 0 : 1) - (b.kadro_rolu === 'Asil' ? 0 : 1)

  return {
    sapanlar: sapanlar.sort(sicilSirala),
    uyusanlar: uyusanlar.sort(sicilSirala),
    tanimsizlar: tanimsizlar.sort(sicilSirala),
    kontrolEdilen,
  }
}
