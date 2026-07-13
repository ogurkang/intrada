'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import {
  sosyalHakDetayYukle,
  sosyalHakSecimleriKaydet,
  type SosyalHakDetayData,
  type SosyalHakIzin,
  type SosyalHakTip,
} from '@/app/(dashboard)/kesintiler/sosyal-hak/[donem_id]/actions'
import {
  kesintimHesapla,
  applyShakIzyKsdToSonuc,
  buildShakWindowsForYear,
  pickGlobalCurDonemForShak,
  type KesintimDonemRow,
  type KesintimIzinRow,
} from '@/lib/kesinym-hesap'
import {
  buildIzyAnnualRhIzinler,
  buildShakCurrentDonemRhDays,
  mergeRhSiciller,
  shakChainDonemIdListesi,
  shakChainExtraIzySiraNolari,
  applyShakIzyKsdOverrides,
} from '@/lib/sosyal-hak-izy-hesap'
import KesintimDetayClient from '@/components/kesintiler/KesintimDetayClient'
import { createClient } from '@/lib/supabase/client'

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

const TIP_SIRASI: SosyalHakTip[] = ['rmy', 'ivy', 'izy']

const TIP_RENK: Record<SosyalHakTip, string> = {
  rmy: 'bg-orange-100 text-orange-700',
  ivy: 'bg-blue-100 text-blue-700',
  izy: 'bg-purple-100 text-purple-700',
}

function tipsEtiket(tips: SosyalHakTip[]): string {
  return [...tips]
    .sort((a, b) => TIP_SIRASI.indexOf(a) - TIP_SIRASI.indexOf(b))
    .map(t => TIP_LABEL[t])
    .join(' - ')
}

