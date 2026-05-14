'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import {
  sosyalHakDetayYukle,
  sosyalHakSecimleriKaydet,
  type SosyalHakDetayData,
  type SosyalHakIzin,
  type SosyalHakTip,
} from '@/app/(dashboard)/kesintiler/sosyal-hak/[donem_id]/actions'

interface Props {
  donemId: number
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

type SortSutun = 'tip' | 'sira_no' | 'sicil_no' | 'ad_soyad' | 'tur' | 'ayrilis' | 'baslama' | 'gun'
type SortYon = 'asc' | 'desc'

const TIP_LABEL: Record<SosyalHakTip, string> = {
  rmy: 'Raporlu Memur',
  ivy: 'İzinli Vekil',
  izy: 'İzinli Zabıta',
}

const TIP_RENK: Record<SosyalHakTip, string> = {
  rmy: 'bg-orange-100 text-orange-700',
  ivy: 'bg-blue-100 text-blue-700',
  izy: 'bg-purple-100 text-purple-700',
}

function TipBadge({ tip }: { tip: SosyalHakTip }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIP_RENK[tip]}`}>
      {TIP_LABEL[tip]}
    </span>
  )
}

/** Rakam ve metin parçalarına bölerek doğal sıralama yapar (1 < 2 < 10 < 20). */
function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const ap = a.match(re) ?? []
  const bp = b.match(re) ?? []
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const x = ap[i] ?? ''
    const y = bp[i] ?? ''
    if (x === y) continue
    const nx = parseInt(x, 10)
    const ny = parseInt(y, 10)
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny
    return x.localeCompare(y, 'tr')
  }
  return 0
}

function izinSirala(izinler: SosyalHakIzin[], sutun: SortSutun, yon: SortYon): SosyalHakIzin[] {
  return [...izinler].sort((a, b) => {
    let fark = 0
    if (sutun === 'gun') {
      fark = a.gun - b.gun
    } else if (sutun === 'tip') {
      fark = TIP_LABEL[a.tip].localeCompare(TIP_LABEL[b.tip], 'tr')
    } else {
      fark = naturalCompare(String(a[sutun] ?? ''), String(b[sutun] ?? ''))
    }
    return yon === 'asc' ? fark : -fark
  })
}

function SortIkon({ aktif, yon }: { aktif: boolean; yon: SortYon }) {
  if (!aktif) {
    return (
      <span className="ml-1 text-slate-300">
        <svg className="inline w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </span>
    )
  }
  return yon === 'asc' ? <span className="ml-1 text-blue-500">↑</span> : <span className="ml-1 text-blue-500">↓</span>
}

function IzinTablo({
  izinler,
  onSagaAl,
  onSolaAl,
  yon,
  sortable,
}: {
  izinler: SosyalHakIzin[]
  onSagaAl?: (sira_no: string) => void
  onSolaAl?: (sira_no: string) => void
  yon: 'aday' | 'islenecek'
  sortable?: boolean
}) {
  const [sortSutun, setSortSutun] = useState<SortSutun>('baslama')
  const [sortYon, setSortYon] = useState<SortYon>('asc')

  function handleSutunTikla(sutun: SortSutun) {
    if (!sortable) return
    if (sortSutun === sutun) {
      setSortYon(y => (y === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortSutun(sutun)
      setSortYon('asc')
    }
  }

  const siraliIzinler = useMemo(
    () => (sortable ? izinSirala(izinler, sortSutun, sortYon) : izinler),
    [izinler, sortable, sortSutun, sortYon]
  )

  function ThSutun({ sutun, label, sag }: { sutun: SortSutun; label: string; sag?: boolean }) {
    const aktif = !!sortable && sortSutun === sutun
    return (
      <th
        className={`px-4 py-2.5 font-semibold text-slate-600 ${sag ? 'text-right' : 'text-left'} ${
          sortable ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : ''
        } ${aktif ? 'text-blue-600 bg-blue-50' : ''}`}
        onClick={() => handleSutunTikla(sutun)}
      >
        {label}
        {sortable && <SortIkon aktif={aktif} yon={sortYon} />}
      </th>
    )
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="w-12 px-3 py-2.5" />
            <th className="text-center px-3 py-2.5 font-semibold text-slate-600 w-10">No</th>
            <ThSutun sutun="sira_no"  label="Kayıt No"   />
            <ThSutun sutun="sicil_no" label="Sicil No"   />
            <ThSutun sutun="ad_soyad" label="Adı Soyadı" />
            <ThSutun sutun="tip"      label="Tip"        />
            <ThSutun sutun="tur"      label="Tür"        />
            <ThSutun sutun="ayrilis"  label="Ayrılış"    />
            <ThSutun sutun="baslama"  label="Başlama"    />
            <ThSutun sutun="gun"      label="Süre (Gün)" sag />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {siraliIzinler.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">
                {yon === 'aday' ? 'Aday izin yok.' : 'Döneme aktarılmış izin yok.'}
              </td>
            </tr>
          ) : (
            siraliIzinler.map((iz, idx) => (
              <tr key={`${iz.tip}-${iz.sira_no}-${idx}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 text-center">
                  {yon === 'aday' && onSagaAl && (
                    <button
                      type="button"
                      onClick={() => onSagaAl(iz.sira_no)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Döneme aktar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                  {yon === 'islenecek' && onSolaAl && (
                    <button
                      type="button"
                      onClick={() => onSolaAl(iz.sira_no)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Adaya geri al"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-xs text-slate-400">{idx + 1}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{iz.sira_no}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{iz.sicil_no}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{iz.ad_soyad}</td>
                <td className="px-4 py-2"><TipBadge tip={iz.tip} /></td>
                <td className="px-4 py-2 text-slate-600">{iz.tur}</td>
                <td className="px-4 py-2 tabular-nums text-slate-500">{tarih(iz.ayrilis)}</td>
                <td className="px-4 py-2 tabular-nums text-slate-500">{tarih(iz.baslama)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-700">{iz.gun}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function OzetSatir({ tip, izinler }: { tip: SosyalHakTip; izinler: SosyalHakIzin[] }) {
  const filtered = izinler.filter(i => i.tip === tip)
  if (filtered.length === 0) return null
  const toplamGun = filtered.reduce((s, i) => s + i.gun, 0)
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
      tip === 'rmy' ? 'bg-orange-50 border-orange-200' :
      tip === 'ivy' ? 'bg-blue-50 border-blue-200' :
                     'bg-purple-50 border-purple-200'
    }`}>
      <TipBadge tip={tip} />
      <span className="text-sm text-slate-600">
        <span className="font-semibold">{filtered.length}</span> kayıt —{' '}
        <span className="font-semibold">{toplamGun}</span> gün
      </span>
    </div>
  )
}

export default function SosyalHakDetayClient({ donemId }: Props) {
  const [data, setData]              = useState<SosyalHakDetayData | null>(null)
  const [hata, setHata]              = useState<string | null>(null)
  const [yukleniyor, setYukleniyor]  = useState(true)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function yukle() {
    setYukleniyor(true)
    setHata(null)
    const res = await sosyalHakDetayYukle(donemId)
    setYukleniyor(false)
    if ('hata' in res) {
      setHata(res.hata)
      setData(null)
    } else {
      setData(res)
    }
  }

  useEffect(() => { yukle() }, [donemId])

  function sagaAl(sira_no: string) {
    if (!data) return
    const iz = data.aday.find(i => i.sira_no === sira_no)
    if (!iz) return
    setData({
      ...data,
      aday:      data.aday.filter(i => i.sira_no !== sira_no),
      islenecek: [...data.islenecek, iz],
    })
  }

  function solaAl(sira_no: string) {
    if (!data) return
    const iz = data.islenecek.find(i => i.sira_no === sira_no)
    if (!iz) return
    setData({
      ...data,
      aday:      [...data.aday, iz],
      islenecek: data.islenecek.filter(i => i.sira_no !== sira_no),
    })
  }

  function kaydet() {
    if (!data) return
    const siraNoList = data.islenecek.map(i => ({ sira_no: i.sira_no, tip: i.tip }))
    startTransition(async () => {
      const res = await sosyalHakSecimleriKaydet(donemId, siraNoList)
      if (res.hata) setHata(res.hata)
      else yukle()
    })
  }

  function hepsiniIptal() {
    if (!confirm('Bu döneme ait tüm seçili izinler iptal edilecek. Devam edilsin mi?')) return
    startTransition(async () => {
      const res = await sosyalHakSecimleriKaydet(donemId, [])
      if (res.hata) setHata(res.hata)
      else yukle()
    })
  }

  async function excelIndir() {
    if (!data || data.islenecek.length === 0) {
      alert('İndirilecek işlenecek izin bulunamadı.')
      return
    }
    setExcelYukleniyor(true)
    try {
      const res = await fetch(`/api/kesintiler/sosyal-hak/excel?donem_id=${donemId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error ?? 'Excel indirilemedi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Sosyal_Hak_Kesintileri_${data.donem.donem_adi ?? 'Donem'}.xlsx`.replace(/[:\*\?\/\\]/g, ' ')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Excel indirilemedi.')
    } finally {
      setExcelYukleniyor(false)
    }
  }

  if (yukleniyor) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Yükleniyor…
      </div>
    )
  }

  if (hata) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
        {hata}
      </div>
    )
  }

