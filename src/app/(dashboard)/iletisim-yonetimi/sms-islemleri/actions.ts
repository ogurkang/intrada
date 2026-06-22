'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsAyar, smsAyarToConfig, smsAyarHazirMi, smsOriginatorListesi } from '@/lib/sms-ayar'
import {
  gsmNormalize,
  smsGonderTekMetin,
  smsGonderCokluMetin,
  dogumGunuSDate,
  type SmsGonderSonuc,
} from '@/lib/sms-mesajpaketi'
import { sablonDoldur, ilkAd } from '@/lib/sms-sablon'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import type { TablesInsert } from '@/types/database'

export interface SmsGonderInput {
  /** Şablon/serbest metin; {ad_soyad},{ad},{cocuk_adi} yer tutucuları doldurulur */
  metin: string
  originator?: string
  sicilNolar: string[]
  manuelNumaralar: string
  /** Hoş geldin bebek için sicil → çocuk adı */
  cocukAdiBySicil?: Record<string, string>
  /** 'dogum_gunu' | 'hosgeldin_bebek' | 'tekil' */
  baglam?: string
}

export interface SmsGonderActionSonuc {
  ok?: boolean
  hata?: string
  gonderilen?: number
  planlanan?: number
  gecersiz?: string[]
  mesajId?: string
}

const SAYFA = '/iletisim-yonetimi/sms-islemleri'

interface Alici {
  sicil_no: string | null
  ad: string | null
  telefon: string
  mesaj: string
  sdate: string
}

