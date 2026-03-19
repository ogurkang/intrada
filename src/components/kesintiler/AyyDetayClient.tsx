'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  ayyDetayYukle,
  ayySecimleriKaydet,
  type AyyDetayData,
  type AyyDetayIzin,
} from '@/app/(dashboard)/kesintiler/ayy/[donem_id]/actions'
import { ayyHesapla, type AyyIzinRow } from '@/lib/ayy-hesap'
import AyyOzetDisplay from '@/components/kesintiler/AyyOzetDisplay'
import { createClient } from '@/lib/supabase/client'

interface Props {
  donemId: number
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function IzinTablo({
  izinler,
  onSagaAl,
  onSolaAl,
  yon,
}: {
  izinler: AyyDetayIzin[]
  onSagaAl?: (sira_no: string) => void
  onSolaAl?: (sira_no: string) => void
  yon: 'aday' | 'islenecek'
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="w-12 px-3 py-2.5" />
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Sıra No</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Sicil No</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Adı Soyadı</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Tür</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Ayrılış</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Başlama</th>
            <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Süre (Gün)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {            izinler.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                {yon === 'aday' ? 'Hariç tutulan izin yok.' : 'Tüm izinler kesintiye dahil.'}
              </td>
            </tr>
          ) : (
            izinler.map((iz, i) => (
              <tr key={`${yon}-${iz.sira_no}-${iz.ayrilis}-${iz.baslama}-${i}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 text-center">
                  {yon === 'aday' && onSagaAl && (
                    <button
                      type="button"
                      onClick={() => onSagaAl(iz.sira_no)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Kesintiye dahil et"
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
                      title="Hariç tut"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                  )}
                </td>
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

export default function AyyDetayClient({ donemId }: Props) {
  const [data, setData] = useState<AyyDetayData | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [ozetData, setOzetData] = useState<{ donem: { id: number; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı' }; sonuc: Awaited<ReturnType<typeof ayyHesapla>>; tatilSayisi: number } | null>(null)
  const [izinDuzenleAcik, setIzinDuzenleAcik] = useState(false)
  const [excelMenuAcik, setExcelMenuAcik] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function yukle() {
    setYukleniyor(true)
    setHata(null)
    const res = await ayyDetayYukle(donemId)
    setYukleniyor(false)
    if ('hata' in res) {
      setHata(res.hata)
      setData(null)
    } else {
      setData(res)
    }
  }

  useEffect(() => { yukle() }, [donemId])

  useEffect(() => {
    if (data && data.islenecek.length > 0 && !izinDuzenleAcik) {
      ozetOnizle()
    } else if (data && data.islenecek.length === 0) {
      setOzetData(null)
    }
  }, [data?.islenecek.length, data?.aday.length, izinDuzenleAcik])

  useEffect(() => {
    if (data?.donem.durum === 'Kapalı' && izinDuzenleAcik) {
      setIzinDuzenleAcik(false)
    }
  }, [data?.donem.durum, izinDuzenleAcik])

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
    const haricList = data.aday.map(i => i.sira_no)
    startTransition(async () => {
      const res = await ayySecimleriKaydet(donemId, haricList)
      if (res.hata) setHata(res.hata)
      else { yukle(); setIzinDuzenleAcik(false) }
    })
  }

  function hepsiniIptal() {
    if (!confirm('Tüm hariç tutulan izinler kaldırılacak, hepsi tekrar kesintiye dahil edilecek. Devam edilsin mi?')) return
    startTransition(async () => {
      const res = await ayySecimleriKaydet(donemId, [])
      if (res.hata) setHata(res.hata)
      else { yukle(); setIzinDuzenleAcik(false) }
    })
  }

  async function excelIndir(tip: 'ozet' | 'kategorik') {
    try {
      const res = await fetch(`/api/kesintiler/ayy/excel?donem_id=${donemId}&tip=${tip}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error ?? 'Excel indirilemedi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const suffix = tip === 'ozet' ? '_Ozet' : '_Kategorik'
      a.download = `Aylik_Yemek_${data?.donem.donem_adi ?? 'Donem'}${suffix}.xlsx`.replace(/[:\*\?\/\\]/g, ' ')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Excel indirilemedi.')
    }
  }

  async function ozetOnizle() {
    if (!data || data.islenecek.length === 0) return
    const supabase = createClient()

    const { data: kadroMs } = await supabase
      .from('kadro_hareketleri')
      .select('asil, vekil')
      .is('ayrilis_tarihi', null)
      .in('statu', ['Memur', 'Sözleşmeli'])
    const memurSozlesmeliSiciller = new Set<string>()
    for (const k of kadroMs ?? []) {
      const s = (k.asil ?? k.vekil ?? '').trim()
      if (s) memurSozlesmeliSiciller.add(s)
    }

    const { data: tatilRaw } = await supabase
      .from('tanim_izin_tatil')
      .select('tatil_adi, tatil_turu, tatil_baslangici, tatil_bitisi, durum')
      .eq('durum', true)
    const tatiller = (tatilRaw ?? []).map(t => ({
      tatil_adi:        t.tatil_adi,
      tatil_turu:       t.tatil_turu,
      tatil_baslangici: t.tatil_baslangici,
      tatil_bitisi:     t.tatil_bitisi,
      durum:            t.durum ?? true,
    }))

    const siciller = [...new Set(data.islenecek.map(i => i.sicil_no).filter(Boolean))]
    const zabitaSet = new Set<string>()
    const unvanMap: Record<string, string> = {}
    if (siciller.length > 0) {
      const { data: kadroRaw } = await supabase
        .from('kadro_hareketleri')
        .select('asil, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
        .in('asil', siciller)
        .is('ayrilis_tarihi', null)
      for (const k of kadroRaw ?? []) {
        const unvan = ((k.gorev_unvani ?? '') + ' ' + (k.kadro_unvani ?? '')).toLowerCase()
        const mud   = ((k.gorev_mudurlugu ?? '') + ' ' + (k.kadro_mudurlugu ?? '')).toLowerCase()
        const isZabita = unvan.includes('zabıta') || unvan.includes('zabita') ||
                        mud.includes('zabıta müdürlüğü') || mud.includes('zabita mudurlugu')
        if (isZabita && k.asil) zabitaSet.add(k.asil)
      }
      const { data: kadroOzet } = await supabase
        .from('personel_kadro_ozet')
        .select('sicil_no, kadro_unvani')
        .in('sicil_no', siciller)
      ;(kadroOzet ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
    }

    const izinler: AyyIzinRow[] = data.islenecek.map(iz => ({
      sira_no:  iz.sira_no,
      sicil_no: iz.sicil_no,
      ad_soyad: iz.ad_soyad,
      tur:      iz.tur,
      ayrilis:  iz.ayrilis,
      baslama:  iz.baslama,
      gun:      iz.gun,
      isZabita: zabitaSet.has(iz.sicil_no),
      unvan:    unvanMap[iz.sicil_no] ?? '',
    }))

    let odBySiraNo: Record<string, number> = {}
    const { data: prevDonemRaw } = await supabase
      .from('aylik_yemek_yeni_donem')
      .select('*')
      .lt('bitis_tarihi', data.donem.baslangic_tarihi)
      .order('bitis_tarihi', { ascending: false })
      .limit(1)

    if (prevDonemRaw && prevDonemRaw.length > 0) {
      const prev = prevDonemRaw[0]
      const { data: prevSecimRaw } = await supabase
        .from('aylik_yemek_yeni_secim')
        .select('izin_sira_no, dahil')
        .eq('donem_id', prev.id)
      const prevHaricSet = new Set((prevSecimRaw ?? []).filter(s => s.dahil === false).map(s => s.izin_sira_no))

      const prevGenisBaslangic = new Date(prev.baslangic_tarihi)
      prevGenisBaslangic.setFullYear(prevGenisBaslangic.getFullYear() - 2)
      const prevGenisBitis = new Date(prev.bitis_tarihi)
      prevGenisBitis.setFullYear(prevGenisBitis.getFullYear() + 1)

      const { data: prevIzinRaw } = await supabase
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
        .neq('durum', 'İptal Edildi')
        .lte('ayrilis', prevGenisBitis.toISOString().substring(0, 10))
        .gte('baslama', prevGenisBaslangic.toISOString().substring(0, 10))
        .order('ayrilis')

      const filtreliPrevIzin = (prevIzinRaw ?? []).filter(iz => {
        if (!iz.sira_no) return false
        if (prevHaricSet.has(iz.sira_no)) return false
        return memurSozlesmeliSiciller.has(iz.sicil_no ?? '')
      })

      const prevSiciller = [...new Set(filtreliPrevIzin.map(i => i.sicil_no).filter(Boolean))]
      const prevZabitaSet = new Set<string>()
      const prevUnvanMap: Record<string, string> = {}
      if (prevSiciller.length > 0) {
        const { data: pk } = await supabase
          .from('kadro_hareketleri')
          .select('asil, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
          .in('asil', prevSiciller)
          .is('ayrilis_tarihi', null)
        for (const k of pk ?? []) {
          const unvan = ((k.gorev_unvani ?? '') + ' ' + (k.kadro_unvani ?? '')).toLowerCase()
          const mud   = ((k.gorev_mudurlugu ?? '') + ' ' + (k.kadro_mudurlugu ?? '')).toLowerCase()
          const isZabita = unvan.includes('zabıta') || unvan.includes('zabita') ||
                          mud.includes('zabıta müdürlüğü') || mud.includes('zabita mudurlugu')
          if (isZabita && k.asil) prevZabitaSet.add(k.asil)
        }
        const { data: po } = await supabase
          .from('personel_kadro_ozet')
          .select('sicil_no, kadro_unvani')
          .in('sicil_no', prevSiciller)
        ;(po ?? []).forEach(k => { if (k.sicil_no) prevUnvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
      }

      const adMap: Record<string, string> = {}
      const { data: calisanlar } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', prevSiciller)
      ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })

      const prevIzinlerFull: AyyIzinRow[] = filtreliPrevIzin.map(iz => ({
        sira_no:  iz.sira_no!,
        sicil_no: iz.sicil_no ?? '',
        ad_soyad: adMap[iz.sicil_no ?? ''] ?? iz.sicil_no ?? '',
        tur:      iz.tur ?? '',
        ayrilis:  iz.ayrilis,
        baslama:  iz.baslama,
        gun:      iz.gun ?? 0,
        isZabita: prevZabitaSet.has(iz.sicil_no ?? ''),
        unvan:    prevUnvanMap[iz.sicil_no ?? ''] ?? '',
      }))

      const prevSonuc = ayyHesapla({
        donemBas: prev.baslangic_tarihi,
        donemBit: prev.bitis_tarihi,
        izinler:  prevIzinlerFull,
        tatiller,
      })
      for (const s of prevSonuc.satirlar) {
        if (s.SD > 0) odBySiraNo[s.sira_no] = s.SD
      }
    }

    const sonuc = ayyHesapla({
      donemBas: data.donem.baslangic_tarihi,
      donemBit: data.donem.bitis_tarihi,
      izinler,
      tatiller,
      odBySiraNo,
    })

    setOzetData({
      donem: data.donem,
      sonuc,
      tatilSayisi: tatiller.length,
    })
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

  const readonly = data.donem.durum === 'Kapalı'

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/kesintiler/ayy" className="hover:text-slate-800 transition-colors">
          Aylık Yemek (AYY)
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">
          {data.donem.donem_adi ?? `Dönem #${donemId}`}
        </span>
        {data.donem.durum && (
          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
            data.donem.durum === 'Açık' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {data.donem.durum}
          </span>
        )}
      </nav>

      {readonly && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">
            Bu dönem kapalıdır. İzin düzenlemesi yapılamaz. Dönem listesinden &quot;Aç&quot; butonu ile tekrar açabilirsiniz.
          </p>
        </div>
      )}

      {(!izinDuzenleAcik || readonly) ? (
        /* Özet Önizleme (varsayılan görünüm) */
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <p className="text-sm text-slate-600">
              Tüm izinler otomatik olarak kesintiye dahildir. Çıkarmak istediğiniz izinler varsa İzinleri Düzenle ile hariç tutabilirsiniz.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/kesintiler/ayy"
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
                </svg>
                Geri
              </Link>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => setIzinDuzenleAcik(true)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  İzinleri Düzenle
                </button>
              )}
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
                      <button type="button" onClick={() => { excelIndir('kategorik'); setExcelMenuAcik(false) }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        Kategorik
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {ozetData ? (
            <AyyOzetDisplay
              donem={ozetData.donem}
              sonuc={ozetData.sonuc}
              tatilSayisi={ozetData.tatilSayisi}
            />
          ) : data.islenecek.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              Bu dönem için memur/sözleşmeli personel izin kaydı bulunamadı.
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">Özet hesaplanıyor…</div>
          )}
        </>
      ) : (
        /* İzinleri Düzenle ekranı */
        <>
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600">
              Kesintiye dahil olmasını istemediğiniz izinleri sol tarafa (Hariç Tutulan) taşıyın. Kaydet ile özet ekranına dönersiniz.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Kesintiye Dahil ({data.islenecek.length})</h3>
            <IzinTablo izinler={data.islenecek} onSolaAl={solaAl} yon="islenecek" />
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Hariç Tutulan ({data.aday.length})</h3>
            <IzinTablo izinler={data.aday} onSagaAl={sagaAl} yon="aday" />
          </div>

          <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200 justify-end">
            <button
              type="button"
              onClick={() => setIzinDuzenleAcik(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={hepsiniIptal}
              disabled={isPending || data.aday.length === 0}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tümünü Dahil Et
            </button>
            <button
              type="button"
              onClick={kaydet}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Kaydet ve Özet Ekranına Dön
            </button>
          </div>
        </>
      )}
    </div>
  )
}
