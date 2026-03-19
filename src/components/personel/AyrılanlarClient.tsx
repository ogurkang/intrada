'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AyrılanSatır {
  sicil_no:        string
  ad_soyad:        string
  statu:           string | null
  kadro_unvani:    string | null
  gorev_mudurlugu: string | null
  ayrilis_tarihi:  string | null
  ayrilis_nedeni:  string | null
}

interface Props {
  ayrilanlar: AyrılanSatır[]
  onAktifEt?: (fd: FormData) => Promise<{ hata?: string }>
}

export default function AyrılanlarClient({ ayrilanlar, onAktifEt }: Props) {
  const router = useRouter()
  const [arama, setArama]     = useState('')
  const [mudFiltre, setMud]   = useState('')
  const [yilFiltre, setYil]   = useState('')
  const [secili, setSecili]   = useState<AyrılanSatır | null>(null)
  const [hata, setHata]       = useState<string | null>(null)
  const [isPending, setPending] = useState(false)

  const mudurluler = useMemo(() =>
    [...new Set(ayrilanlar.map(a => a.gorev_mudurlugu ?? 'Belirtilmemiş'))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'))
  , [ayrilanlar])

  const yillar = useMemo(() => {
    const s = new Set(ayrilanlar.map(a => a.ayrilis_tarihi?.substring(0, 4)).filter(Boolean))
    return [...s].sort((a, b) => (b ?? '').localeCompare(a ?? ''))
  }, [ayrilanlar])

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase()
    return ayrilanlar.filter(a =>
      (!q || a.ad_soyad.toLowerCase().includes(q) || a.sicil_no.toLowerCase().includes(q)) &&
      (!mudFiltre || (a.gorev_mudurlugu ?? 'Belirtilmemiş') === mudFiltre) &&
      (!yilFiltre || a.ayrilis_tarihi?.startsWith(yilFiltre))
    )
  }, [ayrilanlar, arama, mudFiltre, yilFiltre])
  const sayfaBasina = 10
  const [sayfa, setSayfa] = useState(0)
  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / sayfaBasina))
  const sayfadaki = filtreli.slice(sayfa * sayfaBasina, (sayfa + 1) * sayfaBasina)
  useEffect(() => setSayfa(0), [arama, mudFiltre, yilFiltre])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Ayrılanlar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kurumdan ayrılan personel — toplam <span className="font-semibold">{ayrilanlar.length}</span> kayıt
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" placeholder="Ad veya sicil ara…" value={arama} onChange={e => setArama(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-60" />
          </div>
          <Link href="/personel"
            className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">
            ← Çalışanlara Dön
          </Link>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={mudFiltre} onChange={e => setMud(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">Tüm Müdürlükler</option>
          {mudurluler.map(m => <option key={m} value={m}>{m}</option>)}
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
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Statü</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Unvan</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Müdürlük</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Ayrılış Tarihi</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ayrılış Nedeni</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sayfadaki.length === 0 && (
              <tr><td colSpan={9} className="text-center py-14 text-slate-400">
                {arama || mudFiltre || yilFiltre ? 'Filtre kriterlerine uygun kayıt bulunamadı.' : 'Ayrılan personel kaydı yok.'}
              </td></tr>
            )}
            {sayfadaki.map((a, i) => (
              <tr
                key={a.sicil_no}
                onClick={() => router.push(`/personel/${a.sicil_no}?kaynak=ayrilanlar`)}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-center text-xs text-slate-400">{sayfa * sayfaBasina + i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.sicil_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{a.ad_soyad}</td>
                <td className="px-4 py-3">
                  {a.statu ? (
                    <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {a.statu}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{a.kadro_unvani ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{a.gorev_mudurlugu ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {a.ayrilis_tarihi ? (
                    <span className="inline-flex px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                      {new Date(a.ayrilis_tarihi).toLocaleDateString('tr-TR')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{a.ayrilis_nedeni ?? '—'}</td>
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  {onAktifEt && (
                    <button
                      type="button"
                      onClick={() => { setSecili(a); setHata(null) }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-green-500 text-green-600 hover:bg-green-50 text-xs font-bold"
                      title="Aktif Et"
                    >
                      ✓
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      {secili && onAktifEt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-3">
              {secili.ad_soyad} ({secili.sicil_no}) – Aktif Et
            </h2>
            <form
              onSubmit={async e => {
                e.preventDefault()
                setHata(null)
                setPending(true)
                const fd = new FormData(e.currentTarget)
                fd.set('sicil_no', secili.sicil_no)
                const res = await onAktifEt(fd)
                setPending(false)
                if (res.hata) {
                  setHata(res.hata)
                } else {
                  setSecili(null)
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kuruma Giriş Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  name="giris_tarihi"
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Giriş Nedeni
                </label>
                <input
                  name="neden"
                  type="text"
                  placeholder="Atama, nakil vb."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              {hata && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {hata}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { if (!isPending) { setSecili(null); setHata(null) } }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Kaydediliyor…' : 'Aktif Et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
