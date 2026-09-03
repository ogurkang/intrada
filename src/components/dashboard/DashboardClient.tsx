'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { personelDetayHref } from '@/lib/personel-link'
import GorevHatirlaticiWidget, { type GorevHatirlaticiItem } from '@/components/dashboard/GorevHatirlaticiWidget'
import Modal from '@/components/ui/Modal'
import { IZIN_HAKKI_YETERSIZ_MESAJ } from '@/lib/izin-mesaj'
import type { DashboardStatuEtiket } from '@/lib/dashboard-statu-sayilari'
import { DASHBOARD_STATU_ETIKETLERI } from '@/lib/dashboard-statu-sayilari'

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface KadroDoluluk {
  dolu:  number
  vekil: number
  bos:   number
}

export interface IzinIstatistik {
  taslak:       number
  onaylandi:    number
  iptal:        number
  degistirildi: number
}

export interface BekleyenIzin {
  id:             number
  sira_no?:       string | null
  sicil_no:       string
  public_id?:     string
  ad_soyad:       string | null
  izin_turu:      string | null
  baslangic:      string | null
  bitis:          string | null
  gun_sayisi:     number | null
  olusturma_tarihi: string | null
  islem_yapan?:   string | null
}

export interface YaklaşanTatil {
  id:                number
  tatil_adi:         string | null
  tatil_turu:        string | null
  tatil_baslangici:  string | null
  tatil_bitisi:      string | null
}

export interface IzindekiPersonel {
  id:         number
  sicil_no:   string
  public_id?: string
  ad_soyad:   string | null
  izin_turu:  string | null
  bitis:      string | null
}

export interface IzinArtisAdayi {
  sicil_no: string
  public_id?: string
  ad_soyad: string | null
  kidem_tarihi: string | null
  kidem_yili: number
  mevcut_hak: number
  onerilen_hak: number
}

interface Props {
  statuSayilari: Record<DashboardStatuEtiket, number>
  kadroDoluluk:        KadroDoluluk
  izinIstatistik:      IzinIstatistik
  bekleyenIzinler:     BekleyenIzin[]
  yaklaşanTatiller:    YaklaşanTatil[]
  izindekiler:         IzindekiPersonel[]
  izinArtisAdaylari:   IzinArtisAdayi[]
  gorevHatirlaticilar: GorevHatirlaticiItem[]
  mihenkTasiSayisi:    number
  buYil:               number
  canEditIzinHak:      boolean
  onDurumDegistir:     (id: number, yeniDurum: 'Onaylandı' | 'İptal Edildi') => Promise<{ hata?: string }>
}

