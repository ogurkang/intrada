import type { SupabaseClient } from '@supabase/supabase-js'
import { mudurlukBazEslesir, mudurlukEslesmeBaz } from '@/lib/organizasyon-birim'
import { mudurSicilForBaz } from '@/lib/performans-amir'
import {
  performansOrgBaglamiYukle,
  type PerformansOrgBaglam,
} from '@/lib/performans-degerlendirme-amir-canli'
import { performansMudurlukKayitEslesir } from '@/lib/performans-kadro'
import { performansAmir2SmsOriginator } from '@/lib/performans-amir2-bildirim'
import { trNormalize } from '@/lib/turkce-search'
import { fetchSmsAyar, smsAyarHazirMi, smsAyarToConfig } from '@/lib/sms-ayar'
import { gsmNormalize, smsGonderTekMetin } from '@/lib/sms-mesajpaketi'
import { smsLogTekKayit } from '@/lib/sms-log-kayit'
import { sablonDoldur } from '@/lib/sms-sablon'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'

export const PERFORMANS_IK_MUDURLUK_ADI = 'İnsan Kaynakları ve Eğitim Müdürlüğü'

const TAMAM_DURUMLAR = ['amir2_onay', 'tamamlandi'] as const

const VARSAYILAN_IK_METIN =
  'Sayın {ad_soyad}, {hedef} değerlendirmesi tamamlanmıştır. Değerlendirme Formuna ait Müdürlüğünüzce yapılacak işlemleri tamamlayabilirsiniz.'

function mudurlukHedefMetni(mudurlukAdi: string): string {
  const ad = mudurlukAdi.trim()
  if (!ad) return 'Müdürlüğünün'
  const n = trNormalize(ad)
  if (n.includes('mudurlugu') || n.endsWith('mudurluk')) {
    if (ad.endsWith('ü') || ad.endsWith('u')) return `${ad}nün`
    return `${ad}ünün`
  }
  return `${ad} Müdürlüğünün`
}

function tekAmirHedefMetni(adSoyad: string): string {
  const ad = adSoyad.trim() || 'Personelin'
  return `${ad}'in`
}

function mudurlukReferans(mudurlukAdi: string): string {
  return mudurlukEslesmeBaz(mudurlukAdi) || trNormalize(mudurlukAdi)
}

async function ikMuduruBul(
  supabase: SupabaseClient,
  baglam: PerformansOrgBaglam,
): Promise<{ sicil: string; ad: string; telefon: string } | null> {
  const hedefBaz = mudurlukEslesmeBaz(PERFORMANS_IK_MUDURLUK_ADI)

  for (const b of baglam.birimler) {
    const mudAd = b.mudurluk?.mudurluk_adi ?? ''
    if (!mudurlukBazEslesir(PERFORMANS_IK_MUDURLUK_ADI, mudurlukEslesmeBaz(mudAd))) continue
    const sicil = b.personel_sicil_no?.trim()
    if (sicil) {
      const { data: cal } = await supabase
        .from('calisan')
        .select('ad_soyad, telefon')
        .eq('sicil_no', sicil)
        .maybeSingle()
      const telefon = gsmNormalize(cal?.telefon)
      if (!telefon) return null
      return { sicil, ad: cal?.ad_soyad?.trim() || sicil, telefon }
    }
  }

  const kadrolar = baglam.kadrolar.map(r => ({
    ...r,
    asil: r.asil ?? null,
    vekil: r.vekil ?? null,
  }))
  const sicil = mudurSicilForBaz(hedefBaz || PERFORMANS_IK_MUDURLUK_ADI, kadrolar)
  if (!sicil) return null

  const { data: cal } = await supabase
    .from('calisan')
    .select('ad_soyad, telefon')
    .eq('sicil_no', sicil)
    .maybeSingle()
  const telefon = gsmNormalize(cal?.telefon)
  if (!telefon) return null
  return { sicil, ad: cal?.ad_soyad?.trim() || sicil, telefon }
}

async function mudurlukTamamlandiMi(
  supabase: SupabaseClient,
  donemId: number,
  mudurlukAdi: string,
): Promise<boolean> {
  const { data: rows } = await supabase
    .from('performans_degerlendirme')
    .select('durum, mudurluk_adi')
    .eq('donem_id', donemId)

  const mudRows = (rows ?? []).filter(r =>
    performansMudurlukKayitEslesir(mudurlukAdi, { mudurluk_adi: r.mudurluk_adi }),
  )
  if (mudRows.length === 0) return false
  return mudRows.every(r => TAMAM_DURUMLAR.includes(r.durum as (typeof TAMAM_DURUMLAR)[number]))
}

