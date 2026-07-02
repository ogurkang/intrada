'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trNormalize } from '@/lib/turkce-search'

interface HareketSatir {
  id:                number
  sicil_no:          string
  ad_soyad:          string
  hareket_tipi:      string | null
  kadro_id:          number | null
  kadro_rol:         'asil' | 'vekil' | 'yok'
  yururluk_tarihi:   string | null
  ise_baslama_tarihi: string | null
  ayrilis_tarihi:    string | null
  yeni_gorev_yeri:   string | null
  yeni_unvan:        string | null
  eski_gorev_yeri:   string | null
  eski_unvan:        string | null
  aciklama:          string | null
  kayit_zamani:      string
  hareket_id:        number | null
  salt_okunur:       boolean
}

interface Props {
  hareketler:   HareketSatir[]
  hareketTipleri: string[]
}

/** gg.aa.yyyy formatında tarih */
function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

const HAREKET_RENK: Record<string, string> = {
  'Atama':        'bg-indigo-100 text-indigo-700',
  'Naklen Atama': 'bg-blue-100 text-blue-700',
  'İstifa':       'bg-red-100 text-red-700',
  'Emeklilik':    'bg-orange-100 text-orange-700',
  'Görevlendirme':'bg-teal-100 text-teal-700',
  'Vekâlet':      'bg-purple-100 text-purple-700',
  'Ayrılış':      'bg-rose-100 text-rose-700',
}

export default function PersonelHareketiListClient({ hareketler, hareketTipleri }: Props) {
  const router = useRouter()
  const [arama, setArama]       = useState('')
  const [tipFiltre, setTip]     = useState('')
  const [yilFiltre, setYil]     = useState('')

  const yillar = useMemo(() => {
    const s = new Set(hareketler.map(h => h.yururluk_tarihi?.substring(0, 4)).filter(Boolean))
    return [...s].sort((a, b) => (b ?? '').localeCompare(a ?? ''))
  }, [hareketler])

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    return hareketler.filter(h => {
      if (q && !(
        trNormalize(h.ad_soyad).includes(q) ||
        trNormalize(h.sicil_no).includes(q) ||
        trNormalize(h.yeni_gorev_yeri).includes(q)
      )) return false
      if (tipFiltre && (h.hareket_tipi ?? '') !== tipFiltre) return false
      if (yilFiltre && !h.yururluk_tarihi?.startsWith(yilFiltre)) return false
      return true
    })
  }, [hareketler, arama, tipFiltre, yilFiltre])

  function satirAcYeniSekme(h: HareketSatir) {
    if (h.hareket_id && h.hareket_id > 0) {
      const href = `/personel-hareketleri/${h.hareket_id}/goruntule?popup=1`
      const w = window.open(href, '_blank')
      if (!w) router.push(href)
      return
    }
    const q =
      h.kadro_id && h.kadro_id > 0
        ? `?kadro_id=${h.kadro_id}&rol=${h.kadro_rol}&popup=1`
        : '?popup=1'
    const href = `/personel-hareketleri/${h.sicil_no}/goruntule${q}`
    const w = window.open(href, '_blank')
    if (!w) router.push(href)
  }

  function gecmisAcYeniSekme(h: HareketSatir) {
    const href = `/personel/${encodeURIComponent(h.sicil_no)}?sekme=gecmis`
    const w = window.open(href, '_blank')
    if (!w) router.push(href)
  }

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const ok =
        typeof e.data === 'object' &&
        e.data != null &&
        (e.data as { source?: string; type?: string }).source === 'intrada-personel-hareketleri' &&
        (e.data as { type?: string }).type === 'refresh'
      if (ok) router.refresh()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [router])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Personel Hareketleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Toplam <span className="font-semibold">{hareketler.length}</span> kayıt
            {filtreli.length !== hareketler.length && (
              <span className="ml-2 text-indigo-600 font-medium">({filtreli.length} sonuç)</span>
            )}
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad, sicil veya yer ara…"
          className="flex-1 min-w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
        <select value={tipFiltre} onChange={e => setTip(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">Tüm Hareket Tipleri</option>
          {hareketTipleri.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={yilFiltre} onChange={e => setYil(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">Tüm Yıllar</option>
          {yillar.map(y => <option key={y} value={y!}>{y}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sicil</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">Hareket Tipi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Yürürlük Tarihi</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Yeni Yer / Unvan</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={7} className="text-center py-14 text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {filtreli.map((h, idx) => (
              <tr
                key={h.id}
                onClick={() => satirAcYeniSekme(h)}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-center text-xs text-slate-400">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{h.sicil_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{h.ad_soyad}</td>
                <td className="px-4 py-3">
                  {h.hareket_tipi ? (
                    <>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${HAREKET_RENK[h.hareket_tipi] ?? 'bg-slate-100 text-slate-600'}`}>
                        {h.hareket_tipi}
                      </span>
                      {h.salt_okunur && (
                        <span className="inline-flex ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                          Salt Okunur
                        </span>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs tabular-nums text-slate-500">
                  {tarih(h.yururluk_tarihi)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {h.yeni_gorev_yeri ? <span className="font-medium">{h.yeni_gorev_yeri}</span> : ''}
                  {h.yeni_unvan ? <span className="ml-1 text-slate-400">/ {h.yeni_unvan}</span> : ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      title="Detayı görüntüle"
                      onClick={e => { e.stopPropagation(); satirAcYeniSekme(h) }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M2.04 12.32a1 1 0 010-.64C3.42 7.51 7.36 4.5 12 4.5s8.58 3.01 9.96 7.18a1 1 0 010 .64C20.58 16.49 16.64 19.5 12 19.5s-8.58-3.01-9.96-7.18z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title="Log kayıtları (Geçmiş)"
                      onClick={e => { e.stopPropagation(); gecmisAcYeniSekme(h) }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
