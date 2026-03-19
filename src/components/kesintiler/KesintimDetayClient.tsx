'use client'

import { useState, useMemo } from 'react'
import type { KesintimHesapSonucu, KesintimModul, KesintimPersonelOzet } from '@/lib/kesinym-hesap'

interface Donem {
  id:               number
  donem_adi:        string | null
  sira_no:          string | null
  baslangic_tarihi: string
  bitis_tarihi:     string
  durum:            'Açık' | 'Kapalı'
  yil:              number
}

interface Props {
  modul: KesintimModul
  donem: Donem
  sonuc: KesintimHesapSonucu
}

type Sekme = 'ozet' | 'takipteki' | 'donemdeki' | 'askidaki'

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

const MODUL_ETIKET: Record<KesintimModul, string> = {
  rmy: 'Raporlu Memurlar (RMY)',
  ivy: 'İzinli Vekiller (IVY)',
  izy: 'İzinli Zabıtalar (IZY)',
}

// ─── Tablo ───────────────────────────────────────────────────────────────────

interface TabloProps {
  modul:   KesintimModul
  satirlar: KesintimPersonelOzet[]
  etiket:  string
}

function PersonelTablosu({ modul, satirlar, etiket }: TabloProps) {
  const toplamK  = satirlar.reduce((s, p) => s + p.K,  0)
  const toplamSD = satirlar.reduce((s, p) => s + p.SD, 0)
  const toplamOD = satirlar.reduce((s, p) => s + p.OD, 0)
  const toplamR  = satirlar.reduce((s, p) => s + p.R,  0)
  const toplamRR = satirlar.reduce((s, p) => s + p.RR, 0)
  const toplamIZ = satirlar.reduce((s, p) => s + p.IZ, 0)

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
          <span>Toplam Kesinti: <span className="font-semibold text-slate-700">{toplamK}</span></span>
          {toplamSD > 0 && (
            <span>Toplam SD: <span className="font-semibold text-amber-600">{toplamSD}</span></span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[650px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-center px-3 py-3 font-semibold text-slate-500 w-10">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sicil</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Unvan</th>
              <th
                className="text-center px-3 py-3 font-semibold w-16 bg-blue-50 text-blue-700"
                title="Önceki Dönemden Devreden"
              >OD</th>
              {modul === 'rmy' ? (
                <>
                  <th
                    className="text-center px-3 py-3 font-semibold w-16 bg-orange-50 text-orange-700"
                    title="Rapor Günü"
                  >R</th>
                  <th
                    className="text-center px-3 py-3 font-semibold w-16 bg-orange-50/60 text-orange-600"
                    title="Refakatçi Raporu Günü"
                  >RR</th>
                </>
              ) : (
                <th
                  className="text-center px-3 py-3 font-semibold w-16 bg-orange-50 text-orange-700"
                  title="İzin Günü"
                >İZ</th>
              )}
              <th
                className="text-center px-3 py-3 font-semibold w-16 bg-red-50 text-red-700"
                title="Kesinti"
              >K</th>
              <th
                className="text-center px-3 py-3 font-semibold w-16 bg-amber-50 text-amber-700"
                title="Sonraki Döneme Devreden"
              >SD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.map(p => (
              <tr key={p.sicil_no} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 text-center text-xs text-slate-400">{p.seq}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sicil_no}</td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{p.ad_soyad}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500 hidden md:table-cell">{p.unvan || '—'}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-blue-700">
                  {p.OD > 0 ? p.OD : '—'}
                </td>
                {modul === 'rmy' ? (
                  <>
                    <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-orange-700">
                      {p.R > 0 ? p.R : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-orange-600">
                      {p.RR > 0 ? p.RR : '—'}
                    </td>
                  </>
                ) : (
                  <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-orange-700">
                    {p.IZ > 0 ? p.IZ : '—'}
                  </td>
                )}
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-semibold text-red-700">{p.K}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-amber-700">
                  {p.SD > 0 ? p.SD : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Toplam</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-blue-700">
                {toplamOD > 0 ? toplamOD : '—'}
              </td>
              {modul === 'rmy' ? (
                <>
                  <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-orange-700">
                    {toplamR > 0 ? toplamR : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-orange-600">
                    {toplamRR > 0 ? toplamRR : '—'}
                  </td>
                </>
              ) : (
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-orange-700">
                  {toplamIZ > 0 ? toplamIZ : '—'}
                </td>
              )}
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-red-700">{toplamK}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-amber-700">
                {toplamSD > 0 ? toplamSD : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function KesintimDetayClient({ modul, donem, sonuc }: Props) {
  const [sekme, setSekme] = useState<Sekme>('ozet')
  const [arama, setArama] = useState('')

  const toplamKesinti = useMemo(() => sonuc.personeller.reduce((s, p) => s + p.K, 0), [sonuc])
  const toplamSD      = useMemo(() => sonuc.personeller.reduce((s, p) => s + p.SD, 0), [sonuc])

  const basMs = new Date(donem.baslangic_tarihi).setHours(0,0,0,0)
  const bitMs = new Date(donem.bitis_tarihi).setHours(0,0,0,0)
  const takvimGun = Math.floor((bitMs - basMs) / 86_400_000) + 1

  function filtrele(list: KesintimPersonelOzet[]) {
    const q = arama.toLowerCase()
    if (!q) return list
    return list.filter(p =>
      p.ad_soyad.toLowerCase().includes(q) ||
      p.sicil_no.toLowerCase().includes(q)
    )
  }

  const sekmeler: { key: Sekme; label: string; sayisi: number }[] = [
    { key: 'ozet',      label: 'Genel Özet',        sayisi: sonuc.personeller.length },
    { key: 'takipteki', label: 'Takipteki İzinler',  sayisi: sonuc.takipteki.length  },
    { key: 'donemdeki', label: 'Dönemdeki İzinler',  sayisi: sonuc.donemdeki.length  },
    { key: 'askidaki',  label: 'Askıdaki İzinler',   sayisi: sonuc.askidaki.length   },
  ]

  const sekmeData: Record<Sekme, KesintimPersonelOzet[]> = {
    ozet:      filtrele(sonuc.personeller),
    takipteki: filtrele(sonuc.takipteki),
    donemdeki: filtrele(sonuc.donemdeki),
    askidaki:  filtrele(sonuc.askidaki),
  }

  const sekmeAciklamalar: Record<Sekme, string> = {
    ozet:      'Tüm kategorileri kapsayan personel bazında özet.',
    takipteki: 'İzin başlangıç tarihi dönemden önce; bu dönemde ve/veya sonrasında devam ediyor.',
    donemdeki: 'İzin başlangıç tarihi bu dönem içinde.',
    askidaki:  'İzin başlangıç tarihi dönem bitişinden sonra — ileride işlenecek.',
  }

  const sutunAciklamalari = modul === 'rmy'
    ? [
        { kod: 'OD', ad: 'Önceki Dönemden Devreden', renk: 'bg-blue-100 text-blue-700' },
        { kod: 'R',  ad: 'Rapor Günü',                renk: 'bg-orange-100 text-orange-700' },
        { kod: 'RR', ad: 'Refakatçi Raporu',          renk: 'bg-orange-50 text-orange-600 border border-orange-200' },
        { kod: 'K',  ad: 'Kesinti',                   renk: 'bg-red-100 text-red-700' },
        { kod: 'SD', ad: 'Sonraki Döneme Devreden',   renk: 'bg-amber-100 text-amber-700' },
      ]
    : [
        { kod: 'OD', ad: 'Önceki Dönemden Devreden', renk: 'bg-blue-100 text-blue-700' },
        { kod: 'İZ', ad: 'İzin Günü',                 renk: 'bg-orange-100 text-orange-700' },
        { kod: 'K',  ad: 'Kesinti',                   renk: 'bg-red-100 text-red-700' },
        { kod: 'SD', ad: 'Sonraki Döneme Devreden',   renk: 'bg-amber-100 text-amber-700' },
      ]

  const kapasite = modul === 'izy' ? takvimGun : Math.min(takvimGun, 30)

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            {MODUL_ETIKET[modul]}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">
            {donem.donem_adi ?? donem.sira_no ?? `Dönem #${donem.id}`}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tarih(donem.baslangic_tarihi)} – {tarih(donem.bitis_tarihi)}
            <span className="mx-2 text-slate-300">·</span>
            <span className={`font-medium ${donem.durum === 'Açık' ? 'text-green-600' : 'text-slate-400'}`}>
              {donem.durum}
            </span>
          </p>
        </div>
      </div>

      {/* KPI Kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Dönem Takvim Günü',
            deger: takvimGun,
            renk: 'slate',
            aciklama: modul === 'izy' ? `Cap yok` : `Cap: ${kapasite} gün`,
          },
          {
            label: 'Toplam Personel',
            deger: sonuc.personeller.length,
            renk: 'indigo',
            aciklama: `${sonuc.takipteki.length} takip · ${sonuc.donemdeki.length} dönem`,
          },
          {
            label: 'Toplam Kesinti (K)',
            deger: toplamKesinti,
            renk: 'red',
            aciklama: 'gün',
          },
          {
            label: 'Sonraki Döneme (SD)',
            deger: toplamSD,
            renk: 'amber',
            aciklama: 'devreden',
          },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold text-${k.renk}-700`}>{k.deger}</p>
            <p className="text-xs text-slate-400 mt-1">{k.aciklama}</p>
          </div>
        ))}
      </div>

      {/* Sütun Açıklamaları */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {sutunAciklamalari.map(s => (
          <span
            key={s.kod}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${s.renk}`}
          >
            <span className="font-bold">{s.kod}</span>
            <span className="opacity-75">= {s.ad}</span>
          </span>
        ))}
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Ad veya sicil ara…"
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
        {sekmeler.map(s => (
          <button
            key={s.key}
            onClick={() => setSekme(s.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              sekme === s.key
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}
          >
            {s.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              sekme === s.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {s.sayisi}
            </span>
          </button>
        ))}
      </div>

      {/* Sekme açıklaması */}
      <p className="text-xs text-slate-400 mb-3">{sekmeAciklamalar[sekme]}</p>

      {/* Tablo */}
      <PersonelTablosu
        modul={modul}
        satirlar={sekmeData[sekme]}
        etiket={sekmeler.find(s => s.key === sekme)?.label ?? ''}
      />
    </div>
  )
}
