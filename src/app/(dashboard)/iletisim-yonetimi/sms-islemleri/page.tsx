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
import { fetchSmsAyar, smsAyarHazirMi, smsOriginatorListesi } from '@/lib/sms-ayar'
import { fetchSmsSablonlari } from '@/lib/sms-sablon'
import { gsmNormalize } from '@/lib/sms-mesajpaketi'
import SmsIslemleriClient, {
  type SmsPersonelSatir,
  type SmsBebekSatir,
} from '@/components/iletisim/SmsIslemleriClient'
import type { SablonSecenek } from '@/components/iletisim/SmsMesajGonderKutusu'
import { smsGonderAction } from './actions'

export const dynamic = 'force-dynamic'

interface CocukKaydi {
  ad_soyad?: string
  dogum_tarihi?: string
}

export default async function SmsIslemleriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const D = new Date().toISOString().slice(0, 10)

  const [
    { data: calisanRaw },
    { data: kadroRaw },
    { data: phRaw },
    { data: statuRaw },
    { data: aileRaw },
    ayar,
    sablonlar,
  ] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad, telefon, dogum_tarihi'),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, gorev_mudurlugu, kadro_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_statu').select('statu_adi, sira_no'),
    supabase.from('aile_bildirimi').select('sicil_no, cocuklar_json'),
    fetchSmsAyar(supabase),
    fetchSmsSablonlari(supabase),
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
  const aktifCalisanlar = calisanFiltreli.filter(c => {
    const ay = sonAyrilis.get(c.sicil_no)
    return !ay || ay > D
  })

  const personeller: SmsPersonelSatir[] = aktifCalisanlar
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
        dogum_tarihi: c.dogum_tarihi ? String(c.dogum_tarihi).slice(0, 10) : null,
      }
    })
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))

  // Hoş geldin bebek: aile bildirimindeki çocuk doğum tarihleri (aktif personel)
  const personelById = new Map(personeller.map(p => [p.sicil_no, p]))
  const bebekler: SmsBebekSatir[] = []
  for (const a of aileRaw ?? []) {
    const p = personelById.get(a.sicil_no)
    if (!p) continue
    const cocuklar = Array.isArray(a.cocuklar_json) ? (a.cocuklar_json as unknown as CocukKaydi[]) : []
    cocuklar.forEach((c, idx) => {
      const dogum = c?.dogum_tarihi ? String(c.dogum_tarihi).slice(0, 10) : ''
      if (!dogum) return
      bebekler.push({
        key: `${a.sicil_no}-${idx}`,
        sicil_no: a.sicil_no,
        ad_soyad: p.ad_soyad,
        telefon: p.telefon,
        telefon_gecerli: p.telefon_gecerli,
        cocuk_adi: String(c?.ad_soyad ?? '').trim(),
        cocuk_dogum: dogum,
      })
    })
  }

  const originatorlar = smsOriginatorListesi(ayar)
  const sablonSecenekleri: SablonSecenek[] = sablonlar
    .filter(s => s.aktif)
    .map(s => ({ id: s.id, tur: s.tur, baslik: s.baslik, metin: s.metin }))

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
            Doğum günü, hoş geldin bebek ve tekil mesaj gönderimleri. Şablon ve gönderici başlığı seçebilirsiniz.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/iletisim-yonetimi/gecmis-gonderimler"
            className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Geçmiş Gönderimler
          </Link>
          <Link
            href="/iletisim-yonetimi/tanimlar"
            className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            SMS Ayarları
          </Link>
        </div>
      </div>

      {!smsAyarHazirMi(ayar) && (
        <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          SMS gönderimi için ayarlar eksik veya pasif.{' '}
          <Link href="/iletisim-yonetimi/tanimlar" className="font-medium underline">
            Tanımlar ekranından
          </Link>{' '}
          API bilgilerini tamamlayın.
        </div>
      )}

      <SmsIslemleriClient
        personeller={personeller}
        bebekler={bebekler}
        sablonlar={sablonSecenekleri}
        originatorlar={originatorlar}
        gonderimAcik={smsAyarHazirMi(ayar)}
        onGonder={smsGonderAction}
      />
    </div>
  )
}
