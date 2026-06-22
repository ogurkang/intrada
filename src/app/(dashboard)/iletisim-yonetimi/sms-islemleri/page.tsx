import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  etiketAnahtari,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { fetchSmsAyar, smsAyarHazirMi } from '@/lib/sms-ayar'
import { gsmNormalize } from '@/lib/sms-mesajpaketi'
import SmsIslemleriClient, {
  type SmsPersonelSatir,
  type SmsLogSatir,
} from '@/components/iletisim/SmsIslemleriClient'
import { smsGonderAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function SmsIslemleriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (access.mode === 'blocked') notFound()

  const admin = isAdminLike(access)
  const D = new Date().toISOString().slice(0, 10)

  const [
    { data: calisanRaw },
    { data: kadroRaw },
    { data: phRaw },
    { data: statuRaw },
    ayar,
    { data: logRaw },
  ] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad, telefon'),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, gorev_mudurlugu, kadro_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_statu').select('statu_adi, sira_no'),
    fetchSmsAyar(supabase),
    admin
      ? supabase
          .from('iletisim_sms_log')
          .select('id, alici_ad, alici_sicil, telefon, mesaj, durum, hata_mesaji, actor_email, created_at')
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as SmsLogSatir[] }),
  ])

  const sonAyrilis = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilis.has(r.sicil_no)) sonAyrilis.set(r.sicil_no, r.ayrilis_tarihi)
  }

  const etiketler = new Set(
    [...(statuRaw ?? [])]
      .sort((a, b) => (a.sira_no ?? 9999) - (b.sira_no ?? 9999))
      .map(t => t.statu_adi as string),
  )

  // Aktif kadro satırından statü + müdürlük (en geç başlayan aktif kayıt)
  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadroRaw ?? []) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r as KadroRaporRow)
    byAsil.set(r.asil, list)
  }
  const kadroBilgi = new Map<string, { statu: string; mudurluk: string }>()
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (!aktif.length) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const statu = etiketAnahtari(etiketler, secilen.statu) || String(secilen.statu ?? '').trim()
    const mudurluk = String(secilen.gorev_mudurlugu ?? secilen.kadro_mudurlugu ?? '').trim()
    kadroBilgi.set(sicil, { statu, mudurluk })
  }

  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw ?? [])
  const personeller: SmsPersonelSatir[] = calisanFiltreli
    .filter(c => {
      const ay = sonAyrilis.get(c.sicil_no)
      return !ay || ay > D
    })
    .map(c => {
      const k = kadroBilgi.get(c.sicil_no)
      const gsm = gsmNormalize(c.telefon)
      return {
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad,
        telefon: gsm ?? String(c.telefon ?? '').trim(),
        telefon_gecerli: Boolean(gsm),
        mudurluk: k?.mudurluk ?? '',
        statu: k?.statu ?? '',
      }
    })
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <span className="text-slate-400">İletişim Yönetimi</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">SMS İşlemleri</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SMS İşlemleri</h1>
          <p className="text-sm text-slate-500 mt-1">
            Personel seçip veya numara girip toplu SMS gönderin. Gönderimler kayıt altına alınır.
          </p>
        </div>
        {admin && (
          <Link
            href="/iletisim-yonetimi/tanimlar"
            className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            SMS Ayarları
          </Link>
        )}
      </div>

      {!smsAyarHazirMi(ayar) && (
        <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          SMS gönderimi için ayarlar eksik veya pasif.{' '}
          {admin ? (
            <Link href="/iletisim-yonetimi/tanimlar" className="font-medium underline">
              Tanımlar ekranından
            </Link>
          ) : (
            'Bir yönetici Tanımlar ekranından'
          )}{' '}
          API bilgilerini tamamlamalı.
        </div>
      )}

      <SmsIslemleriClient
        personeller={personeller}
        loglar={admin ? ((logRaw as SmsLogSatir[]) ?? []) : []}
        adminMi={admin}
        gonderimAcik={smsAyarHazirMi(ayar)}
        onGonder={smsGonderAction}
      />
    </div>
  )
}