const STATU_KART_RENK: Record<DashboardStatuEtiket, string> = {
  Memur: 'bg-blue-50 border-blue-200 text-blue-800',
  'İşçi': 'bg-orange-50 border-orange-200 text-orange-800',
  Sözleşmeli: 'bg-teal-50 border-teal-200 text-teal-800',
  'Meclis Üyesi': 'bg-purple-50 border-purple-200 text-purple-800',
  'Belediye Başkanı': 'bg-amber-50 border-amber-200 text-amber-800',
}

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function tarihFormatla(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

function tarihUzun(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function kalanGun(tarih: string | null) {
  if (!tarih) return null
  const fark = Math.ceil((new Date(tarih).getTime() - Date.now()) / 86400000)
  return fark
}

// ─── KPI Kart ────────────────────────────────────────────────────────────────
function KpiKart({ baslik, deger, alt, renk, href }: {
  baslik: string; deger: number | string; alt?: string; renk: string; href?: string
}) {
  const icerik = (
    <div className={`rounded-xl border p-5 h-full ${renk} transition-shadow hover:shadow-md`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">{baslik}</p>
      <p className="text-4xl font-bold leading-none mb-1">{deger}</p>
      {alt && <p className="text-xs opacity-60 mt-1">{alt}</p>}
    </div>
  )
  if (!href) return icerik
  const prefetch = href !== '/mihenk-taslari'
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-xl"
    >
      {icerik}
    </Link>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function DashboardClient({
  statuSayilari, kadroDoluluk, izinIstatistik,
  bekleyenIzinler, yaklaşanTatiller, izindekiler, izinArtisAdaylari,
  gorevHatirlaticilar,
  mihenkTasiSayisi,
  buYil, canEditIzinHak, onDurumDegistir,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [islemIdler, setIslemIdler]  = useState<Set<number>>(new Set())
  const [hatalar, setHatalar]        = useState<Record<number, string>>({})
  const [uyariPopup, setUyariPopup]  = useState<string | null>(null)

  function hızlıIslem(id: number, durum: 'Onaylandı' | 'İptal Edildi') {
    setIslemIdler(prev => new Set(prev).add(id))
    startTransition(async () => {
      const res = await onDurumDegistir(id, durum)
      setIslemIdler(prev => { const s = new Set(prev); s.delete(id); return s })
      if (res.hata) {
        if (res.hata === IZIN_HAKKI_YETERSIZ_MESAJ) setUyariPopup(res.hata)
        else setHatalar(prev => ({ ...prev, [id]: res.hata! }))
      }
    })
  }

  const kadroToplam = kadroDoluluk.dolu + kadroDoluluk.vekil + kadroDoluluk.bos || 1
  const dolulukYuzde = Math.round(((kadroDoluluk.dolu + kadroDoluluk.vekil) / kadroToplam) * 100)
  const aktifToplam = DASHBOARD_STATU_ETIKETLERI.reduce((s, e) => s + statuSayilari[e], 0)

  return (
    <div className="space-y-6">

      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Statü KPI + Kadro Doluluk + Mihenk Taşları */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Aktif personel (asil kadro) · toplam {aktifToplam}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {DASHBOARD_STATU_ETIKETLERI.map(etiket => (
            <KpiKart
              key={etiket}
              baslik={etiket}
              deger={statuSayilari[etiket]}
              alt="asil dolu kadro"
              renk={STATU_KART_RENK[etiket]}
              href="/personel"
            />
          ))}
          <KpiKart
            baslik="Kadro Doluluk"
            deger={`%${dolulukYuzde}`}
            alt={`${kadroDoluluk.dolu + kadroDoluluk.vekil} / ${kadroToplam} kadro dolu`}
            renk="bg-indigo-50 border-indigo-200 text-indigo-800"
            href="/kadro"
          />
          <KpiKart
            baslik="Mihenk Taşları"
            deger={mihenkTasiSayisi}
            alt="source kodu geliştirmesi"
            renk="bg-violet-50 border-violet-200 text-violet-800"
            href="/mihenk-taslari"
          />
        </div>
      </div>

      {/* Alt iki kolon */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Sol: Bekleyen İzinler */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              Bekleyen İzin Talepleri
              {izinIstatistik.taslak > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {izinIstatistik.taslak}
                </span>
              )}
            </h2>
            <Link href="/izin" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Tümünü gör →</Link>
          </div>

          {bekleyenIzinler.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Bekleyen izin talebi yok</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bekleyenIzinler.map(iz => (
                <div key={iz.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link href={personelDetayHref({ sicil_no: iz.sicil_no, public_id: iz.public_id })}
                          className="font-medium text-sm text-slate-800 hover:text-slate-600 truncate">
                          {iz.ad_soyad ?? iz.sicil_no}
                        </Link>
                        {iz.izin_turu && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                            {iz.izin_turu}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500" title="Ayrılış / izin başlangıcı – işe başlama">
                        {iz.sira_no ? <span className="font-medium">Sıra No: {iz.sira_no}</span> : null}
                        {iz.sira_no ? <span className="mx-1.5 text-slate-300">•</span> : null}
                        {tarihFormatla(iz.baslangic)} – {tarihFormatla(iz.bitis)}
                        {iz.gun_sayisi && <span className="ml-1 font-medium">({iz.gun_sayisi} gün)</span>}
                        {iz.olusturma_tarihi && (
                          <span className="ml-2 text-slate-400">· {tarihUzun(iz.olusturma_tarihi)}</span>
                        )}
                      </p>
                      {hatalar[iz.id] && <p className="text-xs text-red-600 mt-0.5">{hatalar[iz.id]}</p>}
                    </div>
                    <div className="shrink-0 min-w-[180px] pt-0.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">İşlem Yapan</p>
                      <p className="text-xs text-slate-600 truncate" title={iz.islem_yapan ?? undefined}>
                        {iz.islem_yapan ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => hızlıIslem(iz.id, 'Onaylandı')}
                        disabled={islemIdler.has(iz.id)}
                        className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-40">
                        Onayla
                      </button>
                      <button
                        onClick={() => hızlıIslem(iz.id, 'İptal Edildi')}
                        disabled={islemIdler.has(iz.id)}
                        className="text-xs font-medium px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40">
                        İptal
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sağ: Tatiller + İzindekiler */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Yaklaşan Tatiller */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Yaklaşan Tatiller</h2>
              <Link href="/tanimlar/tatil" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Düzenle →</Link>
            </div>
            {yaklaşanTatiller.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Yaklaşan tatil yok</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {yaklaşanTatiller.map(t => {
                  const kalan = kalanGun(t.tatil_baslangici)
                  return (
                    <div key={t.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{t.tatil_adi}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tarihFormatla(t.tatil_baslangici)}
                            {t.tatil_bitisi && t.tatil_bitisi !== t.tatil_baslangici && ` – ${tarihFormatla(t.tatil_bitisi)}`}
                          </p>
                        </div>
                        {kalan !== null && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            kalan <= 7  ? 'bg-red-100 text-red-700' :
                            kalan <= 30 ? 'bg-amber-100 text-amber-700' :
                                          'bg-slate-100 text-slate-600'
                          }`}>
                            {kalan === 0 ? 'Bugün' : kalan < 0 ? 'Geçti' : `${kalan} gün`}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Yıllık İzni Artacaklar / Eklenecekler */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                Yıllık İzni Artacaklar / Eklenecekler
                {izinArtisAdaylari.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {izinArtisAdaylari.length}
                  </span>
                )}
              </h2>
            </div>
            {izinArtisAdaylari.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Güncelleme bekleyen izin artışı yok</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {izinArtisAdaylari.map(p => (
                  <div key={p.sicil_no} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <Link href={personelDetayHref({ sicil_no: p.sicil_no, public_id: p.public_id })}
                        className="text-sm font-medium text-slate-800 hover:text-slate-600">
                        {p.ad_soyad ?? p.sicil_no}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kıdem: {p.kidem_yili} · {p.mevcut_hak} → {p.onerilen_hak} gün
                        {p.kidem_tarihi ? ` · Terfi: ${tarihFormatla(p.kidem_tarihi)}` : ''}
                      </p>
                    </div>
                    {canEditIzinHak ? (
                      <Link
                        href={`/izin/haklar/duzenle?yil=${buYil}&sicil_no=${encodeURIComponent(p.sicil_no)}&return_to=${encodeURIComponent('/')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap">
                        İzin Hakkını Düzenle
                      </Link>
                    ) : (
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">Sadece admin düzenleyebilir</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <GorevHatirlaticiWidget items={gorevHatirlaticilar} />

        </div>
      </div>

      <Modal
        open={uyariPopup != null}
        onClose={() => setUyariPopup(null)}
        title="İzin Hakkı Uyarısı"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed pt-2">{uyariPopup}</p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setUyariPopup(null)}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
