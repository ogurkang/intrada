'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { personelDetayHref } from '@/lib/personel-link'
import { trNormalize } from '@/lib/turkce-search'
import type { MahalleTanimSatir } from '@/lib/personel-adres'
import PersonelAdresInlineEditor, {
  adresInlineDegerFromSatir,
  type AdresInlineDeger,
} from '@/components/personel/PersonelAdresInlineEditor'
import type { AdresDuzenlemeSatir } from '@/app/(dashboard)/personel/adres-duzenleme/actions'

export type AdresDuzenlemeListeSatir = {
  kayit_key: string
  sicil_no: string
  public_id: string
  ad_soyad: string
  mahalle_id: number | null
  adres_detay: string | null
  eski_adres_gosterim: string
}

interface Props {
  data: AdresDuzenlemeListeSatir[]
  mahalleKayitlari: MahalleTanimSatir[]
  tumGoster: boolean
  adresliSayisi: number
  onSatirKaydet: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  onTopluKaydet: (satirlar: AdresDuzenlemeSatir[]) => Promise<{ hata?: string; kaydedilen?: number }>
}

function adresDegisti(eski: AdresDuzenlemeListeSatir, yeni: AdresInlineDeger): boolean {
  const eskiDetay = String(eski.adres_detay ?? '').trim()
  const yeniDetay = String(yeni.adres_detay ?? '').trim()
  return eski.mahalle_id !== yeni.mahalle_id || eskiDetay !== yeniDetay
}

