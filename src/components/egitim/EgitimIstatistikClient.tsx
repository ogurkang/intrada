'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'

export interface IstatistikDonem {
  id:        number
  yil:       number
  donem_adi: string
}

export interface IstatistikEgitim {
  id:               number
  egitim_adi:       string
  kisa_ad:          string | null
  kanal:            string | null
  sure_dakika:      number
  katilimci_sayisi: number
  program:          string | null  // 'Program' | 'Diğer' | 'Evet' | 'Hayır'
}

export interface IstatistikPersonel {
  sicil_no: string
  ad_soyad: string | null
  mudurluk: string | null
}

interface Props {
  donemler:       IstatistikDonem[]
  seciliDonem:    IstatistikDonem | null
  egitimler:      IstatistikEgitim[]
  personeller:    IstatistikPersonel[]
  katilimSet:     Set<string>  // "sicil_no:egitim_id"
  donemId?:       number
  mudurlukMap?:   Record<string, string>
  onKatilimKaydet?: (egitim_id: number, donem_id: number, sicilNolar: string[], mudurlukMap: Record<string, string>) => Promise<{ hata?: string }>
}

function sureFmt(dk: number) {
  if (!dk) return '—'
  const s = Math.floor(dk / 60)
  const d = dk % 60
  return s > 0 ? `${s}s ${d > 0 ? d + 'dk' : ''}`.trim() : `${d}dk`
}

const TUR_PROGRAM = 'Program'
const TUR_DIGER = 'Diğer'

function programTur(p: string | null): string {
  if (!p) return TUR_DIGER
  if (p === 'Evet' || p === 'Program') return TUR_PROGRAM
  return TUR_DIGER
}

