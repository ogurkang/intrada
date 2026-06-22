'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'
import { fetchSmsAyar, smsAyarToConfig } from '@/lib/sms-ayar'
import { smsKrediSorgula } from '@/lib/sms-mesajpaketi'
import {
  writePersonelAuditLogSafe,
  alanDegisiklikleriHesapla,
  degisiklikPayload,
  degisiklikOzeti,
} from '@/lib/personel-audit'

const SAYFA = '/iletisim-yonetimi/tanimlar'

const SMS_AYAR_ALAN_ETIKETLERI: Record<string, string> = {
  api_base_url: 'API Adresi',
  kullanici_adi: 'Kullanıcı Adı',
  originator: 'Gönderici Başlığı',
  turkce_karakter: 'Türkçe Karakter',
  aktif: 'Durum',
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

function boolVal(fd: FormData, key: string): boolean {
  const v = String(fd.get(key) ?? '').toLowerCase()
  return v === 'on' || v === 'true' || v === '1'
}

export async function smsAyarKaydet(fd: FormData): Promise<{ hata?: string; ok?: boolean }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const supabase = await createClient()
  const onceki = await fetchSmsAyar(supabase)

  const api_base_url = str(fd, 'api_base_url') || 'https://www.mesajpaketi.com'
  const kullanici_adi = str(fd, 'kullanici_adi') || null
  const originator = str(fd, 'originator') || null
  const turkce_karakter = boolVal(fd, 'turkce_karakter')
  const aktif = boolVal(fd, 'aktif')

  // Şifre boş bırakılırsa mevcut korunur.
  const sifreGirilen = str(fd, 'sifre')
  const sifre = sifreGirilen || onceki?.sifre || null

  const { error } = await supabase
    .from('iletisim_sms_ayar')
    .update({
      api_base_url,
      kullanici_adi,
      sifre,
      originator,
      turkce_karakter,
      aktif,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) return { hata: error.message }

  // Audit (şifre alanı kaydedilmez)
  const oncekiSnap = {
    api_base_url: onceki?.api_base_url ?? '',
    kullanici_adi: onceki?.kullanici_adi ?? '',
    originator: onceki?.originator ?? '',
    turkce_karakter: onceki?.turkce_karakter ?? true,
    aktif: onceki?.aktif ?? false,
  }
  const sonrakiSnap = {
    api_base_url,
    kullanici_adi: kullanici_adi ?? '',
    originator: originator ?? '',
    turkce_karakter,
    aktif,
  }
  const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, SMS_AYAR_ALAN_ETIKETLERI)
  const sifreDegisti = Boolean(sifreGirilen)
  if (degisiklikler.length > 0 || sifreDegisti) {
    const payload = degisiklikPayload(degisiklikler)
    const ozetParcalar = [
      degisiklikler.length ? degisiklikOzeti(degisiklikler, 'SMS ayarları güncellendi') : 'SMS ayarları güncellendi',
      sifreDegisti ? 'şifre güncellendi' : '',
    ].filter(Boolean)
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: null,
      modul: 'iletisim_sms',
      islem: 'Ayar Güncelle',
      ozet: ozetParcalar.join('; '),
      ref_table: 'iletisim_sms_ayar',
      ref_id: '1',
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  revalidatePath(SAYFA)
  revalidatePath('/iletisim-yonetimi/sms-islemleri')
  return { ok: true }
}

export async function smsKrediSorgulaAction(): Promise<{ kredi?: string; hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const ayar = await fetchSmsAyar(supabase)
  const sonuc = await smsKrediSorgula(smsAyarToConfig(ayar))
  if (!sonuc.ok) return { hata: sonuc.hata }
  return { kredi: sonuc.kredi }
}
