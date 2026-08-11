'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  ayyDetayYukle,
  ayyOzetHesapla,
  ayySecimleriKaydet,
  type AyyDetayData,
  type AyyDetayIzin,
} from '@/app/(dashboard)/kesintiler/ayy/[donem_id]/actions'
import AyyOzetDisplay from '@/components/kesintiler/AyyOzetDisplay'

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
  readonly = false,
}: {
  izinler: AyyDetayIzin[]
  onSagaAl?: (sira_no: string) => void
  onSolaAl?: (sira_no: string) => void
  yon: 'aday' | 'islenecek'
  readonly?: boolean
}) {
  const showActions = !readonly && (onSagaAl || onSolaAl)
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {showActions && <th className="w-12 px-3 py-2.5" />}
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
              <td colSpan={showActions ? 8 : 7} className="px-4 py-8 text-center text-slate-400 text-sm">
                {yon === 'aday' ? 'Hariç tutulan izin yok.' : 'Tüm izinler kesintiye dahil.'}
              </td>
            </tr>
          ) : (
            izinler.map((iz, i) => (
              <tr key={`${yon}-${iz.sira_no}-${iz.ayrilis}-${iz.baslama}-${i}`} className="hover:bg-slate-50 transition-colors">
                {showActions && (
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
                )}
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
  const [ozetData, setOzetData] = useState<
    Extract<Awaited<ReturnType<typeof ayyOzetHesapla>>, { sonuc: unknown }> | null
  >(null)
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
    if (!data || izinDuzenleAcik) return
    if (data.islenecek.length === 0) {
      setOzetData(null)
      return
    }
    let iptal = false
    ;(async () => {
      const res = await ayyOzetHesapla(donemId)
      if (iptal) return
      if ('hata' in res) {
        setHata(res.hata)
        setOzetData(null)
        return
      }
      setOzetData({
        donem: res.donem,
        sonuc: res.sonuc,
        tatilSayisi: res.tatilSayisi,
        statuBazliPersonel: res.statuBazliPersonel,
      })
    })()
    return () => { iptal = true }
  }, [data?.islenecek.length, data?.aday.length, donemId, izinDuzenleAcik])

  function sagaAl(sira_no: string) {
    if (data?.donem.durum === 'Kapalı') return
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
    if (data?.donem.durum === 'Kapalı') return
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
          {(data.donem.donem_adi ?? `Dönem #${donemId}`) + ` (${String(data.donem.donem_turu ?? 'normal')})`}
        </span>
        {data.donem.durum && (
          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
            data.donem.durum === 'Açık' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {data.donem.durum}
          </span>
        )}
      </nav>

      {readonly && !izinDuzenleAcik && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">
            Bu dönem kapalıdır. İzinleri Görüntüle ile dönem içindeki izin listesini salt okunur görebilirsiniz.
          </p>
        </div>
      )}

      {!izinDuzenleAcik ? (
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
              <button
                type="button"
                onClick={() => setIzinDuzenleAcik(true)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {readonly ? 'İzinleri Görüntüle' : 'İzinleri Düzenle'}
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
              statuBazliPersonel={ozetData.statuBazliPersonel}
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
        /* İzinleri Düzenle / Görüntüle ekranı */
        <>
          <div className={`mb-4 p-4 rounded-lg border ${readonly ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-sm text-slate-600">
              {readonly
                ? 'Kapalı dönem — izin listesi salt okunurdur; taşıma ve kayıt yapılamaz.'
                : 'Kesintiye dahil olmasını istemediğiniz izinleri sol tarafa (Hariç Tutulan) taşıyın. Kaydet ile özet ekranına dönersiniz.'}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Kesintiye Dahil ({data.islenecek.length})</h3>
            <IzinTablo izinler={data.islenecek} onSolaAl={readonly ? undefined : solaAl} yon="islenecek" readonly={readonly} />
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Hariç Tutulan ({data.aday.length})</h3>
            <IzinTablo izinler={data.aday} onSagaAl={readonly ? undefined : sagaAl} yon="aday" readonly={readonly} />
          </div>

          <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200 justify-end">
            <button
              type="button"
              onClick={() => setIzinDuzenleAcik(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              {readonly ? 'Özet Ekranına Dön' : 'İptal'}
            </button>
            {!readonly && (
              <>
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
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
