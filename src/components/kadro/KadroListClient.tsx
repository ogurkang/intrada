'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import KadroFormModal from './KadroForm'
import type { Tables } from '@/types/database'

type Kadro   = Tables<'kadro_hareketleri'>
type Durumu  = Kadro['durumu']
interface Personel { sicil_no: string; ad_soyad: string }

interface Props {
  data: Kadro[]
  personeller: Personel[]
  statuler: string[]
  mudurluler: string[]
  unvanlar: { id: number; unvan_adi: string }[]
  gelisNedenleri?: string[]
  ayrilisNedenleri?: string[]
  onEkle:     (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

const DURUM_RENK: Record<string, string> = {
  Dolu:  'bg-green-100 text-green-700',
  Vekil: 'bg-amber-100 text-amber-700',
  Boş:   'bg-slate-100 text-slate-500',
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function KadroListClient({ data, personeller, statuler, mudurluler, unvanlar, gelisNedenleri, ayrilisNedenleri, onEkle, onGuncelle }: Props) {
  const router = useRouter()
  const [sadece_aktif, setSadeceAktif] = useState(true)
  const [durumFiltre, setDurumFiltre]  = useState<Durumu | 'Tümü'>('Tümü')
  const [statuSekme, setStatuSekme]   = useState('Tümü')
  const [aramaQ, setAramaQ]           = useState('')
  const [modalAcik, setModalAcik]     = useState(false)
  const [secili, setSecili]           = useState<Kadro | null>(null)
  const [sunuciHata, setSunuciHata]   = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const statuSekmeler = useMemo(() => {
    const benzersiz = [...new Set(data.map(k => k.statu).filter(Boolean) as string[])].sort()
    return ['Tümü', ...benzersiz]
  }, [data])

  const adMap = useMemo(() => {
    const m: Record<string, string> = {}
    personeller.forEach(p => { m[p.sicil_no] = p.ad_soyad })
    return m
  }, [personeller])

  const filtreli = useMemo(() => {
    let list = data
    if (statuSekme !== 'Tümü') list = list.filter(k => k.statu === statuSekme)
    if (sadece_aktif) list = list.filter(k => !k.ayrilis_tarihi)
    if (durumFiltre !== 'Tümü') list = list.filter(k => k.durumu === durumFiltre)
    if (aramaQ.trim()) {
      const q = aramaQ.toLowerCase()
      list = list.filter(k =>
        (k.kadro_sira_no ?? '').toLowerCase().includes(q) ||
        (k.kadro_unvani ?? '').toLowerCase().includes(q) ||
        (k.gorev_unvani ?? '').toLowerCase().includes(q) ||
        (k.kadro_mudurlugu ?? '').toLowerCase().includes(q) ||
        (k.asil ? (adMap[k.asil] ?? k.asil).toLowerCase().includes(q) : false) ||
        (k.statu ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [data, statuSekme, sadece_aktif, durumFiltre, aramaQ, adMap])

  function yeniEkleAc()       { setSecili(null); setSunuciHata(null); setModalAcik(true) }
  function duzenleAc(k: Kadro){ setSecili(k);    setSunuciHata(null); setModalAcik(true) }
  function kapat()             { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  async function handleSubmit(fd: FormData) {
    setSunuciHata(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  const istatistik = useMemo(() => ({
    dolu:  data.filter(k => !k.ayrilis_tarihi && k.durumu === 'Dolu').length,
    vekil: data.filter(k => !k.ayrilis_tarihi && k.durumu === 'Vekil').length,
    bos:   data.filter(k => !k.ayrilis_tarihi && k.durumu === 'Boş').length,
  }), [data])

  return (
    <div>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Kadro Hareketleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pozisyon atama ve görev kayıtları</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" placeholder="Ara…" value={aramaQ} onChange={e => setAramaQ(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-44" />
          </div>
          <button onClick={yeniEkleAc}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kayıt
          </button>
        </div>
      </div>

      {/* Statü Sekmeleri */}
      <div className="border-b border-slate-200 mb-5 overflow-x-auto">
        <div className="flex min-w-max gap-0">
          {statuSekmeler.map(s => (
            <button key={s} onClick={() => { setStatuSekme(s); setDurumFiltre('Tümü') }}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                statuSekme === s
                  ? 'border-slate-800 text-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {s}
              <span className="ml-1.5 text-xs text-slate-400">
                ({s === 'Tümü'
                  ? data.length
                  : data.filter(k => k.statu === s).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.dolu}</p>
          <p className="text-xs text-slate-500 mt-0.5">Dolu</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.vekil}</p>
          <p className="text-xs text-slate-500 mt-0.5">Vekil</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.bos}</p>
          <p className="text-xs text-slate-500 mt-0.5">Boş</p>
        </div>
      </div>

      {/* Filtre çubuğu */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mr-2">
          <input type="checkbox" checked={sadece_aktif} onChange={e => setSadeceAktif(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-slate-800" />
          Sadece aktif (ayrılmamış)
        </label>
        {(['Tümü', 'Dolu', 'Vekil', 'Boş'] as const).map(d => (
          <button key={d} onClick={() => setDurumFiltre(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              durumFiltre === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>
            {d}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-1">{filtreli.length} kayıt</span>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Kadro Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kadro / Görev Ünvanı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Müdürlük</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statü</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Asil Personel</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Giriş Tarihi</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400">
                  {aramaQ ? 'Arama sonucu bulunamadı.' : 'Kadro kaydı yok.'}
                </td></tr>
              )}
              {filtreli.map((k, idx) => (
                <tr
                  key={k.id}
                  onClick={() => router.push(`/kadro/${k.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{k.kadro_sira_no ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{k.kadro_unvani ?? '—'}</span>
                    {k.gorev_unvani && k.gorev_unvani !== k.kadro_unvani && (
                      <span className="block text-xs text-slate-400">→ {k.gorev_unvani}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {k.kadro_mudurlugu ?? '—'}
                    {k.gorev_mudurlugu && k.gorev_mudurlugu !== k.kadro_mudurlugu && (
                      <span className="block text-slate-400">→ {k.gorev_mudurlugu}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{k.statu ?? '—'}</td>
                  <td className="px-4 py-3">
                    {k.asil ? (
                      <>
                        <span className="font-medium text-slate-800">{adMap[k.asil] ?? k.asil}</span>
                        <span className="block text-xs text-slate-400 font-mono">{k.asil}</span>
                      </>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">
                    {tarih(k.kuruma_giris_tarihi)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${DURUM_RENK[k.durumu] ?? ''}`}>
                      {k.durumu}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtreli.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtreli.length} kayıt gösteriliyor
          </div>
        )}
      </div>

      <KadroFormModal
        open={modalAcik} onClose={kapat} onSubmit={handleSubmit}
        isPending={isPending} sunuciHata={sunuciHata}
        personeller={personeller} statuler={statuler} mudurluler={mudurluler}
        unvanlar={unvanlar}
        gelisNedenleri={gelisNedenleri}
        ayrilisNedenleri={ayrilisNedenleri}
        secili={secili}
      />
    </div>
  )
}
