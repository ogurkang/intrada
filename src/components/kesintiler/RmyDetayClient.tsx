'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  rmyDetayYukle,
  rmySecimleriKaydet,
  type RmyDetayData,
  type RmyDetayIzin,
} from '@/app/(dashboard)/kesintiler/rmy/[donem_id]/actions'
import {
  kesintimHesapla,
  type KesintimDonemRow,
  type KesintimIzinRow,
} from '@/lib/kesinym-hesap'
import KesintimDetayClient from '@/components/kesintiler/KesintimDetayClient'
import { createClient } from '@/lib/supabase/client'

interface Props {
  donemId: number
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

type SortSutun = 'sira_no' | 'sicil_no' | 'ad_soyad' | 'tur' | 'ayrilis' | 'baslama' | 'gun'
type SortYon = 'asc' | 'desc'

function izinSirala(izinler: RmyDetayIzin[], sutun: SortSutun, yon: SortYon): RmyDetayIzin[] {
  return [...izinler].sort((a, b) => {
    let fark = 0
    if (sutun === 'gun') {
      fark = a.gun - b.gun
    } else if (sutun === 'sira_no' || sutun === 'sicil_no') {
      const an = parseInt(a[sutun], 10)
      const bn = parseInt(b[sutun], 10)
      fark = isNaN(an) || isNaN(bn) ? a[sutun].localeCompare(b[sutun], 'tr') : an - bn
    } else {
      fark = (a[sutun] ?? '').localeCompare(b[sutun] ?? '', 'tr')
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
  return yon === 'asc' ? (
    <span className="ml-1 text-blue-500">↑</span>
  ) : (
    <span className="ml-1 text-blue-500">↓</span>
  )
}


function IzinTablo({
  izinler,
  onSagaAl,
  onSolaAl,
  yon,
  sortable,
  tip,
}: {
  izinler: RmyDetayIzin[]
  onSagaAl?: (sira_no: string) => void
  onSolaAl?: (sira_no: string) => void
  yon: 'aday' | 'islenecek'
  sortable?: boolean
  tip: string
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

  function ThSutun({
    sutun,
    label,
    sag,
  }: {
    sutun: SortSutun
    label: string
    sag?: boolean
  }) {
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
                {yon === 'aday' ? 'Aday rapor yok.' : 'Henüz rapor aktarılmadı.'}
              </td>
            </tr>
          ) : (
            siraliIzinler.map((iz, idx) => (
              <tr key={iz.sira_no} className="hover:bg-slate-50 transition-colors">
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

export default function RmyDetayClient({ donemId }: Props) {
  const [data, setData]      = useState<RmyDetayData | null>(null)
  const [hata, setHata]      = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [ozetAcik, setOzetAcik] = useState(false)
  const [ozetData, setOzetData] = useState<{ donem: unknown; sonuc: unknown } | null>(null)
  const [excelMenuAcik, setExcelMenuAcik] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function yukle() {
    setYukleniyor(true)
    setHata(null)
    const res = await rmyDetayYukle(donemId)
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
      aday:     data.aday.filter(i => i.sira_no !== sira_no),
      islenecek: [...data.islenecek, iz],
    })
  }

  function solaAl(sira_no: string) {
    if (!data) return
    const iz = data.islenecek.find(i => i.sira_no === sira_no)
    if (!iz) return
    setData({
      ...data,
      aday:     [...data.aday, iz],
      islenecek: data.islenecek.filter(i => i.sira_no !== sira_no),
    })
  }

  function kaydet() {
    if (!data) return
    const siraNoList = data.islenecek.map(i => i.sira_no)
    startTransition(async () => {
      const res = await rmySecimleriKaydet(donemId, siraNoList)
      if (res.hata) setHata(res.hata)
      else yukle()
    })
  }

  async function excelIndir(tip: 'ozet' | 'detay') {
    try {
      const res = await fetch(`/api/kesintiler/rmy/excel?donem_id=${donemId}&tip=${tip}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error ?? 'Excel indirilemedi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Raporlu_Memurlar_${data?.donem.donem_adi ?? 'Donem'}${tip === 'ozet' ? '_Ozet' : '_Detay'}.xlsx`.replace(/[:\*\?\/\\]/g, ' ')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Excel indirilemedi.')
    }
  }

  function hepsiniIptal() {
    if (!confirm('Bu döneme ait tüm seçili raporlar iptal edilecek. Devam edilsin mi?')) return
    startTransition(async () => {
      const res = await rmySecimleriKaydet(donemId, [])
      if (res.hata) setHata(res.hata)
      else yukle()
    })
  }

  async function ozetOnizle() {
    if (!data) return
    const supabase = createClient()
    const { data: tumDonemlerRaw } = await supabase
      .from('raporlu_memurlar_yeni_donem')
      .select('id, baslangic_tarihi, bitis_tarihi')
      .order('baslangic_tarihi', { ascending: true })
    const tumDonemler: KesintimDonemRow[] = (tumDonemlerRaw ?? []).map((d, i) => {
      const basMs = new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)
      const bitMs = new Date(d.bitis_tarihi).setHours(23, 59, 59, 999)
      const tg = Math.floor((new Date(d.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000) + 1
      return {
        id: d.id,
        baslangic_tarihi: d.baslangic_tarihi,
        bitis_tarihi: d.bitis_tarihi,
        baslangic_tarihi_ms: basMs,
        bitis_tarihi_ms: bitMs,
        idx: i,
        takvimGun: tg,
        kapasite: Math.min(tg, 30),
      }
    })
    const idxById = new Map(tumDonemler.map(d => [d.id, d.idx]))
    const { data: tumSecimRaw } = await supabase
      .from('raporlu_memurlar_yeni_secim')
      .select('donem_id, izin_sira_no, dahil')
    const ilkDonemIdBySiraNo: Record<string, number> = {}
    for (const s of tumSecimRaw ?? []) {
      if (!s.dahil || !s.izin_sira_no) continue
      if (s.donem_id === donemId) continue
      const idx = idxById.get(s.donem_id) ?? 9999
      const prev = ilkDonemIdBySiraNo[s.izin_sira_no]
      if (prev === undefined || idx < (idxById.get(prev) ?? 9999)) {
        ilkDonemIdBySiraNo[s.izin_sira_no] = s.donem_id
      }
    }
    for (const iz of data.islenecek) {
      ilkDonemIdBySiraNo[iz.sira_no] = donemId
    }
    const siraNoList = Object.keys(ilkDonemIdBySiraNo)
    let izinler: KesintimIzinRow[] = []
    if (siraNoList.length > 0) {
      const { data: izinRaw } = await supabase
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
        .in('sira_no', siraNoList)
        .in('tur', ['Rapor', 'Refakatçi Raporu', 'Refakatçi İzni'])
        .neq('durum', 'İptal Edildi')
      const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
      const adMap: Record<string, string> = {}
      const unvanMap: Record<string, string> = {}
      if (siciller.length > 0) {
        const { data: calisanlar } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
        ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
        const { data: kadroRaw } = await supabase.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', siciller)
        ;(kadroRaw ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
      }
      izinler = (izinRaw ?? [])
        .filter(iz => iz.sira_no && iz.ayrilis && iz.baslama)
        .map(iz => ({
          sira_no: iz.sira_no!,
          sicil_no: iz.sicil_no ?? '',
          ad_soyad: adMap[iz.sicil_no] ?? iz.sicil_no ?? '',
          unvan: unvanMap[iz.sicil_no] ?? '',
          tur: iz.tur ?? '',
          ayrilis: iz.ayrilis,
          baslama: iz.baslama,
          gun: iz.gun ?? 0,
        }))
    }
    const { data: tatilRaw } = await supabase.from('tanim_izin_tatil').select('tatil_adi, tatil_turu, tatil_yapisi, tatil_baslangici, tatil_bitisi, durum').eq('durum', true)
    const tatiller = (tatilRaw ?? []).map(t => ({ tatil_adi: t.tatil_adi, tatil_turu: t.tatil_turu, tatil_yapisi: t.tatil_yapisi, tatil_baslangici: t.tatil_baslangici, tatil_bitisi: t.tatil_bitisi, durum: t.durum ?? true }))
    const sonuc = kesintimHesapla({ modul: 'rmy', curId: donemId, donemler: tumDonemler, ilkDonemIdBySiraNo, izinler, tatiller })
    setOzetData({ donem: { ...data.donem, donem_adi: data.donem.donem_adi, durum: 'Açık' as const, yil: new Date().getFullYear() }, sonuc })
    setOzetAcik(true)
  }

  if (yukleniyor) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Yükleniyor…</p>
      </div>
    )
  }

  if (hata || !data) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-700">{hata ?? 'Veri yüklenemedi.'}</p>
      </div>
    )
  }

  const takvimGun = Math.floor(
    (new Date(data.donem.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(data.donem.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000
  ) + 1

  return (
    <div>
      {/* Dönem bilgisi */}
      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600">
          Dönem: {tarih(data.donem.baslangic_tarihi)} – {tarih(data.donem.bitis_tarihi)} ({takvimGun} gün) | En Çok Gün: 30 Gün
        </p>
      </div>

      {/* Aday İzinler */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Aday İzinler</h3>
        <IzinTablo izinler={data.aday} onSagaAl={sagaAl} yon="aday" sortable tip="Raporlu Memur" />
      </div>

      {/* Döneme Aktarılan İzinler */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Döneme Aktarılan İzinler</h3>
        <IzinTablo izinler={data.islenecek} onSolaAl={solaAl} yon="islenecek" sortable tip="Raporlu Memur" />
      </div>

      {/* Açıklama ve butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600 max-w-xl">
          Seçimleri Kaydet: bu dönem için seçilen raporları kalıcı olarak bağlar. Bir kez kaydedilen rapor sonraki dönemlerde adayda görünmez.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={hepsiniIptal}
            disabled={isPending || data.islenecek.length === 0}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Seçilenleri İptal Et
          </button>
          <button
            type="button"
            onClick={kaydet}
            disabled={isPending}
            className="intrada-btn intrada-btn-duzenle"
          >
            Seçimleri Kaydet
          </button>
          <button
            type="button"
            onClick={ozetOnizle}
            disabled={data.islenecek.length === 0}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Özet Önizle
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExcelMenuAcik(!excelMenuAcik)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1"
            >
              Excel İndir
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {excelMenuAcik && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExcelMenuAcik(false)} aria-hidden />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                  <button type="button" onClick={() => { excelIndir('ozet'); setExcelMenuAcik(false) }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    Özet
                  </button>
                  <button type="button" onClick={() => { excelIndir('detay'); setExcelMenuAcik(false) }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    Detay
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Özet önizleme */}
      {ozetAcik && ozetData && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Özet</h3>
            <button
              type="button"
              onClick={() => setOzetAcik(false)}
              className="intrada-btn intrada-btn-ust-menu"
            >
              Kapat
            </button>
          </div>
          <KesintimDetayClient
            modul="rmy"
            donem={ozetData.donem as Parameters<typeof KesintimDetayClient>[0]['donem']}
            sonuc={ozetData.sonuc as Parameters<typeof KesintimDetayClient>[0]['sonuc']}
          />
        </div>
      )}
    </div>
  )
}
