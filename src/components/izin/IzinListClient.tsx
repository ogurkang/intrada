'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'

type IzinHareketi = Tables<'izin_hareketleri'>
type Durum = IzinHareketi['durum']

interface Personel { sicil_no: string; ad_soyad: string }

interface Props {
  hareketler: IzinHareketi[]
  secilenYil: number
  yillar: number[]
  personeller: Personel[]
  izinTurleri: string[]
  hakMap: Record<string, number>  // sicil_no → kalan_gun (bu yıl)
}

const DURUM_RENK: Record<string, string> = {
  'Onaylandı':    'bg-green-100 text-green-700',
  'Taslak':       'bg-slate-100 text-slate-600',
  'Değiştirildi': 'bg-amber-100 text-amber-700',
  'İptal Edildi': 'bg-red-100   text-red-600',
}
const DURUMLAR: Durum[] = ['Taslak', 'Onaylandı', 'Değiştirildi', 'İptal Edildi']

function tarihFormatla(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

export default function IzinListClient({
  hareketler, secilenYil, yillar, personeller, izinTurleri, hakMap,
}: Props) {
  const router = useRouter()
  const [durumFiltre, setDurumFiltre] = useState<Durum | 'Tümü'>('Tümü')
  const [aramaQ, setAramaQ]           = useState('')
  const [sayfa, setSayfa]             = useState(0)
  const SAYFA_BOYUTU = 10

  // Çalışan adları için map
  const adMap = useMemo(() => {
    const m: Record<string, string> = {}
    personeller.forEach(p => { m[p.sicil_no] = p.ad_soyad })
    return m
  }, [personeller])

  const filtreli = useMemo(() => {
    setSayfa(0)
    let list = hareketler
    if (durumFiltre !== 'Tümü') list = list.filter(h => h.durum === durumFiltre)
    if (aramaQ.trim()) {
      const q = aramaQ.toLowerCase()
      list = list.filter(h =>
        h.sicil_no.toLowerCase().includes(q) ||
        (adMap[h.sicil_no] ?? '').toLowerCase().includes(q) ||
        h.tur.toLowerCase().includes(q) ||
        (h.sira_no ?? '').includes(q)
      )
    }
    return list
  }, [hareketler, durumFiltre, aramaQ, adMap])

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUTU))
  const sayfadaki   = filtreli.slice(sayfa * SAYFA_BOYUTU, (sayfa + 1) * SAYFA_BOYUTU)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'refresh') window.location.reload()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const istatistik = useMemo(() => ({
    toplam:     hareketler.length,
    taslak:     hareketler.filter(h => h.durum === 'Taslak').length,
    onayli:     hareketler.filter(h => h.durum === 'Onaylandı').length,
    iptal:      hareketler.filter(h => h.durum === 'İptal Edildi').length,
    toplamGun:  hareketler.filter(h => h.durum === 'Onaylandı').reduce((s, h) => s + h.gun, 0),
  }), [hareketler])

  return (
    <div>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">İzin Hareketleri</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Yıl seçici */}
          <select value={secilenYil} onChange={e => router.push(`/izin?yil=${e.target.value}`)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
            {yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Arama */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" placeholder="İsim, sicil, tür…" value={aramaQ}
              onChange={e => setAramaQ(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-48" />
          </div>
          <Link href={`/izin/yeni?yil=${secilenYil}`} target="_blank"
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni İzin
          </Link>
        </div>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { etiket: 'Toplam Kayıt',  deger: istatistik.toplam,    renk: 'bg-slate-50 border-slate-200' },
          { etiket: 'Onaylanan',     deger: istatistik.onayli,    renk: 'bg-green-50 border-green-200' },
          { etiket: 'Taslak',        deger: istatistik.taslak,    renk: 'bg-slate-50 border-slate-200' },
          { etiket: 'Onaylı Gün ∑',  deger: istatistik.toplamGun, renk: 'bg-blue-50 border-blue-200'  },
        ].map(k => (
          <div key={k.etiket} className={`rounded-xl border p-4 ${k.renk}`}>
            <p className="text-2xl font-bold text-slate-800">{k.deger}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.etiket}</p>
          </div>
        ))}
      </div>

      {/* Durum filtre butonları */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['Tümü', ...DURUMLAR] as const).map(d => (
          <button key={d} onClick={() => setDurumFiltre(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              durumFiltre === d
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>
            {d}
            {d !== 'Tümü' && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                durumFiltre === d ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {hareketler.filter(h => h.durum === d).length}
              </span>
            )}
          </button>
        ))}
        {aramaQ && (
          <span className="text-xs text-slate-400 ml-2">
            {filtreli.length} / {hareketler.length} kayıt
          </span>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">İşlem Yapan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sicil No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Vekalet</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tür</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Ayrılış</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Başlama</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-14">Gün</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sayfadaki.length === 0 && (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400">
                  {aramaQ ? 'Arama sonucu bulunamadı.' : 'Bu yıla ait izin kaydı yok.'}
                </td></tr>
              )}
              {sayfadaki.map(h => (
                <tr key={h.id}
                  onClick={() => router.push(`/izin/${h.id}?yil=${secilenYil}`)}
                  className="hover:bg-slate-50 transition-colors text-xs cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {h.sira_no ? `${h.yil}/${h.sira_no}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{h.islem_yapan ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{h.sicil_no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{adMap[h.sicil_no] ?? h.sicil_no}</td>
                  <td className="px-4 py-3 text-slate-500">{h.vekalet ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{h.tur}</td>
                  <td className="px-4 py-3 text-center text-slate-600 tabular-nums">
                    {tarihFormatla(h.ayrilis)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 tabular-nums">
                    {tarihFormatla(h.baslama)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{h.gun}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${DURUM_RENK[h.durum] ?? ''}`}>
                      {h.durum}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {filtreli.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Toplam {filtreli.length} kayıt · Sayfa {sayfa + 1}/{toplamSayfa}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setSayfa(0)} disabled={sayfa === 0}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">İlk</button>
              <button onClick={() => setSayfa(p => Math.max(0, p - 1))} disabled={sayfa === 0}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Önceki</button>
              {Array.from({ length: Math.min(toplamSayfa, 5) }, (_, i) => {
                const start = Math.max(0, Math.min(sayfa - 2, toplamSayfa - 5))
                const p = start + i
                return (
                  <button key={p} onClick={() => setSayfa(p)}
                    className={`w-8 h-7 text-xs rounded border ${p === sayfa ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}>
                    {p + 1}
                  </button>
                )
              })}
              {toplamSayfa > 5 && <span className="text-xs text-slate-400">…{toplamSayfa}</span>}
              <button onClick={() => setSayfa(p => Math.min(toplamSayfa - 1, p + 1))} disabled={sayfa >= toplamSayfa - 1}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Sonraki</button>
              <button onClick={() => setSayfa(toplamSayfa - 1)} disabled={sayfa >= toplamSayfa - 1}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Son</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