export default function AdresDuzenlemeClient({
  data,
  mahalleKayitlari,
  tumGoster,
  adresliSayisi,
  onSatirKaydet,
  onTopluKaydet,
}: Props) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [arama, setArama] = useState('')
  const [duzenlenenKey, setDuzenlenenKey] = useState<string | null>(null)
  const [inlineVeri, setInlineVeri] = useState<Record<string, AdresInlineDeger>>({})
  const [topluVeri, setTopluVeri] = useState<Record<string, AdresInlineDeger>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [topluHata, setTopluHata] = useState<string | null>(null)
  const [topluBasari, setTopluBasari] = useState<string | null>(null)
  const [gizliKeyler, setGizliKeyler] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const sirali = useMemo(
    () =>
      [...data]
        .filter(p => !gizliKeyler.has(p.kayit_key))
        .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr')),
    [data, gizliKeyler],
  )

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return sirali
    return sirali.filter(
      p =>
        trNormalize(p.ad_soyad).includes(q) ||
        trNormalize(p.sicil_no).includes(q) ||
        trNormalize(p.eski_adres_gosterim).includes(q),
    )
  }, [sirali, arama])

  function inlineDeger(p: AdresDuzenlemeListeSatir): AdresInlineDeger {
    if (duzenlenenKey === p.kayit_key && p.kayit_key in inlineVeri) {
      return inlineVeri[p.kayit_key]
    }
    return adresInlineDegerFromSatir(mahalleKayitlari, p.mahalle_id, p.adres_detay)
  }

  function topluDeger(p: AdresDuzenlemeListeSatir): AdresInlineDeger {
    if (p.kayit_key in topluVeri) return topluVeri[p.kayit_key]
    return adresInlineDegerFromSatir(mahalleKayitlari, p.mahalle_id, p.adres_detay)
  }

  function topluSatirDegisti(p: AdresDuzenlemeListeSatir): boolean {
    return adresDegisti(p, topluDeger(p))
  }

  async function handleInlineKaydet(p: AdresDuzenlemeListeSatir) {
    setHata(null)
    const v = inlineDeger(p)
    const fd = new FormData()
    if (v.mahalle_id != null) fd.set('mahalle_id', String(v.mahalle_id))
    fd.set('adres_detay', v.adres_detay)
    startTransition(async () => {
      const res = await onSatirKaydet(p.sicil_no, fd)
      if (res.hata) setHata(res.hata)
      else {
        setDuzenlenenKey(null)
        setInlineVeri(prev => {
          const next = { ...prev }
          delete next[p.kayit_key]
          return next
        })
        setGizliKeyler(prev => new Set(prev).add(p.kayit_key))
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
    const satirlar: AdresDuzenlemeSatir[] = degistirilmis.map(p => {
      const v = topluDeger(p)
      return {
        sicil_no: p.sicil_no,
        mahalle_id: v.mahalle_id,
        adres_detay: String(v.adres_detay ?? '').trim() || null,
      }
    })
    const kaydedilenKeyler = degistirilmis.map(p => p.kayit_key)
    startTransition(async () => {
      const res = await onTopluKaydet(satirlar)
      if (res.hata) setTopluHata(res.hata)
      else {
        setTopluBasari(`${res.kaydedilen ?? satirlar.length} kayıt güncellendi.`)
        setTopluVeri({})
        setGizliKeyler(prev => {
          const next = new Set(prev)
          for (const k of kaydedilenKeyler) next.add(k)
          return next
        })
        router.refresh()
      }
    })
  }

  function adresEditor(
    p: AdresDuzenlemeListeSatir,
    deger: AdresInlineDeger,
    onChange: (v: AdresInlineDeger) => void,
    degisti?: boolean,
  ) {
    return (
      <div className={degisti ? 'rounded-lg border border-blue-300 bg-blue-50/50 p-3' : ''}>
        <PersonelAdresInlineEditor
          mahalleKayitlari={mahalleKayitlari}
          deger={deger}
          onChange={onChange}
          compact
        />
      </div>
    )
  }

  const gosterilen = sekme === 'liste' ? filtreli : sirali

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Adres Düzenleme</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aktif personelin adres bilgisini satır bazında veya toplu olarak güncelleyin.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Mevcut adres gösterimi: açık adres, mahalle, ilçe, il sırasıyla listelenir.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {tumGoster
              ? 'Tüm aktif personel gösteriliyor (adresi tanımlı olanlar dahil).'
              : 'Yalnızca adresi henüz tanımlanmamış personel listeleniyor; adres kaydedildikçe liste azalır.'}
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
              setDuzenlenenKey(null)
            }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              sekme === 'toplu' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Toplu Güncelle
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
        <span>
          {tumGoster ? (
            <>Tüm aktif personel gösteriliyor. Adresi tanımlı: <strong>{adresliSayisi}</strong>.</>
          ) : (
            <>Adresi tanımlanmış <strong>{adresliSayisi}</strong> kişi listede gösterilmiyor.</>
          )}
          {gizliKeyler.size > 0 && (
            <> Bu oturumda <strong>{gizliKeyler.size}</strong> kişi kaydedildi.</>
          )}
        </span>
        <Link
          href={tumGoster ? '/personel/adres-duzenleme' : '/personel/adres-duzenleme?tumu=1'}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        >
          {tumGoster ? 'Sadece adresi eksik olanları göster' : 'Tümünü göster (adresli dahil)'}
        </Link>
      </div>

      {sekme === 'liste' && (
        <>
          <div className="mb-4">
            <input
              value={arama}
              onChange={e => setArama(e.target.value)}
              placeholder="Ad, sicil veya adres ara…"
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
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-3 py-3 font-semibold text-slate-600 w-14">Sıra</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[160px]">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[220px]">Mevcut Adres</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[280px]">
                  {sekme === 'toplu' ? 'Yeni Adres' : 'Adres Düzenleme'}
                </th>
                {sekme === 'liste' && (
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gosterilen.length === 0 ? (
                <tr>
                  <td colSpan={sekme === 'liste' ? 5 : 4} className="text-center py-16 text-slate-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                gosterilen.map((p, idx) => {
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
                          href={personelDetayHref(p)}
                          className="font-medium text-slate-800 hover:text-blue-700 hover:underline"
                        >
                          {p.ad_soyad}
                        </Link>
                        <span className="block text-xs text-slate-400 mt-0.5">{p.sicil_no}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs leading-relaxed max-w-xs">
                        {p.eski_adres_gosterim}
                      </td>
                      <td className="px-4 py-2.5">
                        {sekme === 'liste' && duz ? (
                          adresEditor(p, inlineDeger(p), v =>
                            setInlineVeri(prev => ({ ...prev, [p.kayit_key]: v })),
                          )
                        ) : sekme === 'toplu' ? (
                          adresEditor(
                            p,
                            topluDeger(p),
                            v => setTopluVeri(prev => ({ ...prev, [p.kayit_key]: v })),
                            degisti,
                          )
                        ) : (
                          <span className="text-xs text-slate-400 italic">Düzenle ile açın</span>
                        )}
                      </td>
                      {sekme === 'liste' && (
                        <td className="px-4 py-2.5 text-right align-top">
                          {duz ? (
                            <div className="flex flex-col gap-1 items-end">
                              <button
                                type="button"
                                onClick={() => handleInlineKaydet(p)}
                                disabled={isPending}
                                className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                              >
                                {isPending ? '…' : 'Kaydet'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDuzenlenenKey(null)
                                  setInlineVeri({})
                                }}
                                className="text-xs text-slate-500 hover:text-slate-800"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setHata(null)
                                setDuzenlenenKey(p.kayit_key)
                                setInlineVeri({
                                  [p.kayit_key]: adresInlineDegerFromSatir(
                                    mahalleKayitlari,
                                    p.mahalle_id,
                                    p.adres_detay,
                                  ),
                                })
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
