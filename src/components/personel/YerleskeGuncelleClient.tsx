'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { personelDetayHref } from '@/lib/personel-link'
import { yerleskeSecenekleriKaynak, type YerleskeSecenek } from '@/lib/yerleske-adresi'
import type { YerleskeGuncelleSatir, YerleskeKaynak } from '@/app/(dashboard)/personel/yerleske-guncelle/actions'
import { trNormalize } from '@/lib/turkce-search'

function karsilastirMudurlukSonraAd(
  a: Pick<YerleskeGuncelleListeSatir, 'gorev_mudurlugu' | 'ad_soyad'>,
  b: Pick<YerleskeGuncelleListeSatir, 'gorev_mudurlugu' | 'ad_soyad'>,
): number {
  const mud = a.gorev_mudurlugu.localeCompare(b.gorev_mudurlugu, 'tr')
  if (mud !== 0) return mud
  return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
}

export type YerleskeGuncelleListeSatir = {
  kayit_key: string
  kaynak: YerleskeKaynak
  sicil_no: string
  firma_id?: number
  public_id: string
  ad_soyad: string
  statuEtiket: string
  gorev_mudurlugu: string
  gorev_yeri: string
  kayitli_yerleske_id: number | null
  secili_yerleske_id: number | null
}

interface Props {
  data: YerleskeGuncelleListeSatir[]
  yerleskeHarita: Record<string, YerleskeSecenek[]>
  sirketYerleskeHarita: Record<string, YerleskeSecenek[]>
  onSatirKaydet: (kaynak: YerleskeKaynak, id: string, fd: FormData) => Promise<{ hata?: string }>
  onTopluKaydet: (satirlar: YerleskeGuncelleSatir[]) => Promise<{ hata?: string; kaydedilen?: number }>
}

function satirId(p: YerleskeGuncelleListeSatir): string {
  return p.kaynak === 'kadro' ? p.sicil_no : String(p.firma_id ?? '')
}

function satirDetayHref(p: YerleskeGuncelleListeSatir): string {
  if (p.kaynak === 'firma') {
    const seg = encodeURIComponent(p.public_id?.trim() || String(p.firma_id ?? ''))
    return `/firma-calisanlar/${seg}`
  }
  return personelDetayHref(p)
}

function secenekler(
  mudHarita: Record<string, YerleskeSecenek[]>,
  sirketHarita: Record<string, YerleskeSecenek[]>,
  p: YerleskeGuncelleListeSatir,
): YerleskeSecenek[] {
  const mudMap = new Map(Object.entries(mudHarita))
  const sirketMap = new Map(Object.entries(sirketHarita))
  return yerleskeSecenekleriKaynak(mudMap, sirketMap, p.kaynak, p.gorev_mudurlugu, p.gorev_yeri)
}