async function bildirimGonderildiMi(
  supabase: SupabaseClient,
  donemId: number,
  bildirimTipi: 'mudurluk' | 'tek_amir',
  referans: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('performans_ik_sms_bildirim')
    .select('id')
    .eq('donem_id', donemId)
    .eq('bildirim_tipi', bildirimTipi)
    .eq('referans', referans)
    .maybeSingle()
  return !!data
}

async function ikSmsGonder(
  supabase: SupabaseClient,
  params: {
    donemId: number
    bildirimTipi: 'mudurluk' | 'tek_amir'
    referans: string
    hedef: string
    actorId: string
    actorEmail: string | null
  },
): Promise<void> {
  const yazici = tryCreateServiceRoleClient() ?? supabase
  const baglam = await performansOrgBaglamiYukle(yazici)
  const ikMudur = await ikMuduruBul(yazici, baglam)
  if (!ikMudur) {
    console.error('PERFORMANS_IK_SMS: İK müdürü veya telefon bulunamadı.')
    return
  }

  const smsAyar = await fetchSmsAyar(yazici)
  if (!smsAyarHazirMi(smsAyar)) {
    console.error('PERFORMANS_IK_SMS: SMS ayarları hazır değil.')
    return
  }

  const originatorSec = performansAmir2SmsOriginator(smsAyar)
  if (originatorSec.hata || !originatorSec.originator) {
    console.error('PERFORMANS_IK_SMS:', originatorSec.hata ?? 'Originator seçilemedi.')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: smsSablon } = await (yazici as any)
    .from('performans_sms_ayar')
    .select('ik_tamamlanma_metin')
    .eq('id', 1)
    .maybeSingle()

  const sablon = smsSablon?.ik_tamamlanma_metin?.trim() || VARSAYILAN_IK_METIN
  const metin = sablonDoldur(sablon, {
    ad_soyad: ikMudur.ad,
    hedef: params.hedef,
  })

  const config = smsAyarToConfig(smsAyar)
  config.originator = originatorSec.originator

  const sonuc = await smsGonderTekMetin(config, metin, [ikMudur.telefon])
  const logId = await smsLogTekKayit(yazici, {
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    aliciAd: ikMudur.ad,
    aliciSicil: ikMudur.sicil,
    telefon: ikMudur.telefon,
    mesaj: metin,
    originator: config.originator,
    baglam: 'performans_ik_tamamlanma',
    sonuc,
  })

  if (!sonuc.ok) {
    console.error('PERFORMANS_IK_SMS:', sonuc.hata ?? 'Gönderim başarısız.')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: kayitErr } = await (yazici as any).from('performans_ik_sms_bildirim').insert({
    donem_id: params.donemId,
    bildirim_tipi: params.bildirimTipi,
    referans: params.referans,
    sms_log_id: logId,
  })
  if (kayitErr) console.error('PERFORMANS_IK_SMS_BILDIRIM_INSERT', kayitErr.message)
}

/**
 * Değerlendirme tamamlandığında İK müdürüne otomatik SMS dener (hata ana akışı kesmez).
 */
export async function performansTamamlanmaIkSmsDene(
  supabase: SupabaseClient,
  params: {
    donemId: number
    sicilNo: string
    mudurlukAdi: string | null
    tekAmir: boolean
    actorId: string
    actorEmail: string | null
  },
): Promise<void> {
  try {
    if (params.tekAmir) {
      const referans = params.sicilNo.trim()
      if (!referans) return
      const gonderildi = await bildirimGonderildiMi(supabase, params.donemId, 'tek_amir', referans)
      if (gonderildi) return

      const { data: cal } = await supabase
        .from('calisan')
        .select('ad_soyad')
        .eq('sicil_no', referans)
        .maybeSingle()
      const hedef = tekAmirHedefMetni(cal?.ad_soyad ?? referans)

      await ikSmsGonder(supabase, {
        donemId: params.donemId,
        bildirimTipi: 'tek_amir',
        referans,
        hedef,
        actorId: params.actorId,
        actorEmail: params.actorEmail,
      })
    }

    const mudurluk = params.mudurlukAdi?.trim()
    if (!mudurluk) return

    const tamam = await mudurlukTamamlandiMi(supabase, params.donemId, mudurluk)
    if (!tamam) return

    const referans = mudurlukReferans(mudurluk)
    const gonderildi = await bildirimGonderildiMi(supabase, params.donemId, 'mudurluk', referans)
    if (gonderildi) return

    await ikSmsGonder(supabase, {
      donemId: params.donemId,
      bildirimTipi: 'mudurluk',
      referans,
      hedef: mudurlukHedefMetni(mudurluk),
      actorId: params.actorId,
      actorEmail: params.actorEmail,
    })
  } catch (e) {
    console.error('PERFORMANS_IK_SMS', e)
  }
}
