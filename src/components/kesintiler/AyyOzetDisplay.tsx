'use client'

import { useState, useMemo } from 'react'
import type { AyyHesapSonucu, AyyPersonelOzet } from '@/lib/ayy-hesap'

interface Donem {
  id: number
  donem_adi: string | null
  sira_no?: string | null
  baslangic_tarihi: string
  bitis_tarihi: string
  durum?: 'Açık' | 'Kapalı'
  yil?: number
}

interface Props {
  donem:      Donem
  sonuc:      AyyHesapSonucu
  tatilSayisi: number
}

type Sekme = 'ozet' | 'takipteki' | 'donemdeki' | 'askidaki'

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function PersonelTablosu({ satirlar, etiket }: { satirlar: AyyPersonelOzet[]; etiket: string }) {
  const toplamK  = satirlar.reduce((s, p) => s + p.K,  0)
  const toplamSD = satirlar.reduce((s, p) => s + p.SD, 0)
  const toplamIZ = satirlar.reduce((s, p) => s + p.IZ, 0)
  const toplamOD = satirlar.reduce((s, p) => s + p.OD, 0)

  if (satirlar.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-sm">{etiket} bu dönemde kayıt yok.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{satirlar.length} personel</p>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Toplam Yemek Alacağı Gün: <span className="font-semibold text-slate-700">{toplamK}</span></span>
          <span>Toplam Sonraki Döneme: <span className="font-semibold text-amber-600">{toplamSD}</span></span>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-center px-3 py-3 font-semibold text-slate-500 w-10">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sicil</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Unvan</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-28 bg-blue-50 text-blue-700">Önceki Dönemden</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-20">Ham İzin</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24 bg-orange-50 text-orange-700">Kesintilen İzin</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24">Yemekli Gün</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-28 bg-red-50 text-red-700">Yemek Alacağı Gün</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24 bg-amber-50 text-amber-700">Sonraki Döneme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.map(p => (
              <tr key={`${p.sicil_no}-${p.sira_no_seq}`} className={`transition-colors ${p.isZabita ? 'bg-violet-50/30 hover:bg-violet-50' : 'hover:bg-slate-50'}`}>
                <td className="px-3 py-2.5 text-center text-xs text-slate-400">{p.sira_no_seq}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sicil_no}</td>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-slate-800">{p.ad_soyad}</span>
                  {p.isZabita && <span className="ml-1.5 text-[10px] text-violet-600 font-medium bg-violet-100 px-1.5 py-0.5 rounded">Z</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 hidden md:table-cell">{p.unvan || '—'}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-blue-700">{p.OD > 0 ? p.OD : '—'}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm text-slate-600">{p.hamIzin ?? 0}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-orange-700">{p.IZ > 0 ? p.IZ : '—'}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm text-slate-600">{p.YG}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-semibold text-red-700">{p.K}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-amber-700">{p.SD > 0 ? p.SD : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Toplam</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-blue-700">{toplamOD > 0 ? toplamOD : '—'}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-slate-600">{satirlar.reduce((s, p) => s + (p.hamIzin ?? 0), 0)}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-orange-700">{toplamIZ > 0 ? toplamIZ : '—'}</td>
              <td className="px-3 py-2.5 text-center">—</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-red-700">{toplamK}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-amber-700">{toplamSD > 0 ? toplamSD : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function AyyOzetDisplay({ donem, sonuc, tatilSayisi }: Props) {
  const [sekme, setSekme] = useState<Sekme>('ozet')
  const [arama, setArama] = useState('')

  const toplamKesinti = useMemo(() => sonuc.personeller.reduce((s, p) => s + p.K, 0), [sonuc])

  // Zabıtaları listenin en altına taşı (kalın)
  function zabitalariAltaTasi<T extends { isZabita?: boolean }>(list: T[]): T[] {
    const diger = list.filter(p => !p.isZabita)
    const zabitalar = list.filter(p => p.isZabita)
    return [...diger, ...zabitalar]
  }
  const toplamSD      = useMemo(() => sonuc.personeller.reduce((s, p) => s + p.SD, 0), [sonuc])
  const zabitaSayisi  = useMemo(() => sonuc.personeller.filter(p => p.isZabita).length, [sonuc])

  function filtreUygula(list: AyyPersonelOzet[]) {
    const q = arama.toLowerCase()
    if (!q) return list
    return list.filter(p =>
      p.ad_soyad.toLowerCase().includes(q) ||
      p.sicil_no.toLowerCase().includes(q)
    )
  }

  const sekmeler: { key: Sekme; label: string; sayisi: number }[] = [
    { key: 'ozet',      label: 'Genel Özet',      sayisi: sonuc.personeller.length  },
    { key: 'takipteki', label: 'Takipteki İzinler', sayisi: sonuc.takipteki.length    },
    { key: 'donemdeki', label: 'Dönemdeki İzinler', sayisi: sonuc.donemdeki.length    },
    { key: 'askidaki',  label: 'Askıdaki İzinler',  sayisi: sonuc.askidaki.length     },
  ]

  const sekmeData: Record<Sekme, AyyPersonelOzet[]> = {
    ozet:      zabitalariAltaTasi(filtreUygula(sonuc.personeller)),
    takipteki: zabitalariAltaTasi(filtreUygula(sonuc.takipteki)),
    donemdeki: zabitalariAltaTasi(filtreUygula(sonuc.donemdeki)),
    askidaki:  zabitalariAltaTasi(filtreUygula(sonuc.askidaki)),
  }

  const sekmeAciklamalar: Record<Sekme, string> = {
    ozet:      'Tüm kategorileri kapsayan personel bazında özet.',
    takipteki: 'İzin başlangıç tarihi dönemden önce; izin bu dönem içinde ve/veya sonrasında bitiyor.',
    donemdeki: 'İzin başlangıç ve bitiş tarihleri dönem içinde yer alıyor.',
    askidaki:  'İzin başlangıç tarihi dönem bitişinden sonra — ileride düşülecek.',
  }

  return (
    <div>
      {/* KPI Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Dönem Çalışma Günü',  deger: sonuc.donemAktifGun, renk: 'slate',  aciklama: `${tatilSayisi} tatil hariç` },
          { label: 'Toplam Personel',      deger: sonuc.personeller.length, renk: 'indigo', aciklama: `${zabitaSayisi} zabıta` },
          { label: 'Toplam Yemek Alacağı Gün', deger: toplamKesinti, renk: 'red', aciklama: 'kesinti' },
          { label: 'Sonraki Döneme (SD)',  deger: toplamSD,      renk: 'amber',  aciklama: 'devreden' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold text-${k.renk}-700`}>{k.deger}</p>
            <p className="text-xs text-slate-400 mt-1">{k.aciklama}</p>
          </div>
        ))}
      </div>

      {/* Sütun Açıklaması */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { ad: 'Önceki Dönemden (OD)', renk: 'bg-blue-100 text-blue-700' },
          { ad: 'Ham İzin', renk: 'bg-slate-100 text-slate-600' },
          { ad: 'Kesintilen İzin (İZ)', renk: 'bg-orange-100 text-orange-700' },
          { ad: 'Yemekli Gün (YG)', renk: 'bg-slate-100 text-slate-600' },
          { ad: 'Yemek Alacağı Gün', renk: 'bg-red-100 text-red-700' },
          { ad: 'Sonraki Döneme (SD)', renk: 'bg-amber-100 text-amber-700' },
          { ad: 'Zabıta (30 gün baz)', renk: 'bg-violet-100 text-violet-700' },
        ].map(s => (
          <span key={s.ad} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${s.renk}`}>
            {s.ad}
          </span>
        ))}
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad veya sicil ara…"
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
        {sekmeler.map(s => (
          <button key={s.key} onClick={() => setSekme(s.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              sekme === s.key
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}>
            {s.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              sekme === s.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
            }`}>{s.sayisi}</span>
          </button>
        ))}
      </div>

      {/* Sekme açıklaması */}
      <p className="text-xs text-slate-400 mb-3">{sekmeAciklamalar[sekme]}</p>

      {/* İçerik */}
      <PersonelTablosu satirlar={sekmeData[sekme]} etiket={sekmeler.find(s => s.key === sekme)?.label ?? ''} />
    </div>
  )
}
