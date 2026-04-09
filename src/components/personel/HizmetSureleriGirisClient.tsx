'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'
import { personelDetayHref } from '@/lib/personel-link'
import type { HizmetSureGirisSatir } from '@/app/(dashboard)/personel/hizmet-sureleri-giris/actions'
import { trNormalize } from '@/lib/turkce-search'
import { karsilastirStatuSonraSicilAd } from '@/lib/statu-liste-siralama'

export type HizmetSureListeSatir = Pick<
  Tables<'calisan'>,
  | 'sicil_no'
  | 'public_id'
  | 'ad_soyad'
  | 'tckn'
  | 'gorev_turu'
  | 'hizmet_suresi_yil'
  | 'hizmet_suresi_ay'
  | 'hizmet_suresi_gun'
> & { statuEtiket: string }

function hizmetStr(n: number | null | undefined): string {
  return String(n ?? 0)
}

function parseHizmetInt(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function ayliksizIz(p: HizmetSureListeSatir): boolean {
  return (p.gorev_turu ?? 'Çalışan') === 'Aylıksız İzin'
}

interface Props {
  data: HizmetSureListeSatir[]
  statuSirali: string[]
  onSatirKaydet: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  onTopluKaydet: (satirlar: HizmetSureGirisSatir[]) => Promise<{
    hata?: string
    kaydedilen?: number
    atlanan?: number
  }>
}

export default function HizmetSureleriGirisClient({
  data,
  statuSirali,
  onSatirKaydet,
  onTopluKaydet,
}: Props) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [arama, setArama] = useState('')
  const [duzenlenenSicil, setDuzenlenenSicil] = useState<string | null>(null)
  const [inlineVeri, setInlineVeri] = useState<
    Record<string, { yil: string; ay: string; gun: string }>
  >({})
  const [topluVeri, setTopluVeri] = useState<
    Record<string, Partial<{ yil: string; ay: string; gun: string }>>
  >({})
  const [hata, setHata] = useState<string | null>(null)
  const [topluHata, setTopluHata] = useState<string | null>(null)
  const [topluBasari, setTopluBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sirali = useMemo(() => {
    return [...data].sort((a, b) =>
      karsilastirStatuSonraSicilAd(
        { statuEtiket: a.statuEtiket, sicil_no: a.sicil_no, ad_soyad: a.ad_soyad },
        { statuEtiket: b.statuEtiket, sicil_no: b.sicil_no, ad_soyad: b.ad_soyad },
        statuSirali,
      ),
    )
  }, [data, statuSirali])

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return sirali
    return sirali.filter(
      p =>
        trNormalize(p.ad_soyad).includes(q) ||
        trNormalize(p.sicil_no).includes(q) ||
        trNormalize(p.statuEtiket).includes(q) ||
        String(p.tckn ?? '').includes(q),
    )
  }, [sirali, arama])

  function duzenleAc(p: HizmetSureListeSatir) {
    if (ayliksizIz(p)) return
    setHata(null)
    setDuzenlenenSicil(p.sicil_no)
    setInlineVeri({
      [p.sicil_no]: {
        yil: hizmetStr(p.hizmet_suresi_yil),
        ay: hizmetStr(p.hizmet_suresi_ay),
        gun: hizmetStr(p.hizmet_suresi_gun),
      },
    })
  }

  function inlineDeger(p: HizmetSureListeSatir, key: 'yil' | 'ay' | 'gun'): string {
    const v = inlineVeri[p.sicil_no]
    if (v && key in v) return v[key] ?? ''
    if (key === 'yil') return hizmetStr(p.hizmet_suresi_yil)
    if (key === 'ay') return hizmetStr(p.hizmet_suresi_ay)
    return hizmetStr(p.hizmet_suresi_gun)
  }

  function inlineGuncelle(p: HizmetSureListeSatir, key: 'yil' | 'ay' | 'gun', deger: string) {
    setInlineVeri(prev => ({
      ...prev,
      [p.sicil_no]: {
        ...(prev[p.sicil_no] ?? {
          yil: hizmetStr(p.hizmet_suresi_yil),
          ay: hizmetStr(p.hizmet_suresi_ay),
          gun: hizmetStr(p.hizmet_suresi_gun),
        }),
        [key]: deger,
      },
    }))
  }

  async function handleInlineKaydet(p: HizmetSureListeSatir) {
    const v = inlineVeri[p.sicil_no]
    if (!v) return
    setHata(null)
    const fd = new FormData()
    fd.set('hizmet_suresi_yil', String(parseHizmetInt(v.yil)))
    fd.set('hizmet_suresi_ay', String(parseHizmetInt(v.ay)))
    fd.set('hizmet_suresi_gun', String(parseHizmetInt(v.gun)))
    startTransition(async () => {
      const res = await onSatirKaydet(p.sicil_no, fd)
      if (res.hata) setHata(res.hata)
      else {
        setDuzenlenenSicil(null)
        setInlineVeri({})
        router.refresh()
      }
    })
  }

  function topluGuncelle(sicil_no: string, key: 'yil' | 'ay' | 'gun', deger: string) {
    setTopluVeri(prev => ({
      ...prev,
      [sicil_no]: { ...(prev[sicil_no] ?? {}), [key]: deger },
    }))
  }

  function topluDegerAl(p: HizmetSureListeSatir, key: 'yil' | 'ay' | 'gun'): string {
    const l = topluVeri[p.sicil_no]
    if (l && l[key] !== undefined) return l[key] ?? ''
    if (key === 'yil') return hizmetStr(p.hizmet_suresi_yil)
    if (key === 'ay') return hizmetStr(p.hizmet_suresi_ay)
    return hizmetStr(p.hizmet_suresi_gun)
  }

  function topluSatirDegisti(p: HizmetSureListeSatir): boolean {
    const l = topluVeri[p.sicil_no]
    if (!l || Object.keys(l).length === 0) return false
    const yil = parseHizmetInt(l.yil !== undefined ? l.yil! : hizmetStr(p.hizmet_suresi_yil))
    const ay = parseHizmetInt(l.ay !== undefined ? l.ay! : hizmetStr(p.hizmet_suresi_ay))
    const gun = parseHizmetInt(l.gun !== undefined ? l.gun! : hizmetStr(p.hizmet_suresi_gun))
    return (
      yil !== (p.hizmet_suresi_yil ?? 0) ||
      ay !== (p.hizmet_suresi_ay ?? 0) ||
      gun !== (p.hizmet_suresi_gun ?? 0)
    )
  }

  function handleTopluKaydet() {
    setTopluHata(null)
    setTopluBasari(null)
    const degistirilmis = sirali.filter(p => topluSatirDegisti(p))
    if (!degistirilmis.length) {
      setTopluHata('Değişiklik yapılmadı.')
      return
    }
    const satirlar: HizmetSureGirisSatir[] = degistirilmis.map(p => {
      const l = topluVeri[p.sicil_no] ?? {}
      return {
        sicil_no: p.sicil_no,
        hizmet_suresi_yil: parseHizmetInt(l.yil !== undefined ? l.yil! : hizmetStr(p.hizmet_suresi_yil)),
        hizmet_suresi_ay: parseHizmetInt(l.ay !== undefined ? l.ay! : hizmetStr(p.hizmet_suresi_ay)),
        hizmet_suresi_gun: parseHizmetInt(l.gun !== undefined ? l.gun! : hizmetStr(p.hizmet_suresi_gun)),
      }
    })
    startTransition(async () => {
      const res = await onTopluKaydet(satirlar)
      if (res.hata) setTopluHata(res.hata)
      else {
        let msg = `${res.kaydedilen ?? satirlar.length} kayıt güncellendi.`
        if (res.atlanan && res.atlanan > 0) {
          msg += ` (${res.atlanan} satır Aylıksız İzin nedeniyle atlandı.)`
        }
        setTopluBasari(msg)
        setTopluVeri({})
        router.refresh()
      }
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hizmet Süreleri (toplu giriş)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kişisel bilgilerdeki hizmet süresi (360 gün esası) ile aynı alanlar: yıl, ay, gün. Aktif
            personel listelenir; satır düzenleyebilir veya toplu kaydedebilirsiniz.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            Geçici veri girişi ekranıdır. Görev türü <strong>Aylıksız İzin</strong> olanlarda hizmet
            süresi güncellenmez (kişisel bilgiler ile aynı kural).
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Sıralama Tanımlar → Statü ile uyumludur.
          </p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSekme('liste')
              setTopluHata(null)
              setTopluBasari(null)
            }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              sekme === 'liste' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Kayıt Listesi
          </button>
          <button
            type="button"
            onClick={() => {
              setSekme('toplu')
              setHata(null)
            }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              sekme === 'toplu' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Toplu Güncelle
          </button>
        </div>
      </div>

      {sekme === 'liste' && (
        <>
          <div className="mb-4">
            <input
              value={arama}
              onChange={e => setArama(e.target.value)}
              placeholder="Ad, sicil, statü veya T.C. kimlik no ara…"
              className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          {hata && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
        </>
      )}

      {sekme === 'toplu' && (
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <p className="text-sm text-slate-600">
              Değiştirdiğiniz satırlar mavi ile işaretlenir; <strong>Toplu Kaydet</strong> yalnızca
              değerleri değişen sicilleri yazar.
            </p>
            <button
              type="button"
              onClick={handleTopluKaydet}
              disabled={isPending}
              className="flex items-center justify-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 font-medium shrink-0"
            >
              {isPending ? 'Kaydediliyor…' : 'Toplu Kaydet'}
            </button>
          </div>
          {topluHata && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{topluHata}</p>}
          {topluBasari && (
            <p className="mb-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{topluBasari}</p>
          )}
        </div>
      )}

      {sekme === 'liste' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[160px]">Adı Soyadı</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[100px]">Statü</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">T.C. Kimlik No</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-600 w-20">Yıl</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-600 w-20">Ay</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-600 w-20">Gün</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtreli.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtreli.map((p, idx) => {
                    const duz = duzenlenenSicil === p.sicil_no
                    const blok = ayliksizIz(p)
                    return (
                      <tr
                        key={p.sicil_no}
                        className={duz ? 'bg-blue-50' : blok ? 'bg-amber-50/50' : 'hover:bg-slate-50'}
                      >
                        <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={personelDetayHref(p)}
                            className="font-medium text-slate-800 hover:text-blue-700 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {p.ad_soyad}
                          </Link>
                          {blok && (
                            <span className="block text-xs text-amber-800 mt-0.5">Aylıksız İzin — güncellenmez</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{p.statuEtiket}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600 tabular-nums">
                          {p.tckn != null && p.tckn !== '' ? String(p.tckn) : '—'}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {duz && !blok ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={inlineDeger(p, 'yil')}
                              onChange={e => inlineGuncelle(p, 'yil', e.target.value)}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center tabular-nums"
                            />
                          ) : (
                            <span className="tabular-nums text-slate-700">{hizmetStr(p.hizmet_suresi_yil)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {duz && !blok ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={inlineDeger(p, 'ay')}
                              onChange={e => inlineGuncelle(p, 'ay', e.target.value)}
                              className="w-14 px-2 py-1 border border-slate-300 rounded text-sm text-center tabular-nums"
                            />
                          ) : (
                            <span className="tabular-nums text-slate-700">{hizmetStr(p.hizmet_suresi_ay)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {duz && !blok ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={inlineDeger(p, 'gun')}
                              onChange={e => inlineGuncelle(p, 'gun', e.target.value)}
                              className="w-14 px-2 py-1 border border-slate-300 rounded text-sm text-center tabular-nums"
                            />
                          ) : (
                            <span className="tabular-nums text-slate-700">{hizmetStr(p.hizmet_suresi_gun)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {blok ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : duz ? (
                            <button
                              type="button"
                              onClick={() => handleInlineKaydet(p)}
                              disabled={isPending}
                              className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                            >
                              {isPending ? '…' : 'Kaydet'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => duzenleAc(p)}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              Düzenle
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sekme === 'toplu' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-w-full">
          <table className="w-full text-xs sm:text-sm min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-10">Sıra No</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 min-w-[9rem]">Adı Soyadı</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 min-w-[6rem]">Statü</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 w-32">T.C. Kimlik No</th>
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-24">Yıl</th>
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-20">Ay</th>
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-20">Gün</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sirali.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                sirali.map((p, i) => {
                  const blok = ayliksizIz(p)
                  const degisti = topluSatirDegisti(p)
                  return (
                    <tr key={p.sicil_no} className={degisti ? 'bg-blue-50' : blok ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                      <td className="px-2 py-1.5 text-center text-slate-500 tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1.5 font-medium text-slate-800">
                        {p.ad_soyad}
                        {blok && (
                          <span className="block text-[10px] text-amber-800 font-normal">Aylıksız İzin — atlanır</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">{p.statuEtiket}</td>
                      <td className="px-2 py-1.5 font-mono text-slate-600 tabular-nums">
                        {p.tckn != null && p.tckn !== '' ? String(p.tckn) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={blok}
                          value={topluDegerAl(p, 'yil')}
                          onChange={e => topluGuncelle(p.sicil_no, 'yil', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-xs sm:text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            blok
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : degisti
                                ? 'border-blue-300 bg-blue-50/80'
                                : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={blok}
                          value={topluDegerAl(p, 'ay')}
                          onChange={e => topluGuncelle(p.sicil_no, 'ay', e.target.value)}
                          className={`w-16 px-2 py-1 border rounded text-xs sm:text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            blok
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : degisti
                                ? 'border-blue-300 bg-blue-50/80'
                                : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={blok}
                          value={topluDegerAl(p, 'gun')}
                          onChange={e => topluGuncelle(p.sicil_no, 'gun', e.target.value)}
                          className={`w-16 px-2 py-1 border rounded text-xs sm:text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            blok
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : degisti
                                ? 'border-blue-300 bg-blue-50/80'
                                : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
