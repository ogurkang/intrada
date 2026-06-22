'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAppAccess } from '@/lib/app-access'
import { fetchSmsAyar, smsAyarToConfig, smsAyarHazirMi } from '@/lib/sms-ayar'
import { gsmNormalize, smsGonderTekMetin } from '@/lib/sms-mesajpaketi'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export interface SmsGonderInput {
  mesaj: string
  sicilNolar: string[]
  manuelNumaralar: string
}

export interface SmsGonderActionSonuc {
  ok?: boolean
  hata?: string
  gonderilen?: number
  gecersiz?: string[]
  mesajId?: string
}

const SAYFA = '/iletisim-yonetimi/sms-islemleri'

export async function smsGonderAction(input: SmsGonderInput): Promise<SmsGonderActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') return { hata: 'Erişiminiz kapalı.' }

  const mesaj = String(input.mesaj ?? '').trim()
  if (!mesaj) return { hata: 'Mesaj boş olamaz.' }
  if (mesaj.length > 900) return { hata: 'Mesaj en fazla 900 karakter olabilir.' }

  const ayar = await fetchSmsAyar(supabase)
  if (!smsAyarHazirMi(ayar)) {
    return { hata: 'SMS ayarları eksik veya pasif. İletişim Yönetimi → Tanımlar ekranından tamamlayın.' }
  }
  const config = smsAyarToConfig(ayar)

  // Seçili personel telefonlarını DB'den (güvenli) çek
  const sicilNolar = [...new Set((input.sicilNolar ?? []).map(s => String(s).trim()).filter(Boolean))]
  const aliciKayitlari: { sicil_no: string | null; ad: string | null; telefon: string }[] = []
  const gecersiz: string[] = []

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
      aliciKayitlari.push({ sicil_no: c.sicil_no, ad: c.ad_soyad, telefon: gsm })
    }
  }

  // Manuel numaralar
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
    aliciKayitlari.push({ sicil_no: null, ad: null, telefon: gsm })
  }

  // Telefona göre tekilleştir (personel kaydı önceliklidir)
  const telefonHaritasi = new Map<string, { sicil_no: string | null; ad: string | null; telefon: string }>()
  for (const a of aliciKayitlari) {
    const mevcut = telefonHaritasi.get(a.telefon)
    if (!mevcut || (!mevcut.sicil_no && a.sicil_no)) telefonHaritasi.set(a.telefon, a)
  }
  const alicilar = [...telefonHaritasi.values()]

  if (!alicilar.length) {
    return { hata: 'Geçerli alıcı bulunamadı.', gecersiz: gecersiz.length ? gecersiz : undefined }
  }

  const numaralar = alicilar.map(a => a.telefon)
  const sonuc = await smsGonderTekMetin(config, mesaj, numaralar)

  const now = new Date().toISOString()
  const durum = sonuc.ok ? 'gonderildi' : 'basarisiz'
  const logKayitlari = alicilar.map(a => ({
    actor_id: user.id,
    actor_email: user.email ?? null,
    alici_sicil: a.sicil_no,
    alici_ad: a.ad,
    telefon: a.telefon,
    mesaj,
    originator: config.originator,
    durum,
    saglayici_mesaj_id: sonuc.mesajId ?? null,
    hata_kodu: sonuc.hataKodu ?? null,
    hata_mesaji: sonuc.ok ? null : sonuc.hata ?? null,
    created_at: now,
  }))

  const { error: logErr } = await supabase.from('iletisim_sms_log').insert(logKayitlari)
  if (logErr) console.error('SMS_LOG_INSERT', logErr.message)

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'iletisim_sms',
    islem: sonuc.ok ? 'SMS Gönder' : 'SMS Gönder (Başarısız)',
    ozet: sonuc.ok
      ? `${alicilar.length} alıcıya SMS gönderildi (ID: ${sonuc.mesajId ?? '—'}).`
      : `SMS gönderilemedi: ${sonuc.hata ?? '—'}`,
    ref_table: 'iletisim_sms_log',
    ref_id: sonuc.mesajId ?? null,
    onceki: null,
    sonraki: { alici_sayisi: alicilar.length, durum, mesaj },
  })

  revalidatePath(SAYFA)

  if (!sonuc.ok) {
    return { hata: sonuc.hata ?? 'SMS gönderilemedi.', gecersiz: gecersiz.length ? gecersiz : undefined }
  }
  return {
    ok: true,
    gonderilen: alicilar.length,
    mesajId: sonuc.mesajId,
    gecersiz: gecersiz.length ? gecersiz : undefined,
  }
}