function TipBadges({ tips }: { tips: SosyalHakTip[] }) {
  const sirali = [...tips].sort((a, b) => TIP_SIRASI.indexOf(a) - TIP_SIRASI.indexOf(b))
  if (sirali.length > 1) {
    return (
      <span className="text-xs font-medium text-slate-700" title={tipsEtiket(tips)}>
        {tipsEtiket(tips)}
      </span>
    )
  }
  const tip = sirali[0]
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
      fark = tipsEtiket(a.tips).localeCompare(tipsEtiket(b.tips), 'tr')
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
              <tr key={`${iz.sira_no}-${iz.tips.join('-')}-${idx}`} className="hover:bg-slate-50 transition-colors">
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
                <td className="px-4 py-2"><TipBadges tips={iz.tips} /></td>
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
  const filtered = izinler.filter(i => i.tips.includes(tip))
  if (filtered.length === 0) return null
  const toplamGun = filtered.reduce((s, i) => s + i.gun, 0)
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
      tip === 'rmy' ? 'bg-orange-50 border-orange-200' :
      tip === 'ivy' ? 'bg-blue-50 border-blue-200' :
                     'bg-purple-50 border-purple-200'
    }`}>
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIP_RENK[tip]}`}>
        {TIP_LABEL[tip]}
      </span>
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
  const [excelMenuAcik, setExcelMenuAcik] = useState(false)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [ozetAcik, setOzetAcik]      = useState(false)
  const [ozetData, setOzetData]      = useState<{ donem: SosyalHakDetayData['donem']; sonuc: ReturnType<typeof kesintimHesapla> } | null>(null)
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
    const secimler = data.islenecek.map(i => ({ sira_no: i.sira_no, tips: i.tips }))
    startTransition(async () => {
      const res = await sosyalHakSecimleriKaydet(donemId, secimler)
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

  async function excelIndir(tip: 'ozet' | 'detay' | 'genel') {
    if (!data) return
    setExcelYukleniyor(true)
    try {
      const res = await fetch(`/api/kesintiler/sosyal-hak/excel?donem_id=${donemId}&tip=${tip}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error ?? 'Excel indirilemedi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const suffix = tip === 'ozet' ? '_Ozet' : tip === 'genel' ? '_Genel' : '_Detay'
      a.download = `Sosyal_Hak_Kesintileri_${data.donem.donem_adi ?? 'Donem'}${suffix}.xlsx`.replace(/[:\*\?\/\\]/g, ' ')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Excel indirilemedi.')
    } finally {
      setExcelYukleniyor(false)
    }
  }

  async function ozetOnizle() {
    if (!data) return
    const supabase = createClient()

    const { data: tumDonemlerRaw } = await supabase
      .from('izinli_zabitalar_yeni_donem')
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
        kapasite: tg,
      }
    })

    const idxById = new Map(tumDonemler.map(d => [d.id, d.idx]))

    const shakBasTarihi = data.donem.baslangic_tarihi
    const shakBitTarihi = data.donem.bitis_tarihi
    const { globalCurDonem, donemler: tumDonemlerResolved } = pickGlobalCurDonemForShak(
      tumDonemler,
      shakBasTarihi,
      shakBitTarihi,
      'izy',
    )
    const globalCurId = globalCurDonem.id

    const { data: tumSecimRaw } = await supabase
      .from('izinli_zabitalar_yeni_secim')
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

    // Sadece IZY izinlerini dahil et
    const izyIslenecek = data.islenecek.filter(i => i.tips.includes('izy'))
    for (const iz of izyIslenecek) {
      ilkDonemIdBySiraNo[iz.sira_no] = globalCurId
    }

    const siraNoList = Object.keys(ilkDonemIdBySiraNo)
    const currentPeriodSiraNos = new Set(izyIslenecek.map(i => i.sira_no))
    const adMap: Record<string, string> = {}
    const unvanMap: Record<string, string> = {}
    let izinler: KesintimIzinRow[] = []
    if (siraNoList.length > 0) {
      const { data: izinRaw } = await supabase
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
        .in('sira_no', siraNoList)
        .neq('durum', 'İptal Edildi')

      const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
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

    const { data: tatilRaw } = await supabase
      .from('tanim_izin_tatil')
      .select('tatil_adi, tatil_turu, tatil_yapisi, tatil_baslangici, tatil_bitisi, durum')
      .eq('durum', true)
    const tatiller = (tatilRaw ?? []).map(t => ({
      tatil_adi: t.tatil_adi,
      tatil_turu: t.tatil_turu,
      tatil_yapisi: t.tatil_yapisi,
      tatil_baslangici: t.tatil_baslangici,
      tatil_bitisi: t.tatil_bitisi,
      durum: t.durum ?? true,
    }))

    let sonuc = kesintimHesapla({
      modul: 'izy',
      curId: globalCurId,
      donemler: tumDonemlerResolved,
      ilkDonemIdBySiraNo,
      izinler,
      tatiller,
      izyAnnualRhIzinler: undefined,
    })

    const shakBasMs = new Date(shakBasTarihi).setHours(0, 0, 0, 0)
    const shakBitMs = new Date(shakBitTarihi).setHours(23, 59, 59, 999)
    const shakYil   = new Date(shakBasTarihi).getFullYear()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shDonemChain } = await (supabase as any)
      .from('sosyal_hak_donem')
      .select('id, baslangic_tarihi, bitis_tarihi')
      .order('baslangic_tarihi', { ascending: true }) as {
        data: { id: number; baslangic_tarihi: string; bitis_tarihi: string }[] | null
      }

    const shakWindows = buildShakWindowsForYear(shDonemChain ?? [], shakYil, shakBitMs)

    let rhSiciller = [...new Set(izinler.map(i => i.sicil_no).filter(Boolean))]
    const chainDonemIds = shakChainDonemIdListesi(shDonemChain ?? [], shakYil, shakBitTarihi)
    if (chainDonemIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: chainSecim } = await (supabase as any)
        .from('sosyal_hak_secim')
        .select('izin_sira_no')
        .in('donem_id', chainDonemIds)
        .eq('tip', 'izy')
        .eq('dahil', true) as { data: { izin_sira_no: string }[] | null }
      const extraSiraNos = shakChainExtraIzySiraNolari(
        siraNoList,
        (chainSecim ?? []).map(s => s.izin_sira_no),
      )
      if (extraSiraNos.length > 0) {
        const { data: extraIzin } = await supabase
          .from('izin_hareketleri')
          .select('sicil_no')
          .in('sira_no', extraSiraNos)
          .neq('durum', 'İptal Edildi')
        const extraSiciller = [...new Set((extraIzin ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
        if (extraSiciller.length > 0) {
          rhSiciller = mergeRhSiciller(rhSiciller, extraSiciller)
          const missing = extraSiciller.filter(s => !adMap[s])
          if (missing.length > 0) {
            const { data: calExtra } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', missing)
            ;(calExtra ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
            const { data: kadExtra } = await supabase.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', missing)
            ;(kadExtra ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
          }
        }
      }
    }

    let annualRhIzinler: KesintimIzinRow[] = []
    if (rhSiciller.length > 0) {
      const { data: rhRaw } = await supabase
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
        .in('sicil_no', rhSiciller)
        .in('tur', ['Rapor', 'Heyet Raporu'])
        .neq('durum', 'İptal Edildi')
      annualRhIzinler = buildIzyAnnualRhIzinler(izinler, rhRaw ?? [], adMap, unvanMap)
    }

    const currentDonemRhDays = buildShakCurrentDonemRhDays(izinler, currentPeriodSiraNos)

    if (annualRhIzinler.length > 0 && shakWindows.length > 0) {
      sonuc = applyShakIzyKsdToSonuc(sonuc, annualRhIzinler, shakWindows, currentDonemRhDays)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ksdOverrideRaw } = await (supabase as any)
      .from('sosyal_hak_izy_ksd_override')
      .select('sicil_no, k_override, sd_override')
      .eq('donem_id', donemId) as {
        data: { sicil_no: string; k_override: number; sd_override: number | null }[] | null
      }
    if (ksdOverrideRaw && ksdOverrideRaw.length > 0) {
      sonuc = applyShakIzyKsdOverrides(sonuc, ksdOverrideRaw)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setOzetData({ donem: { ...data.donem, donem_adi: data.donem.donem_adi, durum: 'Açık' as const, yil: new Date().getFullYear() } as any, sonuc })
    setOzetAcik(true)
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
      {/* Dönem başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {data.donem.donem_adi ?? `Dönem #${data.donem.id}`}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {tarih(data.donem.baslangic_tarihi)} – {tarih(data.donem.bitis_tarihi)}
          </p>
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

      {/* Açıklama ve butonlar — IZY düzeninde */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600 max-w-xl">
          Seçimleri Kaydet: bu dönem için seçilen izinleri kalıcı olarak bağlar. Bir kez kaydedilen izin sonraki dönemlerde adayda görünmez.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={hepsiniIptal}
            disabled={isPending || toplamIslenecek === 0}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Seçilenleri İptal Et
          </button>
          <button
            type="button"
            onClick={kaydet}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor…' : 'Seçimleri Kaydet'}
          </button>
          <button
            type="button"
            onClick={ozetOnizle}
            disabled={toplamIslenecek === 0}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Özet Önizle
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExcelMenuAcik(!excelMenuAcik)}
              disabled={excelYukleniyor}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1 disabled:opacity-50"
            >
              {excelYukleniyor ? 'Hazırlanıyor…' : 'Excel İndir'}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {excelMenuAcik && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExcelMenuAcik(false)} aria-hidden />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                  <button
                    type="button"
                    onClick={() => { excelIndir('ozet'); setExcelMenuAcik(false) }}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Özet
                  </button>
                  <button
                    type="button"
                    onClick={() => { excelIndir('detay'); setExcelMenuAcik(false) }}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Detay
                  </button>
                  <button
                    type="button"
                    onClick={() => { excelIndir('genel'); setExcelMenuAcik(false) }}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Genel
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
            <h3 className="text-lg font-semibold text-slate-800">Özet — İzinli Zabıtalar (Rapor Bakiyesi)</h3>
            <button
              type="button"
              onClick={() => setOzetAcik(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Kapat
            </button>
          </div>
          <KesintimDetayClient
            modul="izy"
            donem={ozetData.donem as Parameters<typeof KesintimDetayClient>[0]['donem']}
            sonuc={ozetData.sonuc as Parameters<typeof KesintimDetayClient>[0]['sonuc']}
          />
        </div>
      )}
    </div>
  )
}