export default function EgitimIstatistikClient({
  donemler, seciliDonem, egitimler, personeller, katilimSet, donemId, mudurlukMap = {}, onKatilimKaydet,
}: Props) {
  const [mudFiltre, setMudFiltre] = useState('')
  const [arama, setArama] = useState('')
  const [turSekme, setTurSekme] = useState<'Program' | 'Diğer'>(TUR_PROGRAM)
  const [isaretleMode, setIsaretleMode] = useState(false)
  const [yerelKatilim, setYerelKatilim] = useState<Set<string>>(new Set(katilimSet))
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const mudurluler = useMemo(() =>
    [...new Set(personeller.map(p => p.mudurluk ?? 'Belirtilmemiş'))].sort((a, b) => a.localeCompare(b, 'tr'))
  , [personeller])

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    return personeller.filter(p =>
      (!mudFiltre || (p.mudurluk ?? 'Belirtilmemiş') === mudFiltre) &&
      (!q || (p.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) || p.sicil_no.toLocaleLowerCase('tr-TR').includes(q))
    )
  }, [personeller, mudFiltre, arama])

  const egitimlerByTur = useMemo(() => {
    const program = egitimler.filter(e => programTur(e.program) === TUR_PROGRAM)
    const diger = egitimler.filter(e => programTur(e.program) === TUR_DIGER)
    return { [TUR_PROGRAM]: program, [TUR_DIGER]: diger }
  }, [egitimler])

  const seciliEgitimler = egitimlerByTur[turSekme] ?? egitimlerByTur[TUR_PROGRAM]

  const aktifKatilim = isaretleMode ? yerelKatilim : katilimSet

  function toggleKatilim(sicil_no: string, egitim_id: number) {
    if (!isaretleMode) return
    const key = `${sicil_no}:${egitim_id}`
    setYerelKatilim(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  async function handleKaydet() {
    if (!onKatilimKaydet || !seciliDonem || donemId == null) return
    setHata(null)
    startTransition(async () => {
      for (const e of egitimler) {
        const sicilNolar = personeller
          .filter(p => yerelKatilim.has(`${p.sicil_no}:${e.id}`))
          .map(p => p.sicil_no)
        const res = await onKatilimKaydet(e.id, donemId, sicilNolar, mudurlukMap)
        if (res?.hata) {
          setHata(res.hata)
          return
        }
      }
      setIsaretleMode(false)
      window.location.reload()
    })
  }

  function kisiSayisi(egitim_id: number) {
    let say = 0
    personeller.forEach(p => {
      if (aktifKatilim.has(`${p.sicil_no}:${egitim_id}`)) say++
    })
    return say
  }

  function kisiEgitimSayisi(sicil_no: string, egitimList: IstatistikEgitim[]) {
    return egitimList.filter(e => aktifKatilim.has(`${sicil_no}:${e.id}`)).length
  }

  if (!seciliDonem) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Eğitim İstatistiği</h1>
        <p className="text-slate-500 mb-4">İstatistik görüntülemek için bir dönem seçin.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {donemler.map(d => (
            <Link key={d.id} href={`/egitim/istatistik?donem=${d.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
              <p className="font-semibold text-slate-800">{d.donem_adi}</p>
              <p className="text-xs text-slate-400 mt-0.5">{d.yil}</p>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/egitim/istatistik" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
          ← Dönem Seç
        </Link>
        <span className="text-slate-300">/</span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{seciliDonem.donem_adi} — İstatistik</h1>
          <p className="text-sm text-slate-500 mt-0.5">{egitimler.length} eğitim · {personeller.length} personel</p>
        </div>
        <Link href={`/egitim/${seciliDonem.id}`}
          className="text-sm font-medium text-slate-600 hover:text-slate-800 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Takvim Sayfası →
        </Link>
      </div>

      {/* Filtreler + Eğitimleri İşaretle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-3">
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ad veya sicil ara…"
            className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          <select value={mudFiltre} onChange={e => setMudFiltre(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
            <option value="">Tüm Müdürlükler</option>
            {mudurluler.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          {!isaretleMode ? (
            <button type="button" onClick={() => { setIsaretleMode(true); setYerelKatilim(new Set(katilimSet)) }}
              className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors">
              Eğitimleri İşaretle
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setIsaretleMode(false); setYerelKatilim(new Set(katilimSet)) }}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
                İptal
              </button>
              <button type="button" onClick={handleKaydet} disabled={isPending || !onKatilimKaydet || donemId == null}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tür sekmeleri */}
      {egitimler.length > 0 && (
        <div className="flex gap-1 mb-4">
          <button
            type="button"
            onClick={() => setTurSekme(TUR_PROGRAM)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              turSekme === TUR_PROGRAM ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Program ({egitimlerByTur[TUR_PROGRAM]?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTurSekme(TUR_DIGER)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              turSekme === TUR_DIGER ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Diğer ({egitimlerByTur[TUR_DIGER]?.length ?? 0})
          </button>
        </div>
      )}

      {hata && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{hata}</div>
      )}

      {egitimler.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          Bu döneme ait eğitim kaydı bulunamadı.
        </div>
      )}

      {seciliEgitimler.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: `${seciliEgitimler.length * 80 + 260}px` }}>
              <thead>
                {/* Eğitim başlıkları */}
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 z-20 px-3 py-3 text-left font-semibold text-slate-600 min-w-48 border-r border-slate-200">
                    Personel
                  </th>
                  <th className="px-2 py-3 text-center font-semibold text-slate-600 w-14 border-r border-slate-200">
                    Toplam
                  </th>
                  {seciliEgitimler.map(e => (
                    <th key={e.id} className="px-2 py-2 border-r border-slate-100 w-20">
                      <p className="font-semibold text-slate-700 text-center leading-tight truncate max-w-[72px] mx-auto"
                        title={e.egitim_adi}>
                        {e.kisa_ad ?? e.egitim_adi.substring(0, 8)}
                      </p>
                      {e.kanal && (
                        <p className="text-slate-400 text-center mt-0.5">{e.kanal.substring(0, 6)}</p>
                      )}
                    </th>
                  ))}
                </tr>
                {/* Katılım sayıları */}
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 z-20 border-r border-slate-200 px-3 py-1.5 text-left text-[10px] text-slate-400 font-normal">
                    {filtreli.length} personel gösteriliyor
                  </th>
                  <th className="border-r border-slate-200" />
                  {seciliEgitimler.map(e => (
                    <th key={e.id} className="text-center py-1.5 font-bold text-indigo-600 border-r border-slate-100">
                      {kisiSayisi(e.id)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtreli.length === 0 && (
                  <tr>
                    <td colSpan={seciliEgitimler.length + 2} className="text-center py-10 text-slate-400">
                      Filtre kriterlerine uygun personel bulunamadı.
                    </td>
                  </tr>
                )}
                {filtreli.map(p => {
                  const toplamEgitim = kisiEgitimSayisi(p.sicil_no, seciliEgitimler)
                  return (
                    <tr key={p.sicil_no} className="hover:bg-slate-50 transition-colors">
                      <td className="sticky left-0 bg-white z-10 px-3 py-2 border-r border-slate-200">
                        <p className="font-medium text-slate-800 leading-tight">{p.ad_soyad ?? p.sicil_no}</p>
                        <p className="text-slate-400 font-mono text-[10px] mt-0.5">{p.mudurluk ?? p.sicil_no}</p>
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-200">
                        <span className={`font-bold tabular-nums ${
                          toplamEgitim === seciliEgitimler.length ? 'text-green-600' :
                          toplamEgitim > 0 ? 'text-indigo-600' : 'text-slate-300'
                        }`}>
                          {toplamEgitim}
                        </span>
                      </td>
                      {seciliEgitimler.map(e => {
                        const katildi = aktifKatilim.has(`${p.sicil_no}:${e.id}`)
                        return (
                          <td key={e.id} className="px-2 py-2 text-center border-r border-slate-100">
                            {isaretleMode ? (
                              <label className="flex items-center justify-center cursor-pointer">
                                <input type="checkbox" checked={katildi}
                                  onChange={() => toggleKatilim(p.sicil_no, e.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                              </label>
                            ) : katildi ? (
                              <svg className="w-4 h-4 mx-auto text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {egitimler.length > 0 && seciliEgitimler.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
          Bu türde eğitim bulunmuyor.
        </div>
      )}
    </div>
  )
}