  if (!data) return null

  const toplamAday      = data.aday.length
  const toplamIslenecek = data.islenecek.length

  return (
    <div className="space-y-6">
      {/* Dönem başlığı + eylemler */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {data.donem.donem_adi ?? `Dönem #${data.donem.id}`}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {tarih(data.donem.baslangic_tarihi)} – {tarih(data.donem.bitis_tarihi)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {toplamIslenecek > 0 && (
            <button
              type="button"
              onClick={hepsiniIptal}
              disabled={isPending}
              className="px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Seçilenleri İptal Et
            </button>
          )}
          <button
            type="button"
            onClick={kaydet}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Kaydediliyor…' : 'Seçimleri Kaydet'}
          </button>
          <button
            type="button"
            onClick={excelIndir}
            disabled={excelYukleniyor || toplamIslenecek === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
            title={toplamIslenecek === 0 ? 'Önce izin aktarın' : 'Excel indir'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {excelYukleniyor ? 'Hazırlanıyor…' : 'Excel İndir'}
          </button>
        </div>
      </div>

      {/* İşlenecek izinler özeti */}
      {toplamIslenecek > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">İşlenecek — Özet</p>
          <div className="flex flex-wrap gap-2">
            <OzetSatir tip="rmy" izinler={data.islenecek} />
            <OzetSatir tip="ivy" izinler={data.islenecek} />
            <OzetSatir tip="izy" izinler={data.islenecek} />
          </div>
        </div>
      )}

      {/* Aday izinler — üstte */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-700">Aday İzinler</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">{toplamAday}</span>
        </div>
        <IzinTablo izinler={data.aday} onSagaAl={sagaAl} yon="aday" sortable />
      </section>

      {/* Döneme aktarılan izinler — altta */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-700">Döneme Aktarılan İzinler</h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{toplamIslenecek}</span>
        </div>
        <IzinTablo izinler={data.islenecek} onSolaAl={solaAl} yon="islenecek" sortable />
      </section>
    </div>
  )
}
