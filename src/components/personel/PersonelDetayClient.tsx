'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Tables } from '@/types/database'
import { anaKadroSec } from '@/lib/kadro-ana-sicil'
import { hizmetSuresiEtiket360 } from '@/lib/hizmet-suresi-360'
import { GOREV_TURU_OPTIONS } from '@/lib/gorev-bilgileri'
import { malBildirimDetayHrefPersonelSaltOkunur } from '@/lib/mal-bildirim-route'

type Calisan   = Tables<'calisan'>
type KH        = Tables<'kadro_hareketleri'>
type PH        = Tables<'personel_hareketleri'>
type IzinHak      = Tables<'izin_haklari'>
type IzinHareketi = Tables<'izin_hareketleri'>
type TH           = Tables<'terfi_hareketleri'>
type Ogrenim      = Tables<'calisan_ogrenim'>
type Aile         = Tables<'aile_bildirimi'>

/** Personel kartında mal listesi (MalClient ile aynı alanlar; Sil yok) */
export type PersonelMalBildirimOzet = {
  id: number
  public_id?: string | null
  sicil_no: string
  ad_soyad: string | null
  beyan_turu: string | null
  onay_tarihi: string | null
  son_net_maas: number | null
  kayit_zamani: string
}

const SEKMELER = [
  'Kişisel Bilgiler',
  'Öğrenim Bilgileri',
  'Aile Bilgileri',
  'Mal Bildirimleri',
  'Kadro Bilgileri',
  'Katsayı Bilgileri',
  'İzin Bilgileri',
  'Eğitim Bilgileri',
  'Performans Bilgileri',
  'Geçmiş',
] as const
type Sekme = (typeof SEKMELER)[number]

interface Props {
  kaynak?: string
  calisan: Calisan
  kadrolar: KH[]
  hareketler: PH[]
  izinHaklari: IzinHak[]
  izinHareketleri: IzinHareketi[]
  terfiKayitlari: TH[]
  ogrenimler: Ogrenim[]
  aileBildirimi: Aile | null
  malKayitlari?: PersonelMalBildirimOzet[]
  egitimKatilimlari?: { egitim_adi: string; program: 'Evet' | 'Hayır'; donem_adi?: string }[]
  yevmiyeFazlaMesaiAylik?: { ay: string; saat: number }[]
  tanimGostergeKha?: string | null
  terfiOncesiTarihce?: { islem_tarihi: string; kha_dk: string; ekea_dk: string; kidem_yili: string }[]
  onKisiselGuncelle?: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  /** Kullanıcı rolü: kendi kartı salt okunur; düzenle/liste dönüş kapalı */
  saltOkunur?: boolean
}

function tarihFormatla(t: string | null | undefined) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function Alan({ etiket, deger }: { etiket: string; deger?: string | null }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{etiket}</label>
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 min-h-[36px]">
        {deger || <span className="text-slate-400 italic">—</span>}
      </div>
    </div>
  )
}

const DURUM_RENK: Record<string, string> = {
  'Onaylandı':    'bg-green-100 text-green-700',
  'Taslak':       'bg-slate-100 text-slate-600',
  'Değiştirildi': 'bg-amber-100 text-amber-700',
  'İptal Edildi': 'bg-red-100 text-red-600',
}

// ─── Kişisel Bilgiler ─────────────────────────────────────────────────────────

