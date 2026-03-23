'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { personelDetayHref } from '@/lib/personel-link'

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
  sicil_no:       string
  public_id?:     string
  ad_soyad:       string | null
  izin_turu:      string | null
  baslangic:      string | null
  bitis:          string | null
  gun_sayisi:     number | null
  olusturma_tarihi: string | null
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

interface Props {
  aktifPersonelSayisi: number
  kadroDoluluk:        KadroDoluluk
  izinIstatistik:      IzinIstatistik
  bekleyenIzinler:     BekleyenIzin[]
  yaklaşanTatiller:    YaklaşanTatil[]
  izindekiler:         IzindekiPersonel[]
  buYil:               number
  onDurumDegistir:     (id: number, yeniDurum: 'Onaylandı' | 'İptal Edildi') => Promise<{ hata?: string }>
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
    <div className={`rounded-xl border p-5 ${renk} transition-shadow hover:shadow-md`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">{baslik}</p>
      <p className="text-4xl font-bold leading-none mb-1">{deger}</p>
      {alt && <p className="text-xs opacity-60 mt-1">{alt}</p>}
    </div>
  )
  return href ? <Link href={href}>{icerik}</Link> : icerik
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function DashboardClient({
  aktifPersonelSayisi, kadroDoluluk, izinIstatistik,
  bekleyenIzinler, yaklaşanTatiller, izindekiler,
  buYil, onDurumDegistir,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [islemIdler, setIslemIdler]  = useState<Set<number>>(new Set())
  const [hatalar, setHatalar]        = useState<Record<number, string>>({})

  function hızlıIslem(id: number, durum: 'Onaylandı' | 'İptal Edildi') {
    setIslemIdler(prev => new Set(prev).add(id))
    startTransition(async () => {
      const res = await onDurumDegistir(id, durum)
      setIslemIdler(prev => { const s = new Set(prev); s.delete(id); return s })
      if (res.hata) setHatalar(prev => ({ ...prev, [id]: res.hata! }))
    })
  }

  const kadroToplam = kadroDoluluk.dolu + kadroDoluluk.vekil + kadroDoluluk.bos || 1
  const dolulukYuzde = Math.round(((kadroDoluluk.dolu + kadroDoluluk.vekil) / kadroToplam) * 100)

  const izinToplam = izinIstatistik.taslak + izinIstatistik.onaylandi +
                     izinIstatistik.iptal  + izinIstatistik.degistirildi || 1

  return (
    <div className="space-y-6">

      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiKart
          baslik="Aktif Personel"
          deger={aktifPersonelSayisi}
          alt={`${kadroDoluluk.dolu} dolu · ${kadroDoluluk.vekil} vekil · ${kadroDoluluk.bos} boş kadro`}
          renk="bg-blue-50 border-blue-200 text-blue-800"
          href="/personel"
        />
        <KpiKart
          baslik="Kadro Doluluk"
          deger={`%${dolulukYuzde}`}
          alt={`${kadroDoluluk.dolu + kadroDoluluk.vekil} / ${kadroToplam} kadro dolu`}
          renk="bg-indigo-50 border-indigo-200 text-indigo-800"
          href="/kadro"
        />
        <KpiKart
          baslik={`${buYil} İzin Hareketleri`}
          deger={izinIstatistik.onaylandi}
          alt={`${izinIstatistik.taslak} bekleyen · ${izinIstatistik.iptal} iptal`}
          renk="bg-green-50 border-green-200 text-green-800"
          href="/izin"
        />
        <KpiKart
          baslik="Bekleyen Talepler"
          deger={izinIstatistik.taslak}
          alt="onay bekleyen izin"
          renk={izinIstatistik.taslak > 0
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-slate-50 border-slate-200 text-slate-600'
          }
          href="/izin"
        />
      </div>

      {/* Kadro doluluk çubuğu */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Kadro Doluluk Durumu</h2>
          <Link href="/kadro" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Tümünü gör →</Link>
        </div>
        <div className="flex rounded-full overflow-hidden h-4 gap-0.5 mb-3">
          {kadroDoluluk.dolu > 0 && (
            <div className="bg-green-500 transition-all"
              style={{ width: `${(kadroDoluluk.dolu / kadroToplam) * 100}%` }} title={`Dolu: ${kadroDoluluk.dolu}`} />
          )}
          {kadroDoluluk.vekil > 0 && (
            <div className="bg-amber-400 transition-all"
              style={{ width: `${(kadroDoluluk.vekil / kadroToplam) * 100}%` }} title={`Vekil: ${kadroDoluluk.vekil}`} />
          )}
          {kadroDoluluk.bos > 0 && (
            <div className="bg-slate-200 transition-all"
              style={{ width: `${(kadroDoluluk.bos / kadroToplam) * 100}%` }} title={`Boş: ${kadroDoluluk.bos}`} />
          )}
        </div>
        <div className="flex gap-5 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Dolu: {kadroDoluluk.dolu}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />Vekil: {kadroDoluluk.vekil}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block" />Boş: {kadroDoluluk.bos}</span>
        </div>
      </div>

      {/* İzin dağılım çubuğu */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">{buYil} Yılı İzin Dağılımı</h2>
          <Link href="/izin" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Tümünü gör →</Link>
        </div>
        <div className="flex rounded-full overflow-hidden h-4 gap-0.5 mb-3">
          {izinIstatistik.onaylandi > 0 && (
            <div className="bg-green-500" style={{ width: `${(izinIstatistik.onaylandi / izinToplam) * 100}%` }} />
          )}
          {izinIstatistik.taslak > 0 && (
            <div className="bg-amber-400" style={{ width: `${(izinIstatistik.taslak / izinToplam) * 100}%` }} />
          )}
          {izinIstatistik.degistirildi > 0 && (
            <div className="bg-blue-400" style={{ width: `${(izinIstatistik.degistirildi / izinToplam) * 100}%` }} />
          )}
          {izinIstatistik.iptal > 0 && (
            <div className="bg-slate-300" style={{ width: `${(izinIstatistik.iptal / izinToplam) * 100}%` }} />
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Onaylı: {izinIstatistik.onaylandi}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />Bekleyen: {izinIstatistik.taslak}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />Değiştirildi: {izinIstatistik.degistirildi}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />İptal: {izinIstatistik.iptal}</span>
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
                  <div className="flex items-start justify-between gap-3">
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
                      <p className="text-xs text-slate-500">
                        {tarihFormatla(iz.baslangic)} – {tarihFormatla(iz.bitis)}
                        {iz.gun_sayisi && <span className="ml-1 font-medium">({iz.gun_sayisi} gün)</span>}
                        {iz.olusturma_tarihi && (
                          <span className="ml-2 text-slate-400">· {tarihUzun(iz.olusturma_tarihi)}</span>
                        )}
                      </p>
                      {hatalar[iz.id] && <p className="text-xs text-red-600 mt-0.5">{hatalar[iz.id]}</p>}
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

          {/* Bugün İzinde */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                Bugün İzinde
                {izindekiler.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {izindekiler.length}
                  </span>
                )}
              </h2>
            </div>
            {izindekiler.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Bugün izinde personel yok</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {izindekiler.map(p => (
                  <div key={p.id} className="px-5 py-2.5 flex items-center justify-between">
                    <div>
                      <Link href={personelDetayHref({ sicil_no: p.sicil_no, public_id: p.public_id })}
                        className="text-sm font-medium text-slate-800 hover:text-slate-600">
                        {p.ad_soyad ?? p.sicil_no}
                      </Link>
                      {p.izin_turu && (
                        <p className="text-xs text-slate-400">{p.izin_turu}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">→ {tarihFormatla(p.bitis)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
