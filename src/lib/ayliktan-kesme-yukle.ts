import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchAllCalisan } from '@/lib/supabase-sayfala'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import type { TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import { kazancTaniminiKuralla, terfiKaynaktanKuralOpts } from '@/lib/kazanc-kural-uygula'
import { OZEL_KALEM_KAZANC_DERECE, unvanKazancBirinciDereceMi } from '@/lib/kazanc-ozel-kalem'
import { parseKidemYili, unvanSinifiThMi, yanOdemeTanimdan } from '@/lib/kazanc-yan-odeme'
import { parseKazancPuan } from '@/lib/kazanc-tasinir-yetkili'
import { thYanOdemeYilSec } from '@/lib/th-hizmet-yili'
import { kazancTanimsizNedenAcikla } from '@/lib/kazanc-sapma'
import { yarimZamanliOdemeDurumu, type AyliktanKesmeKaynak } from '@/lib/ayliktan-kesme-hesap'

export type AyliktanKesmeAday = {
  sicil_no: string
  ad_soyad: string
  unvan: string
}

type Db = SupabaseClient<Database>

function tamSayi(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.trunc(raw) : null
  const n = parseKazancPuan(raw)
  return n == null ? null : Math.trunc(n)
}

function kadroMudurlugu(
  rows: {
    gorev_mudurlugu: string | null
    kadro_mudurlugu: string | null
    durumu: string | null
    ayrilis_tarihi: string | null
  }[],
): string {
  const d = new Date()
  const bugun = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const aktif = rows.filter(r => {
    const ayrilis = String(r.ayrilis_tarihi ?? '').slice(0, 10)
    return (!ayrilis || ayrilis > bugun) && String(r.durumu ?? '').trim() === 'Dolu'
  })
  for (const r of aktif.length ? aktif : rows) {
    const ad = String(r.gorev_mudurlugu ?? '').trim() || String(r.kadro_mudurlugu ?? '').trim()
    if (ad) return ad
  }
  return ''
}

function asilKaynak(kaynaklar: TerfiKaynak[], sicil: string): TerfiKaynak | null {
  return (
    kaynaklar.find(
      k => k.sicil_no.trim() === sicil && k.kadro_rolu === 'Asil' && k.vekil_mudur_fark_mi !== true,
    ) ?? null
  )
}

function kazancKalemleri(
  r: TerfiKaynak,
  lookup: (unvanId: number, ogrenimId: number, derece: number) => { ek_gosterge: string | null; oht: string | null; yan_odeme: string | null; yan_odeme_eksi5: string | null; yan_odeme_bilgisayarsiz?: string | null } | null,
  baglam: Parameters<typeof terfiKaynaktanKuralOpts>[2],
): { ek: number; oht: number; yan: number } | { hata: string } {
  const kha = Number.parseInt(String(r.kha_derece ?? '').trim(), 10)
  const khaGecerli = Number.isFinite(kha)
  const birinciDerece = unvanKazancBirinciDereceMi(r.unvan_adi)
  const derece = birinciDerece ? OZEL_KALEM_KAZANC_DERECE : kha
  if (r.unvan_id == null || r.ogrenim_id == null || (!birinciDerece && !khaGecerli)) {
    return {
      hata: kazancTanimsizNedenAcikla({
        neden: r.unvan_id == null ? 'unvan_yok' : r.ogrenim_id == null ? 'ogrenim_yok' : 'derece_yok',
        unvan_adi: r.unvan_adi,
        ogrenim_turu: r.ogrenim_turu,
        kadro_derecesi: r.kadro_derecesi,
        derece: khaGecerli ? kha : null,
        kadro_rolu: 'Asil',
      }),
    }
  }
  const ham = lookup(r.unvan_id, r.ogrenim_id, derece)
  if (!ham) {
    return {
      hata: kazancTanimsizNedenAcikla({
        neden: 'tanim_yok',
        unvan_adi: r.unvan_adi,
        ogrenim_turu: r.ogrenim_turu,
        kadro_derecesi: r.kadro_derecesi,
        derece,
        kadro_rolu: 'Asil',
      }),
    }
  }
  const khaKural = khaGecerli ? kha : derece
  const tanim = kazancTaniminiKuralla(ham, lookup, terfiKaynaktanKuralOpts(r, khaKural, baglam))
  const thMi = unvanSinifiThMi(r.unvan_sinif)
  const yanYil = thYanOdemeYilSec({
    thMi,
    thHizmetBaslangic: r.th_hizmet_baslangic,
    kidemYili: parseKidemYili(r.kidem_yili),
  })
  return {
    ek: Math.max(tamSayi(tanim.ek_gosterge) ?? 0, 0),
    oht: Math.max(tamSayi(tanim.oht) ?? 0, 0),
    yan: Math.max(tamSayi(yanOdemeTanimdan(tanim, yanYil, thMi, r.unvan_adi, r.bilgisayar_kullaniyor)) ?? 0, 0),
  }
}

function kaynakKur(
  r: TerfiKaynak,
  tckn: string,
  mudurluk: string,
  yarim: { uygulanir: boolean; not: string | null },
  kalem: { ek: number; oht: number; yan: number },
): AyliktanKesmeKaynak | { hata: string } {
  const derece = tamSayi(r.kha_derece)
  const kademe = tamSayi(r.kha_kademe)
  const kidem = tamSayi(r.kidem_yili)
  if (derece == null || kademe == null) {
    return { hata: 'Asıl terfi kaydında KHA derece veya kademe yok.' }
  }
  if (kidem == null || kidem < 0) {
    return { hata: 'Asıl terfi kaydında kıdem yılı yok.' }
  }
  return {
    sicil_no: r.sicil_no.trim(),
    ad_soyad: String(r.ad_soyad ?? '').trim() || r.sicil_no.trim(),
    tckn: tckn.trim(),
    unvan: String(r.unvan_adi ?? '').trim(),
    mudurluk: mudurluk.trim(),
    yarim_zamanli: yarim.uygulanir,
    yarim_zamanli_not: yarim.not,
    derece,
    kademe,
    ek_gosterge: kalem.ek,
    oht_orani: kalem.oht,
    yan_odeme_gostergesi: kalem.yan,
    kidem_yili: kidem,
  }
}

export async function ayliktanKesmeAdaylari(
  supabase: Db,
): Promise<{ adaylar: AyliktanKesmeAday[]; hata?: string }> {
  const { kaynaklar } = await yukleTerfiEttirKaynakVeKazanc(supabase)
  const adaylar: AyliktanKesmeAday[] = []
  for (const k of kaynaklar) {
    if (k.kadro_rolu !== 'Asil' || k.vekil_mudur_fark_mi === true) continue
    if (tamSayi(k.kha_derece) == null || tamSayi(k.kha_kademe) == null) continue
    adaylar.push({
      sicil_no: k.sicil_no.trim(),
      ad_soyad: String(k.ad_soyad ?? '').trim() || k.sicil_no.trim(),
      unvan: String(k.unvan_adi ?? '').trim(),
    })
  }
  adaylar.sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr') || a.sicil_no.localeCompare(b.sicil_no, 'tr'))
  return { adaylar }
}

export async function ayliktanKesmeKaynakGetir(
  supabase: Db,
  sicilNo: string,
): Promise<{ kaynak?: AyliktanKesmeKaynak; hata?: string }> {
  const sicil = sicilNo.trim()
  if (!sicil) return { hata: 'Personel seçin.' }

  const [{ kaynaklar, kazancLookup, teknisyenEkGosterge }, calisanRes, kadroRes] = await Promise.all([
    yukleTerfiEttirKaynakVeKazanc(supabase),
    fetchAllCalisan<{
      sicil_no: string
      tckn: string | null
      gorev_turu: string | null
      gorev_turu_tarihi: string | null
      gorev_turu_bitis_tarihi: string | null
    }>(supabase, 'sicil_no, tckn, gorev_turu, gorev_turu_tarihi, gorev_turu_bitis_tarihi'),
    supabase
      .from('kadro_hareketleri')
      .select('gorev_mudurlugu, kadro_mudurlugu, durumu, ayrilis_tarihi')
      .eq('asil', sicil),
  ])
  if (calisanRes.error) return { hata: calisanRes.error }
  if (kadroRes.error) return { hata: kadroRes.error.message }

  const kayit = asilKaynak(kaynaklar, sicil)
  if (!kayit) return { hata: 'Bu personelin dolu asıl kadrosu veya asıl terfi kaydı yok.' }

  const kalem = kazancKalemleri(kayit, kazancLookup, teknisyenEkGosterge)
  if ('hata' in kalem) return { hata: kalem.hata }

  const cal = calisanRes.data.find(c => String(c.sicil_no).trim() === sicil)
  const yarim = yarimZamanliOdemeDurumu(cal?.gorev_turu, cal?.gorev_turu_tarihi, cal?.gorev_turu_bitis_tarihi)
  const kaynak = kaynakKur(kayit, String(cal?.tckn ?? ''), kadroMudurlugu(kadroRes.data ?? []), yarim, kalem)
  if ('hata' in kaynak) return { hata: kaynak.hata }
  return { kaynak }
}