function KisiselTab({
  calisan,
  kadrolar,
}: {
  calisan: Calisan
  kadrolar: KH[]
}) {
  const sicil = (calisan.sicil_no ?? '').trim()
  const anaK = anaKadroSec(kadrolar, sicil)
  const memuriyetGoster = anaK?.memuriyet_tarihi ?? calisan.memuriyet_tarihi
  const kurumaGoster = anaK?.kuruma_giris_tarihi ?? calisan.kuruma_giris_tarihi
  const hy = calisan.hizmet_suresi_yil ?? 0
  const ha = calisan.hizmet_suresi_ay ?? 0
  const hg = calisan.hizmet_suresi_gun ?? 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Temel Bilgiler</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Alan etiket="Sicil No"        deger={calisan.sicil_no} />
          <Alan etiket="Adı Soyadı"      deger={calisan.ad_soyad} />
          <Alan etiket="TCKN"            deger={calisan.tckn} />
          <Alan etiket="Doğum Tarihi"    deger={tarihFormatla(calisan.dogum_tarihi)} />
          <Alan etiket="Doğum Yeri"      deger={calisan.dogum_yeri} />
          <Alan etiket="Cinsiyet"        deger={calisan.cinsiyet} />
          <Alan etiket="Kan Grubu"       deger={calisan.kan_grubu} />
          <Alan etiket="Askerlik"        deger={calisan.askerlik_durumu} />
          <Alan etiket="Anne Adı"        deger={calisan.anne_adi} />
          <Alan etiket="Baba Adı"        deger={calisan.baba_adi} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">İletişim</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Alan etiket="Telefon"         deger={calisan.telefon} />
          <Alan etiket="E-posta"         deger={calisan.e_posta} />
          <Alan etiket="Adres"           deger={calisan.adresi} />
          <Alan etiket="Yakını"          deger={calisan.yakini} />
          <Alan etiket="Yakın Telefon"   deger={calisan.yakini_telefonu} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Görev Bilgileri</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Alan etiket="Görev yeri" deger={calisan.gorev_yeri} />
          <Alan etiket="Görev türü" deger={calisan.gorev_turu ?? GOREV_TURU_OPTIONS[0]} />
          <Alan etiket="Görev türü tarihi" deger={
            (calisan.gorev_turu ?? 'Çalışan') === 'Çalışan'
              ? '—'
              : tarihFormatla(calisan.gorev_turu_tarihi)
          } />
          <Alan etiket="Geçici görevlendirme açıklaması" deger={
            (calisan.gorev_turu ?? '') === 'Geçici Görevlendirme'
              ? (calisan.gorev_turu_aciklama ?? '—')
              : '—'
          } />
          <Alan etiket="Görev durumu" deger={calisan.gorev_durumu ?? 'Diğer'} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Hizmet Bilgileri</p>
        {(calisan.gorev_turu ?? 'Çalışan') === 'Aylıksız İzin' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
            Aylıksız izin: hizmet süresi bu kayıt değiştirilene kadar güncellenmez (ilerleme durur).
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Alan etiket="Memuriyete giriş" deger={tarihFormatla(memuriyetGoster)} />
          <Alan etiket="Kuruma giriş" deger={tarihFormatla(kurumaGoster)} />
          <Alan etiket="Hizmet süresi (360 gün esası)" deger={hizmetSuresiEtiket360(hy, ha, hg)} />
        </div>
      </div>
    </div>
  )
}

// ─── Öğrenim Bilgileri ────────────────────────────────────────────────────────

function mezuniyetHucre(val: string | null | undefined) {
  if (!val) return '—'
  const d = val.includes('-') ? val : val.split('.').reverse().join('-')
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d)
  if (!m) return val
  const [, y, a, g] = m
  return `${g!.padStart(2, '0')}.${a!.padStart(2, '0')}.${y}`
}

