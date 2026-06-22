'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsAyar, smsAyarToConfig, smsAyarHazirMi, smsOriginatorListesi } from '@/lib/sms-ayar'
import {
  gsmNormalize,
  smsGonderTekMetin,
  smsGonderCokluMetin,
  type SmsGonderSonuc,
} from '@/lib/sms-mesajpaketi'
import { sablonDoldur, ilkAd } from '@/lib/sms-sablon'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export interface SmsGonderInput {
  /** Şablon/serbest metin; {ad_soyad},{ad},{cocuk_adi} yer tutucuları doldurulur */
  metin: string
  originator?: string
  sicilNolar: string[]
  manuelNumaralar: string
  /** Hoş geldin bebek için sicil → çocuk adı */
  cocukAdiBySicil?: Record<string, string>
  /** Log/özet bağlamı: 'dogum_gunu' | 'hosgeldin_bebek' | 'tekil' */
  baglam?: string
}

export interface SmsGonderActionSonuc {
  ok?: boolean
  hata?: string
  gonderilen?: number
  gecersiz?: string[]
  mesajId?: string
}

const SAYFA = '/iletisim-yonetimi/sms-islemleri'

interface Alici {
  sicil_no: string | null
  ad: string | null
  telefon: string
  mesaj: string
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

  // Originator seçimi (tanımlı listeden)
  const originatorlar = smsOriginatorListesi(ayar)
  const secilenOriginator = String(input.originator ?? '').trim()
  if (secilenOriginator && originatorlar.includes(secilenOriginator)) {
    config.originator = secilenOriginator
  }

  const cocukAdiBySicil = input.cocukAdiBySicil ?? {}
  const gecersiz: string[] = []
  const alicilar: Alici[] = []

  const sicilNolar = [...new Set((input.sicilNolar ?? []).map(s => String(s).trim()).filter(Boolean))]
  if (sicilNolar.length) {
    const { data: calisanRaw, error } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad, telefon')
      .in('sicil_no', sicilNolar)
    if (error) return { hata: error.message }
    for (const c of calisanRaw ?? []) {
      const gsm = gsmNormalize(c.telefon)
      if (!gsm) {
        gecersiz.push(`${c.ad_soyad ?? c.sicil_no} (telefon geçersiz/eksik)`)
        continue
      }
      const mesaj = sablonDoldur(metin, {
        ad_soyad: c.ad_soyad ?? '',
        ad: ilkAd(c.ad_soyad),
        cocuk_adi: cocukAdiBySicil[c.sicil_no] ?? '',
      })
      alicilar.push({ sicil_no: c.sicil_no, ad: c.ad_soyad, telefon: gsm, mesaj })
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
    alicilar.push({ sicil_no: null, ad: null, telefon: gsm, mesaj: sablonDoldur(metin, {}) })
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

  // Tüm mesajlar aynıysa SingleText, farklıysa MultiText
  const tekMetin = benzersiz.every(a => a.mesaj === benzersiz[0].mesaj)
  let sonuc: SmsGonderSonuc
  if (tekMetin) {
    sonuc = await smsGonderTekMetin(config, benzersiz[0].mesaj, benzersiz.map(a => a.telefon))
  } else {
    sonuc = await smsGonderCokluMetin(
      config,
      benzersiz.map(a => ({ telefon: a.telefon, mesaj: a.mesaj })),
    )
  }

  const now = new Date().toISOString()
  const durum = sonuc.ok ? 'gonderildi' : 'basarisiz'
  const logKayitlari = benzersiz.map(a => ({
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
  }))
  const { error: logErr } = await supabase.from('iletisim_sms_log').insert(logKayitlari)
  if (logErr) console.error('SMS_LOG_INSERT', logErr.message)

  const baglamEtiket =
    input.baglam === 'dogum_gunu'
      ? 'Doğum günü'
      : input.baglam === 'hosgeldin_bebek'
        ? 'Hoş geldin bebek'
        : 'SMS'
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'iletisim_sms',
    islem: sonuc.ok ? 'SMS Gönder' : 'SMS Gönder (Başarısız)',
    ozet: sonuc.ok
      ? `${baglamEtiket}: ${benzersiz.length} alıcıya SMS gönderildi (ID: ${sonuc.mesajId ?? '—'}).`
      : `${baglamEtiket}: SMS gönderilemedi: ${sonuc.hata ?? '—'}`,
    ref_table: 'iletisim_sms_log',
    ref_id: sonuc.mesajId ?? null,
    onceki: null,
    sonraki: { alici_sayisi: benzersiz.length, durum, baglam: input.baglam ?? 'tekil' },
  })

  revalidatePath(SAYFA)
  revalidatePath('/iletisim-yonetimi/gecmis-gonderimler')

  if (!sonuc.ok) {
    return { hata: sonuc.hata ?? 'SMS gönderilemedi.', gecersiz: gecersiz.length ? gecersiz : undefined }
  }
  return {
    ok: true,
    gonderilen: benzersiz.length,
    mesajId: sonuc.mesajId,
    gecersiz: gecersiz.length ? gecersiz : undefined,
  }
}