export default function YerleskeGuncelleClient({
  data,
  yerleskeHarita,
  sirketYerleskeHarita,
  onSatirKaydet,
  onTopluKaydet,
}: Props) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [arama, setArama] = useState('')
  const [duzenlenenKey, setDuzenlenenKey] = useState<string | null>(null)
  const [inlineVeri, setInlineVeri] = useState<Record<string, number | null>>({})
  const [topluVeri, setTopluVeri] = useState<Record<string, number | null>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [topluHata, setTopluHata] = useState<string | null>(null)
  const [topluBasari, setTopluBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sirali = useMemo(
    () => [...data].sort(karsilastirMudurlukSonraAd),
    [data],
  )

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return sirali
    return sirali.filter(
      p =>
        trNormalize(p.ad_soyad).includes(q) ||
        trNormalize(p.sicil_no).includes(q) ||
        trNormalize(p.gorev_mudurlugu).includes(q) ||
        trNormalize(p.gorev_yeri).includes(q),
    )
  }, [sirali, arama])

  function inlineDeger(p: YerleskeGuncelleListeSatir): number | null {
    if (duzenlenenKey === p.kayit_key && p.kayit_key in inlineVeri) {
      return inlineVeri[p.kayit_key] ?? null
    }
    return p.secili_yerleske_id
  }

  function topluDeger(p: YerleskeGuncelleListeSatir): number | null {
    if (p.kayit_key in topluVeri) return topluVeri[p.kayit_key] ?? null
    return p.secili_yerleske_id
  }

  function topluSatirDegisti(p: YerleskeGuncelleListeSatir): boolean {
    const yeni = topluDeger(p)
    const eski = p.secili_yerleske_id
    return yeni !== eski
  }

  async function handleInlineKaydet(p: YerleskeGuncelleListeSatir) {
    setHata(null)
    const fd = new FormData()
    const val = inlineDeger(p)
    if (val != null) fd.set('yerleske_adresi_id', String(val))
    startTransition(async () => {
      const res = await onSatirKaydet(p.kaynak, satirId(p), fd)
      if (res.hata) setHata(res.hata)
      else {
        setDuzenlenenKey(null)
        setInlineVeri({})
        router.refresh()
      }
    })
  }

  function handleTopluKaydet() {
    setTopluHata(null)
    setTopluBasari(null)
    const degistirilmis = sirali.filter(p => topluSatirDegisti(p))
    if (!degistirilmis.length) {
      setTopluHata('Değişiklik yapılmadı.')
      return
    }
    const satirlar: YerleskeGuncelleSatir[] = degistirilmis.map(p =>
      p.kaynak === 'kadro'
        ? { kaynak: 'kadro', sicil_no: p.sicil_no, yerleske_adresi_id: topluDeger(p) }
        : { kaynak: 'firma', firma_id: p.firma_id, yerleske_adresi_id: topluDeger(p) },
    )
    startTransition(async () => {
      const res = await onTopluKaydet(satirlar)
      if (res.hata) setTopluHata(res.hata)
      else {
        setTopluBasari(`${res.kaydedilen ?? satirlar.length} kayıt güncellendi.`)
        setTopluVeri({})
        router.refresh()
      }
    })
  }

  function yerleskeSelect(
    p: YerleskeGuncelleListeSatir,
    value: number | null,
    onChange: (id: number | null) => void,
    disabled?: boolean,
    degisti?: boolean,
  ) {
    const opts = secenekler(yerleskeHarita, sirketYerleskeHarita, p)
    return (
      <select
        value={value ?? ''}
        disabled={disabled || opts.length === 0}
        onChange={e => {
          const v = e.target.value
          onChange(v ? Number(v) : null)
        }}
        className={`min-w-[10rem] max-w-full px-2 py-1.5 border rounded-lg text-sm bg-white disabled:opacity-50 ${
          degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-300'
        }`}
      >
        {opts.length === 0 ? (
          <option value="">Yerleşke tanımı yok</option>
        ) : (
          opts.map(o => (
            <option key={o.id} value={o.id}>
              {o.ad}
            </option>
          ))
        )}
      </select>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Yerleşke Güncelle (geçici)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aktif kadro ve ADABEL personelinin çalıştığı yerleşke adresini toplu veya satır bazında güncelleyin.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            Kadro personelinde kayıt personel kartı → Görev Bilgileri bölümünde görünür. ADABEL personeli
            firma kartında yerleşke alanı ile raporlara yansır.
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
              placeholder="Ad, sicil, müdürlük veya görev yeri ara…"
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
              değişen kayıtları yazar.
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-3 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[160px]">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">Görev Müdürlüğü</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">Görev Yeri</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[180px]">Yerleşke Adresi</th>
                {sekme === 'liste' && (
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(sekme === 'liste' ? filtreli : sirali).length === 0 ? (
                <tr>
                  <td colSpan={sekme === 'liste' ? 6 : 5} className="text-center py-16 text-slate-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                (sekme === 'liste' ? filtreli : sirali).map((p, idx) => {
                  const duz = sekme === 'liste' && duzenlenenKey === p.kayit_key
                  const degisti = sekme === 'toplu' && topluSatirDegisti(p)
                  return (
                    <tr
                      key={p.kayit_key}
                      className={duz || degisti ? 'bg-blue-50' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={satirDetayHref(p)}
                          className="font-medium text-slate-800 hover:text-blue-700 hover:underline"
                        >
                          {p.ad_soyad}
                        </Link>
                        <span className="block text-xs text-slate-400 mt-0.5">{p.statuEtiket}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{p.gorev_mudurlugu}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.gorev_yeri || '—'}</td>
                      <td className="px-4 py-2.5">
                        {sekme === 'liste' && duz ? (
                          yerleskeSelect(p, inlineDeger(p), id =>
                            setInlineVeri(prev => ({ ...prev, [p.kayit_key]: id })),
                          )
                        ) : sekme === 'toplu' ? (
                          yerleskeSelect(
                            p,
                            topluDeger(p),
                            id => setTopluVeri(prev => ({ ...prev, [p.kayit_key]: id })),
                            false,
                            degisti,
                          )
                        ) : (
                          <span className="text-slate-700">
                            {secenekler(yerleskeHarita, sirketYerleskeHarita, p).find(
                              o => o.id === p.secili_yerleske_id,
                            )?.ad ?? '—'}
                          </span>
                        )}
                      </td>
                      {sekme === 'liste' && (
                        <td className="px-4 py-2.5 text-right">
                          {duz ? (
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
                              onClick={() => {
                                setHata(null)
                                setDuzenlenenKey(p.kayit_key)
                                setInlineVeri({ [p.kayit_key]: p.secili_yerleske_id })
                              }}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              Düzenle
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