function OgrenimTab({ ogrenimler }: { ogrenimler: Ogrenim[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">Öğrenim Bilgileri</h2>
      </div>
      {ogrenimler.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Öğrenim kaydı bulunamadı.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Öğrenim Durumu</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Okul Adı</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Mesleği</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Mezuniyet Tarihi</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Varsayılan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ogrenimler.map(o => {
                const def = o.varsayilan ?? o.aktif
                return (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{o.ogrenim_turu ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.okul_adi ?? '—'}
                    {o.bolum && <span className="text-slate-400 text-xs ml-1">/ {o.bolum}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.meslegi ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600 tabular-nums">
                    {o.mezuniyet_tarihi
                      ? mezuniyetHucre(o.mezuniyet_tarihi)
                      : o.mezuniyet_yili
                        ? `01.01.${o.mezuniyet_yili}`
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {def
                      ? <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Evet</span>
                      : <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Hayır</span>
                    }
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Aile Bilgileri ────────────────────────────────────────────────────────────

function AileTab({ aileBildirimi }: { aileBildirimi: Aile | null }) {
  if (!aileBildirimi) {
    return (
      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Aile bildirimi kaydı bulunamadı.
      </div>
    )
  }
  const cocuklar = (Array.isArray(aileBildirimi.cocuklar_json) ? aileBildirimi.cocuklar_json : []) as {
    ad_soyad?: string; tckn?: string; dogum_tarihi?: string; cinsiyet?: string; baba_adi?: string; ana_adi?: string
  }[]
  const cinsiyetGoster = (c: string | null | undefined) =>
    !c ? '—' : c === 'E' || c === 'Erkek' ? 'E' : (c === 'K' || c === 'Kız' || c === 'Kadın') ? 'K' : c

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Medeni Hal</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Alan etiket="Medeni Hali" deger={aileBildirimi.medeni_hal} />
        </div>
      </div>

      {aileBildirimi.esin_ad_soyad && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Eş Bilgileri</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Alan etiket="Adı Soyadı"   deger={aileBildirimi.esin_ad_soyad} />
            <Alan etiket="Eş TCKN"      deger={aileBildirimi.esin_tckn} />
            <Alan etiket="İş Durumu"    deger={aileBildirimi.is_durumu} />
            <Alan etiket="Gelir Durumu" deger={aileBildirimi.gelir_durumu} />
          </div>
        </div>
      )}

      {cocuklar.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Çocuklar ({cocuklar.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-10">#</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Ad Soyad</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">TCKN</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Doğum Tarihi</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Cinsiyet</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Baba Adı</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Ana Adı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cocuklar.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-700">{c.ad_soyad || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.tckn || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{tarihFormatla(c.dogum_tarihi)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{cinsiyetGoster(c.cinsiyet)}</td>
                    <td className="px-4 py-3 text-slate-600">{c.baba_adi || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.ana_adi || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mal Bildirimleri ─────────────────────────────────────────────────────────

function MalBildirimTab({ malKayitlari }: { malKayitlari: PersonelMalBildirimOzet[] }) {
  const router = useRouter()

  if (malKayitlari.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Mal bildirimi kaydı bulunamadı.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <p className="text-xs text-slate-500 px-4 pt-4 pb-2">
        Satıra tıklayarak beyan detayını açabilirsiniz.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-44">Beyan Türü</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Onay Tarihi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {malKayitlari.map((kayit, idx) => (
              <tr
                key={kayit.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => router.push(malBildirimDetayHrefPersonelSaltOkunur(kayit))}
              >
                <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{kayit.sicil_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{kayit.ad_soyad ?? '—'}</td>
                <td className="px-4 py-3">
                  {kayit.beyan_turu ? (
                    <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                      {kayit.beyan_turu}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">
                  {kayit.onay_tarihi ? new Date(kayit.onay_tarihi).toLocaleDateString('tr-TR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Kadro Bilgileri ──────────────────────────────────────────────────────────
// GAS calisanlar.html personelKadroBilgileriYukle mantığı: Asil (Dolu) + Vekil olduğu kadrolar

function KadroTab({ kadrolar, sicilNo }: { kadrolar: KH[]; sicilNo: string }) {
  const sicil = String(sicilNo).trim()
  const asilKadro = kadrolar.find(k => (k.asil ?? '').trim() === sicil && (k.durumu ?? '') === 'Dolu')
  const vekilKadrolar = kadrolar
    .filter(k => (k.vekil ?? '').trim() === sicil)
    .sort((a, b) => (parseInt(a.kadro_derecesi ?? '999999', 10) - parseInt(b.kadro_derecesi ?? '999999', 10)))
  const anaKadro = anaKadroSec(kadrolar, sicil)
  const digerVekiller = asilKadro ? vekilKadrolar : vekilKadrolar.slice(1)

  if (!anaKadro) {
    return (
      <div className="space-y-5">
        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
          Kadro bilgisi bulunamadı.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          {asilKadro ? 'Asil Kadro (Güncel)' : 'Güncel Kadro'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Alan etiket="Kadro Sıra No"    deger={anaKadro.kadro_sira_no} />
          <Alan etiket="Kadro Ünvanı"     deger={anaKadro.kadro_unvani} />
          <Alan etiket="Görev Ünvanı"     deger={anaKadro.gorev_unvani} />
          <Alan etiket="Kadro Müdürlüğü"  deger={anaKadro.kadro_mudurlugu} />
          <Alan etiket="Görev Müdürlüğü"  deger={anaKadro.gorev_mudurlugu} />
          <Alan etiket="Statü"            deger={anaKadro.statu} />
          <Alan etiket="Kadro Derecesi"   deger={anaKadro.kadro_derecesi} />
        </div>
      </div>

      {digerVekiller.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Vekil Olduğu Kadrolar</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {digerVekiller.map((k, i) => (
              <div key={k.id ?? i} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Alan etiket="Görev Ünvanı"     deger={k.gorev_unvani} />
                  <Alan etiket="Görev Müdürlüğü"  deger={k.gorev_mudurlugu} />
                  <Alan etiket="Kadro Sıra No"   deger={k.kadro_sira_no} />
                  <Alan etiket="Kadro Derecesi"  deger={k.kadro_derecesi} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Katsayı Bilgileri ────────────────────────────────────────────────────────

function dk(d: string | null, k: string | null) {
  if (!d && !k) return '—'
  return `${d ?? '?'}/${k ?? '?'}`
}

function KatsayiTab({
  terfiKayitlari,
  kadrolar,
  yevmiyeFazlaMesaiAylik,
  tanimGostergeKha,
  terfiOncesiTarihce,
}: {
  terfiKayitlari: TH[]
  kadrolar: KH[]
  yevmiyeFazlaMesaiAylik?: { ay: string; saat: number }[]
  tanimGostergeKha?: string | null
  terfiOncesiTarihce?: { islem_tarihi: string; kha_dk: string; ekea_dk: string; kidem_yili: string }[]
}) {
  const isIscı = kadrolar.some(k => (k.statu ?? '').trim() === 'İşçi')
  const fmAylik = yevmiyeFazlaMesaiAylik ?? []

  if (isIscı && fmAylik.length === 0 && terfiKayitlari.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Katsayı / fazla mesai kaydı bulunamadı.
      </div>
    )
  }

  if (!isIscı && terfiKayitlari.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Terfi kaydı bulunamadı.
      </div>
    )
  }

  const son = terfiKayitlari[0]
  const toplamFm = fmAylik.reduce((s, r) => s + r.saat, 0)

  return (
    <div className="space-y-5">
      {isIscı && fmAylik.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Aylık Fazla Mesai (Yevmiye Puantajı)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Ay</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Fazla Mesai (saat)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fmAylik.map(r => (
                  <tr key={r.ay} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{r.ay}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-700">{r.saat.toFixed(1)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-700">Toplam</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">{toplamFm.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {terfiKayitlari.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Güncel Katsayı Bilgileri</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Alan etiket="Görev Aylığı D/K" deger={dk(son.gorev_ayligi_derece, son.gorev_ayligi_kademe)} />
            <Alan etiket="KHA D/K" deger={dk(son.kha_derece, son.kha_kademe)} />
            <Alan etiket="KHA Tarihi" deger={tarihFormatla(son.kha_tarihi)} />
            <Alan etiket="Tanım Gösterge (KHA D/K eşleşme)" deger={tanimGostergeKha ?? '—'} />
            <Alan etiket="EKEA D/K" deger={dk(son.ekea_derece, son.ekea_kademe)} />
            <Alan etiket="EKEA Tarihi" deger={tarihFormatla(son.ekea_tarihi)} />
            <Alan etiket="Kıdem Yılı" deger={son.kidem_yili} />
            <Alan etiket="Kıdem Tarihi" deger={tarihFormatla(son.kidem_tarihi)} />
            <Alan etiket="İyi Hal Terfi Tarihi" deger={tarihFormatla(son.iyi_hal_terfi_tarihi)} />
            <Alan etiket="Ek Gösterge" deger={son.ek_gosterge} />
            <Alan etiket="Ek Ödeme" deger={son.ek_odeme} />
            <Alan etiket="ÖHT" deger={son.oht} />
            <Alan etiket="Yan Ödeme" deger={son.yan_odeme} />
            <Alan etiket="SDS Oranı" deger={son.sds_orani} />
          </div>
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tarihçe (Terfi Ettir Öncesi)</p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 py-2">Terfi İşlem Tarihi</th>
                    <th className="text-left px-3 py-2">Önceki KHA D/K</th>
                    <th className="text-left px-3 py-2">Önceki EKEA D/K</th>
                    <th className="text-left px-3 py-2">Önceki Kıdem Yılı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(terfiOncesiTarihce ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-400">
                        Terfi öncesi tarihçe kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    (terfiOncesiTarihce ?? []).map((t, i) => (
                      <tr key={`onceki-${i}`}>
                        <td className="px-3 py-2 text-slate-600">{tarihFormatla(t.islem_tarihi)}</td>
                        <td className="px-3 py-2 text-slate-700">{t.kha_dk}</td>
                        <td className="px-3 py-2 text-slate-700">{t.ekea_dk}</td>
                        <td className="px-3 py-2 text-slate-700">{t.kidem_yili}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── İzin Bilgileri ───────────────────────────────────────────────────────────

function IzinBilgileriTab({
  izinHaklari, izinHareketleri,
}: { izinHaklari: IzinHak[]; izinHareketleri: IzinHareketi[] }) {
  const buYil = new Date().getFullYear()

  const yillar = useMemo(() => {
    const set = new Set<number>()
    izinHaklari.forEach(h => set.add(h.yil))
    izinHareketleri.forEach(h => set.add(h.yil))
    set.add(buYil)
    return Array.from(set).sort((a, b) => b - a).slice(0, 6)
  }, [izinHaklari, izinHareketleri, buYil])

  const defaultYil = useMemo(() => {
    const nonTaslakYillar = izinHareketleri.filter(h => h.durum !== 'Taslak').map(h => h.yil).filter((y): y is number => typeof y === 'number')
    return nonTaslakYillar.length ? Math.max(...nonTaslakYillar) : buYil
  }, [izinHareketleri, buYil])
  const [secilenYil, setSecilenYil] = useState(defaultYil)
  useEffect(() => { setSecilenYil(prev => (yillar.length && !yillar.includes(prev) ? defaultYil : prev)) }, [defaultYil, yillar])

  const hakBuYil = izinHaklari.find(h => h.yil === secilenYil)
  const hareketlerBuYil = izinHareketleri
    .filter(h => h.yil === secilenYil && h.durum !== 'Taslak')
    .sort((a, b) => parseInt(b.sira_no ?? '0') - parseInt(a.sira_no ?? '0'))

  const devreden  = hakBuYil?.devreden_gun  ?? 0
  const hakEdilen = hakBuYil?.hak_edilen_gun ?? 0
  const kullanilan = hakBuYil?.kullanilan_gun ?? 0
  const kalan     = devreden + hakEdilen - kullanilan

  return (
    <div className="space-y-5">
      {/* Yıl sekmeleri */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {yillar.map(y => (
            <button key={y} onClick={() => setSecilenYil(y)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                y === secilenYil
                  ? 'border-slate-800 text-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* İzin Özeti */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-slate-700 mb-3">İzin Özeti</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Alan etiket="Devreden Gün"   deger={String(devreden)} />
          <Alan etiket="Hak Edilen Gün" deger={String(hakEdilen)} />
          <Alan etiket="Kullanılan Gün" deger={String(kullanilan)} />
          <Alan etiket="Kalan Gün"      deger={String(kalan)} />
        </div>
      </div>

      {/* İzin Hareketleri */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">İzin Hareketleri (Taslak dışı)</h3>
        </div>
        {hareketlerBuYil.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">{secilenYil} yılında izin hareketi yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Sıra No</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Tür</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Ayrılış</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Başlama</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Gün</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Durum</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Vekalet</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Açıklama</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Bilgi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hareketlerBuYil.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {h.sira_no ? `${h.yil}/${h.sira_no}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{h.tur}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{tarihFormatla(h.ayrilis)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{tarihFormatla(h.baslama)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{h.gun}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DURUM_RENK[h.durum] ?? 'bg-slate-100 text-slate-600'}`}>
                        {h.durum}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{h.vekalet ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{h.aciklama ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{h.bilgi ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Eğitim Bilgileri ─────────────────────────────────────────────────────────

function EgitimTab({ egitimKatilimlari }: { egitimKatilimlari: { egitim_adi: string; program: 'Evet' | 'Hayır'; donem_adi?: string }[] }) {
  const [aktifAltSekme, setAktifAltSekme] = useState<'Program' | 'Diğer'>('Program')
  const programEgitimler = egitimKatilimlari.filter(e => e.program === 'Evet')
  const digerEgitimler = egitimKatilimlari.filter(e => e.program !== 'Evet')
  const listele = aktifAltSekme === 'Program' ? programEgitimler : digerEgitimler

  if (egitimKatilimlari.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Eğitim bilgisi bulunamadı.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setAktifAltSekme('Program')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            aktifAltSekme === 'Program' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500'
          }`}
        >
          Program ({programEgitimler.length})
        </button>
        <button
          type="button"
          onClick={() => setAktifAltSekme('Diğer')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            aktifAltSekme === 'Diğer' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500'
          }`}
        >
          Diğer ({digerEgitimler.length})
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Eğitim Adı</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Dönem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listele.map((e, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{e.egitim_adi}</td>
                  <td className="px-4 py-3 text-slate-600">{e.donem_adi ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Performans Bilgileri ─────────────────────────────────────────────────────

function PerformansTab() {
  return (
    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-sm">Performans bilgileri henüz aktif değil.</p>
    </div>
  )
}

// ─── Geçmiş ───────────────────────────────────────────────────────────────────

function GecmisTab({ hareketler }: { hareketler: PH[] }) {
  if (hareketler.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Personel hareketi kaydı bulunamadı.
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Personel Hareketleri ({hareketler.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Yürürlük Tarihi</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Hareket Tipi</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Yeni Ünvan</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Yeni Görev Yeri</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hareketler.map(h => (
              <tr key={h.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{tarihFormatla(h.yururluk_tarihi)}</td>
                <td className="px-4 py-3 text-slate-700">{h.hareket_tipi ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{h.yeni_unvan ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{h.yeni_gorev_yeri ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{h.aciklama ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function PersonelDetayClient({
  kaynak, calisan, kadrolar, hareketler, izinHaklari, izinHareketleri,
  terfiKayitlari, ogrenimler, aileBildirimi, malKayitlari = [], egitimKatilimlari = [], yevmiyeFazlaMesaiAylik, onKisiselGuncelle,
  tanimGostergeKha = null,
  terfiOncesiTarihce = [],
  saltOkunur = false,
}: Props) {
  const searchParams = useSearchParams()
  const [aktif, setAktif] = useState<Sekme>('Kişisel Bilgiler')

  useEffect(() => {
    if (searchParams.get('sekme') === 'gecmis') setAktif('Geçmiş')
  }, [searchParams])
  const sicil = (calisan.sicil_no ?? '').trim()
  const duzenleSegment = encodeURIComponent((calisan as { public_id?: string }).public_id ?? sicil)
  const asilDolu = kadrolar.some(k => (k.asil ?? '').trim() === sicil && (k.durumu ?? '') === 'Dolu')
  const vekilVar = kadrolar.some(k => (k.vekil ?? '').trim() === sicil)
  const kadroDurumu = asilDolu ? 'Dolu' : vekilVar ? 'Vekil' : null
  const kadroEtiket = kadroDurumu
    ? ({
        'Dolu':  'bg-green-100 text-green-700',
        'Vekil': 'bg-amber-100 text-amber-700',
        'Boş':   'bg-slate-100 text-slate-500',
      }[kadroDurumu] ?? 'bg-slate-100 text-slate-500')
    : null

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">
              Personel Görüntüle - Sicil No: {calisan.sicil_no}
            </h1>
            {kadroDurumu && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${kadroEtiket}`}>
                {kadroDurumu}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 font-medium">{calisan.ad_soyad}</p>
        </div>
        <div className="flex items-center gap-2">
          {((aktif === 'Kişisel Bilgiler' || kaynak === 'ayrilanlar') && onKisiselGuncelle && !saltOkunur) && (
            <Link
              href={`/personel/${duzenleSegment}/duzenle${kaynak ? `?kaynak=${kaynak}` : ''}`}
              className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              Değiştir
            </Link>
          )}
          {saltOkunur ? (
            <Link href="/" className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              Ana sayfa
            </Link>
          ) : (
            <Link href={kaynak === 'ayrilanlar' ? '/personel/ayrilanlar' : '/personel'}
              className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              ← Listeye Dön
            </Link>
          )}
        </div>
      </div>

      {/* Sekme Çubuğu */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex min-w-max">
            {SEKMELER.map(s => (
              <button key={s} onClick={() => setAktif(s)}
                className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  aktif === s
                    ? 'border-slate-800 text-slate-800 bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Sekme İçeriği */}
        <div className="p-6">
          {aktif === 'Kişisel Bilgiler'     && <KisiselTab calisan={calisan} kadrolar={kadrolar} />}
          {aktif === 'Öğrenim Bilgileri'    && <OgrenimTab ogrenimler={ogrenimler} />}
          {aktif === 'Aile Bilgileri'       && <AileTab aileBildirimi={aileBildirimi} />}
          {aktif === 'Mal Bildirimleri'     && <MalBildirimTab malKayitlari={malKayitlari} />}
          {aktif === 'Kadro Bilgileri'      && <KadroTab kadrolar={kadrolar} sicilNo={calisan.sicil_no} />}
          {aktif === 'Katsayı Bilgileri'    && (
            <KatsayiTab
              terfiKayitlari={terfiKayitlari}
              kadrolar={kadrolar}
              yevmiyeFazlaMesaiAylik={yevmiyeFazlaMesaiAylik}
              tanimGostergeKha={tanimGostergeKha}
              terfiOncesiTarihce={terfiOncesiTarihce}
            />
          )}
          {aktif === 'İzin Bilgileri'       && (
            <IzinBilgileriTab
              izinHaklari={izinHaklari}
              izinHareketleri={izinHareketleri}
            />
          )}
          {aktif === 'Eğitim Bilgileri'     && <EgitimTab egitimKatilimlari={egitimKatilimlari ?? []} />}
          {aktif === 'Performans Bilgileri' && <PerformansTab />}
          {aktif === 'Geçmiş'              && <GecmisTab hareketler={hareketler} />}
        </div>
      </div>
    </div>
  )
}