export async function smsGonderAction(input: SmsGonderInput): Promise<SmsGonderActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Bu işlem için yetkiniz yok.' }

  const metin = String(input.metin ?? '').trim()
  if (!metin) return { hata: 'Mesaj boş olamaz.' }
  if (metin.length > 900) return { hata: 'Mesaj en fazla 900 karakter olabilir.' }

  const ayar = await fetchSmsAyar(supabase)
  if (!smsAyarHazirMi(ayar)) {
    return { hata: 'SMS ayarları eksik veya pasif. İletişim Yönetimi → Tanımlar ekranından tamamlayın.' }
  }
  const config = smsAyarToConfig(ayar)

  const originatorlar = smsOriginatorListesi(ayar)
  const secilenOriginator = String(input.originator ?? '').trim()
  if (secilenOriginator && originatorlar.includes(secilenOriginator)) {
    config.originator = secilenOriginator
  }

  const baglam = input.baglam ?? 'tekil'
  const hitapEkle = baglam === 'dogum_gunu' || baglam === 'hosgeldin_bebek'
  const zamanla = baglam === 'dogum_gunu'
  const cocukAdiBySicil = input.cocukAdiBySicil ?? {}
  const gecersiz: string[] = []
  const alicilar: Alici[] = []

  function hitapla(adSoyad: string | null, govde: string): string {
    const ad = String(adSoyad ?? '').trim()
    if (hitapEkle && ad) return `Sayın ${ad}\n${govde}`.trim()
    return govde
  }

  const sicilNolar = [...new Set((input.sicilNolar ?? []).map(s => String(s).trim()).filter(Boolean))]
  if (sicilNolar.length) {
    const { data: calisanRaw, error } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad, telefon, dogum_tarihi')
      .in('sicil_no', sicilNolar)
    if (error) return { hata: error.message }
    for (const c of calisanRaw ?? []) {
      const gsm = gsmNormalize(c.telefon)
      if (!gsm) {
        gecersiz.push(`${c.ad_soyad ?? c.sicil_no} (telefon geçersiz/eksik)`)
        continue
      }
      const govde = sablonDoldur(metin, {
        ad_soyad: c.ad_soyad ?? '',
        ad: ilkAd(c.ad_soyad),
        cocuk_adi: cocukAdiBySicil[c.sicil_no] ?? '',
      })
      let sdate = ''
      if (zamanla && c.dogum_tarihi) {
        const plan = dogumGunuSDate(String(c.dogum_tarihi).slice(0, 10))
        if (plan && !plan.bugun) sdate = plan.sdate
      }
      alicilar.push({ sicil_no: c.sicil_no, ad: c.ad_soyad, telefon: gsm, mesaj: hitapla(c.ad_soyad, govde), sdate })
    }
  }

  const manuelParcalar = String(input.manuelNumaralar ?? '')
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
  for (const m of manuelParcalar) {
    const gsm = gsmNormalize(m)
    if (!gsm) {
      gecersiz.push(`${m} (numara geçersiz)`)
      continue
    }
    alicilar.push({ sicil_no: null, ad: null, telefon: gsm, mesaj: sablonDoldur(metin, {}), sdate: '' })
  }

  // Telefona göre tekilleştir (personel kaydı öncelikli)
  const harita = new Map<string, Alici>()
  for (const a of alicilar) {
    const mevcut = harita.get(a.telefon)
    if (!mevcut || (!mevcut.sicil_no && a.sicil_no)) harita.set(a.telefon, a)
  }
  const benzersiz = [...harita.values()]
  if (!benzersiz.length) {
    return { hata: 'Geçerli alıcı bulunamadı.', gecersiz: gecersiz.length ? gecersiz : undefined }
  }

  // SDate'e göre grupla (her grup tek API çağrısı)
  const gruplar = new Map<string, Alici[]>()
  for (const a of benzersiz) {
    const list = gruplar.get(a.sdate) ?? []
    list.push(a)
    gruplar.set(a.sdate, list)
  }

  const logKayitlari: TablesInsert<'iletisim_sms_log'>[] = []
  const now = new Date().toISOString()
  let gonderilen = 0
  let planlanan = 0
  let ilkMesajId: string | undefined
  const hatalar: string[] = []

  for (const [sdate, grup] of gruplar) {
    const tekMetin = grup.every(a => a.mesaj === grup[0].mesaj)
    let sonuc: SmsGonderSonuc
    if (tekMetin) {
      sonuc = await smsGonderTekMetin(config, grup[0].mesaj, grup.map(a => a.telefon), sdate || undefined)
    } else {
      sonuc = await smsGonderCokluMetin(
        config,
        grup.map(a => ({ telefon: a.telefon, mesaj: a.mesaj })),
        sdate || undefined,
      )
    }

    const durum = sonuc.ok ? (sdate ? 'planlandi' : 'gonderildi') : 'basarisiz'
    if (sonuc.ok) {
      if (sdate) planlanan += grup.length
      else gonderilen += grup.length
      if (!ilkMesajId) ilkMesajId = sonuc.mesajId
    } else if (sonuc.hata) {
      hatalar.push(sonuc.hata)
    }

    for (const a of grup) {
      logKayitlari.push({
        actor_id: user.id,
        actor_email: user.email ?? null,
        alici_sicil: a.sicil_no,
        alici_ad: a.ad,
        telefon: a.telefon,
        mesaj: a.mesaj,
        originator: config.originator,
        durum,
        saglayici_mesaj_id: sonuc.mesajId ?? null,
        hata_kodu: sonuc.hataKodu ?? null,
        hata_mesaji: sonuc.ok ? null : sonuc.hata ?? null,
        created_at: now,
      })
    }
  }

  const { error: logErr } = await supabase.from('iletisim_sms_log').insert(logKayitlari)
  if (logErr) console.error('SMS_LOG_INSERT', logErr.message)

  const basariliToplam = gonderilen + planlanan
  const baglamEtiket =
    baglam === 'dogum_gunu' ? 'Doğum günü' : baglam === 'hosgeldin_bebek' ? 'Hoş geldin bebek' : 'SMS'
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'iletisim_sms',
    islem: basariliToplam ? 'SMS Gönder' : 'SMS Gönder (Başarısız)',
    ozet: basariliToplam
      ? `${baglamEtiket}: ${gonderilen} anında, ${planlanan} planlandı (toplam ${basariliToplam}).`
      : `${baglamEtiket}: SMS gönderilemedi: ${hatalar.join('; ') || '—'}`,
    ref_table: 'iletisim_sms_log',
    ref_id: ilkMesajId ?? null,
    onceki: null,
    sonraki: { gonderilen, planlanan, baglam },
  })

  revalidatePath(SAYFA)
  revalidatePath('/iletisim-yonetimi/gecmis-gonderimler')

  if (!basariliToplam) {
    return { hata: hatalar.join('; ') || 'SMS gönderilemedi.', gecersiz: gecersiz.length ? gecersiz : undefined }
  }
  return {
    ok: true,
    gonderilen,
    planlanan,
    mesajId: ilkMesajId,
    gecersiz: gecersiz.length ? gecersiz : undefined,
  }
}
