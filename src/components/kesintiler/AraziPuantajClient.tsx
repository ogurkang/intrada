'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DashboardAnaSayfaLink from '@/components/ui/DashboardAnaSayfaLink'
import { useRouter } from 'next/navigation'
import { PUANTAJ_KOD_ACIKLAMA } from '@/lib/puantaj-kod-aciklama'

export const MAX_ARAZI_GUN = 20

/** X = arazi işareti (açık mavi); HT/B dışı izin kodları (S, R, …) açık yeşil */
const KOD_RENKLER = {
  HT: 'bg-[#E0E0E0]',
  B: 'bg-[#FFE4CC]',
  X: 'bg-[#CCE5FF]',
  YESIL: 'bg-[#E8F5E9]',
}

export interface AraziPersonel {
  sicil_no: string
  ad_soyad: string | null
  mudurluk: string | null
  oran: number
}

export interface AraziDonemBilgi {
  id:               number
  yil:              number
  sira_no:          string | null
  donem_adi:        string | null
  baslangic_tarihi: string
  bitis_tarihi:     string
  durum:            'Açık' | 'Kapalı'
}

export interface MudurlukPersonel {
  sicil_no: string
  ad_soyad: string
}

interface Props {
  donem:        AraziDonemBilgi
  personeller:  AraziPersonel[]
  tatilGunler:  string[]           // ISO tarih stringleri
  markedSet:    Set<string>        // "sicil_no:YYYY-MM-DD"
  mudurlukPersonelMap: Record<string, MudurlukPersonel[]>
  /** Kullanıcı rolü: kadrodan gelen görev müdürlükleri; verilmezse personellerden türetilir */
  mudurlukSecenekleri?: string[]
  /** Tek görev müdürlüğü → müdürlük seçimi salt okunur */
  mudurlukSaltOkunur?: boolean
  /** Kullanıcı rolü: üstte Ana sayfa linki */
  showAnaSayfaLink?: boolean
  /** İptal hariç izin hareketleri: sicil → tarih → puantaj kodu (S, RR, …) */
  izinKodlariBySicilGun?: Record<string, Record<string, string>>
  onKaydetToplu: (donem_id: number, sicilNolar: string[], isaretler: { sicil_no: string; tarih: string }[], mudurluk: string) => Promise<{ hata?: string }>
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

const AYLAR_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

// Dönemdeki ayları al (max 3)
function donemAylari(baslangic: string, bitis: string): { yil: number; ay: number; ayAdi: string }[] {
  const aylar: { yil: number; ay: number; ayAdi: string }[] = []
  const d = new Date(baslangic)
  const son = new Date(bitis)
  const seen = new Set<string>()
  while (d <= son && aylar.length < 3) {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!seen.has(key)) {
      seen.add(key)
      aylar.push({
        yil: d.getFullYear(),
        ay: d.getMonth(),
        ayAdi: `${AYLAR_TR[d.getMonth()]}.${String(d.getFullYear()).slice(2)}`,
      })
    }
    d.setMonth(d.getMonth() + 1)
    d.setDate(1)
  }
  return aylar
}

// Verilen tarih dönem içinde mi?
function donemIcerisinde(dateStr: string, baslangic: string, bitis: string): boolean {
  return dateStr >= baslangic && dateStr <= bitis
}

export default function AraziPuantajClient({
  donem,
  personeller,
  tatilGunler,
  markedSet: initialMarked,
  mudurlukPersonelMap = {},
  mudurlukSecenekleri,
  mudurlukSaltOkunur,
  showAnaSayfaLink = false,
  izinKodlariBySicilGun = {},
  onKaydetToplu,
}: Props) {
  const router = useRouter()
  const [marked, setMarked] = useState<Set<string>>(initialMarked)
  const [hatalar, setHatalar] = useState<Record<string, string>>({})
  const [seciliMudurluk, setSeciliMudurluk] = useState<string>('')
  const [gunleriIsaretleModu, setGunleriIsaretleModu] = useState(false)
  const [kaydetYukleniyor, setKaydetYukleniyor] = useState(false)
  const [puantor, setPuantor] = useState<string>('')
  const [birimAmiri, setBirimAmiri] = useState<string>('')
  const [mudur, setMudur] = useState<string>('')

  const mudurlukler = (mudurlukSecenekleri && mudurlukSecenekleri.length > 0)
    ? [...mudurlukSecenekleri].sort((a, b) => (a || 'zzz').localeCompare(b || 'zzz'))
    : [...new Set(personeller.map(p => p.mudurluk ?? ''))].sort((a, b) => (a || 'zzz').localeCompare(b || 'zzz'))
  const ilkMud = mudurlukler[0] ?? ''
  const aktifMud = seciliMudurluk || ilkMud
  const imzaPersonel = mudurlukPersonelMap[aktifMud] ?? []
  const imzaSicilSet = new Set(imzaPersonel.map(p => p.sicil_no))
  const filtrelenmisPersonel = aktifMud
    ? personeller.filter(p => (p.mudurluk ?? '') === aktifMud)
    : personeller

  const aylar = donemAylari(donem.baslangic_tarihi, donem.bitis_tarihi)
  const tatilSet = new Set(tatilGunler)
  const readonly = donem.durum === 'Kapalı'

  function sayiGetir(sicil_no: string): number {
    let say = 0
    aylar.forEach(ay => {
      for (let g = 1; g <= 31; g++) {
        const d = new Date(ay.yil, ay.ay, g)
        if (d.getDate() !== g || d.getMonth() !== ay.ay) continue
        const iso = toISO(d)
        if (donemIcerisinde(iso, donem.baslangic_tarihi, donem.bitis_tarihi) && marked.has(`${sicil_no}:${iso}`)) say++
      }
    })
    return say
  }

  function aylikSayiGetir(sicil_no: string, ay: { yil: number; ay: number }): number {
    let say = 0
    for (let g = 1; g <= 31; g++) {
      const d = new Date(ay.yil, ay.ay, g)
      if (d.getDate() !== g || d.getMonth() !== ay.ay) continue
      const iso = toISO(d)
      if (donemIcerisinde(iso, donem.baslangic_tarihi, donem.bitis_tarihi) && marked.has(`${sicil_no}:${iso}`)) say++
    }
    return say
  }

  function gunKoduGetir(sicil_no: string, yil: number, ay: number, gun: number): string {
    const d = new Date(yil, ay, gun)
    if (d.getDate() !== gun || d.getMonth() !== ay) return ''
    const iso = toISO(d)
    if (!donemIcerisinde(iso, donem.baslangic_tarihi, donem.bitis_tarihi)) return ''
    const hGunu = d.getDay()
    const hafSonu = hGunu === 0 || hGunu === 6
    if (hafSonu) return 'HT'
    if (tatilSet.has(iso)) return 'B'
    const izinKod = izinKodlariBySicilGun[sicil_no]?.[iso]
    if (izinKod) return izinKod
    return marked.has(`${sicil_no}:${iso}`) ? 'X' : ''
  }

  /** Yalnızca "Günleri İşaretle" açıkken; tek tıklamada sunucuya gitmez, Kaydet ile toplu kayıt */
  const handleToggle = useCallback((sicil_no: string, tarih: string) => {
    if (readonly) return
    if (!gunleriIsaretleModu) return
    if (izinKodlariBySicilGun[sicil_no]?.[tarih]) return
    const key = `${sicil_no}:${tarih}`
    const mevcutIsaret = marked.has(key)
    const mevcutSayisi = sayiGetir(sicil_no)
    if (!mevcutIsaret && mevcutSayisi >= MAX_ARAZI_GUN) {
      setHatalar(prev => ({ ...prev, [sicil_no]: `En fazla ${MAX_ARAZI_GUN} gün seçilebilir.` }))
      return
    }
    setMarked(prev => {
      const next = new Set(prev)
      if (mevcutIsaret) next.delete(key)
      else next.add(key)
      return next
    })
    setHatalar(prev => { const n = { ...prev }; delete n[sicil_no]; return n })
  }, [readonly, gunleriIsaretleModu, marked, izinKodlariBySicilGun])

  async function excelIndir() {
    try {
      const params = new URLSearchParams({
        donem_id: String(donem.id),
        mudurluk: aktifMud,
      })
      if (puantor) params.set('puantor', puantor)
      if (birimAmiri) params.set('birim_amiri', birimAmiri)
      if (mudur) params.set('mudur', mudur)
      const url = `/api/kesintiler/arazi/excel?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) {
        const ct = res.headers.get('content-type') ?? ''
        const err = ct.includes('json') ? (await res.json().catch(() => ({}))) : {}
        alert(err?.error ?? `Excel indirilemedi (${res.status})`)
        return
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `Arazi_Puantaj_${donem.donem_adi ?? 'Donem'}_${aktifMud.replace(/[:\*\?\/\\]/g, ' ')}.xlsx`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error('ARAZI_EXCEL_HATASI: ', e)
      alert('Excel indirilemedi.')
    }
  }

  const handleKaydet = useCallback(async () => {
    if (readonly) return
    if (!gunleriIsaretleModu) {
      router.refresh()
      return
    }
    setKaydetYukleniyor(true)
    setHatalar({})
    const isaretler = Array.from(marked).map(k => {
      const [sicil_no, tarih] = k.split(':')
      return { sicil_no, tarih }
    }).filter(i => filtrelenmisPersonel.some(p => p.sicil_no === i.sicil_no))
    const sicilNolar = filtrelenmisPersonel.map(p => p.sicil_no)
    const res = await onKaydetToplu(donem.id, sicilNolar, isaretler, aktifMud)
    setKaydetYukleniyor(false)
    if (res.hata) setHatalar({ _toplu: res.hata })
    else {
      setGunleriIsaretleModu(false)
      router.refresh()
    }
  }, [readonly, gunleriIsaretleModu, marked, donem.id, filtrelenmisPersonel, onKaydetToplu, aktifMud])

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Link href="/kesintiler/arazi" className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
          </svg>
          Geri
        </Link>
        {showAnaSayfaLink && <DashboardAnaSayfaLink />}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{donem.donem_adi ?? `${donem.yil} Dönemi`}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date(donem.baslangic_tarihi).toLocaleDateString('tr-TR')} – {new Date(donem.bitis_tarihi).toLocaleDateString('tr-TR')}
              {' · '}{filtrelenmisPersonel.length} personel{' · '}
              <span className={donem.durum === 'Açık' ? 'text-green-600 font-medium' : 'text-slate-500'}>{donem.durum}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setGunleriIsaretleModu(!gunleriIsaretleModu)} disabled={readonly}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                gunleriIsaretleModu ? 'bg-amber-50 text-amber-800 border-amber-300' : 'text-slate-600 bg-white border-slate-300 hover:bg-slate-50'
              }`}>
              Günleri İşaretle
            </button>
            <button type="button" onClick={handleKaydet} disabled={readonly || kaydetYukleniyor}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
              {kaydetYukleniyor ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Kaydediliyor…
                </>
              ) : (
                'Kaydet'
              )}
            </button>
            <button type="button" onClick={excelIndir}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel İndir
            </button>
          </div>
        </div>
        {mudurlukler.length >= 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Müdürlük</label>
            <select value={aktifMud} onChange={e => setSeciliMudurluk(e.target.value)}
              disabled={mudurlukSaltOkunur}
              title={mudurlukSaltOkunur ? 'Kadronuzda tek görev müdürlüğü tanımlı; değiştirilemez.' : undefined}
              className={`w-full max-w-md px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                mudurlukSaltOkunur ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed' : 'border-slate-300 bg-white'
              }`}>
              {mudurlukler.map(m => <option key={m || 'bos'} value={m}>{m || 'Belirtilmemiş'}</option>)}
            </select>
            {mudurlukSaltOkunur && (
              <p className="mt-1 text-xs text-slate-500">Kadro görev müdürlüğünüz tek olduğu için seçim salt okunur.</p>
            )}
          </div>
        )}
      </div>

      {hatalar._toplu && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {hatalar._toplu}
        </div>
      )}

      {readonly && (
        <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
          Bu dönem kapalı. Puantaj değişikliği yapılamaz.
        </div>
      )}

      {personeller.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          Bu dönem için uygun personel bulunamadı. Arazi tazminatı hakkı olan ünvanları kontrol edin.
        </div>
      )}

      {filtrelenmisPersonel.length > 0 && aylar.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: 600 }}>
              <colgroup>
                <col className="w-12" />
                <col className="w-12" />
                <col className="min-w-[12rem]" />
                <col className="w-16" />
                {Array.from({ length: 31 }, (_, i) => <col key={i} className="w-7 min-w-[28px]" />)}
                <col className="w-12" />
                <col className="w-16" />
                <col className="w-10" />
                <col className="w-12" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 z-20 px-3 py-2 text-center font-semibold text-slate-600 w-12 border-r border-slate-200">Sıra No</th>
                  <th className="sticky left-0 bg-slate-50 z-20 px-3 py-2 text-center font-semibold text-slate-600 w-12 border-r border-slate-200">Sicil No</th>
                  <th className="sticky left-0 bg-slate-50 z-20 px-3 py-2 text-left font-semibold text-slate-600 min-w-48 border-r border-slate-200">Adı Soyadı</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-16 border-r border-slate-200">Ay</th>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(g => (
                    <th key={g} className="w-7 text-center py-1 font-medium text-slate-500 border-r border-slate-100">{g}</th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-12 border-r border-slate-200">Aylık Gün</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-16 border-r border-slate-200">Üç Aylık Gün</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10 border-r border-slate-200">Oran</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-12 border-r border-slate-200">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrelenmisPersonel.map((p, pIdx) => {
                  const uctoplam = sayiGetir(p.sicil_no)
                  const maxDoldu = uctoplam >= MAX_ARAZI_GUN
                  const toplamDeger = uctoplam * (p.oran || 0)
                  return aylar.map((ay, ayIdx) => (
                    <tr key={`${p.sicil_no}-${ay.ayAdi}`} className="hover:bg-slate-50 transition-colors">
                      {ayIdx === 0 && (
                        <>
                          <td rowSpan={aylar.length} className="sticky left-0 bg-white z-10 px-3 py-2 text-center border-r border-slate-200 align-middle">
                            {pIdx + 1}
                          </td>
                          <td rowSpan={aylar.length} className="sticky left-0 bg-white z-10 px-3 py-2 text-center border-r border-slate-200 align-middle font-mono text-[10px]">
                            {p.sicil_no}
                          </td>
                          <td rowSpan={aylar.length} className="sticky left-0 bg-white z-10 px-3 py-2 border-r border-slate-200 align-middle">
                            <p className="font-medium text-slate-800 leading-tight">{p.ad_soyad ?? p.sicil_no}</p>
                            {hatalar[p.sicil_no] && <p className="text-red-500 text-[10px] mt-0.5">{hatalar[p.sicil_no]}</p>}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-1 text-center border-r border-slate-200">{ay.ayAdi}</td>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(gun => {
                        const kod = gunKoduGetir(p.sicil_no, ay.yil, ay.ay, gun)
                        const iso = `${ay.yil}-${String(ay.ay + 1).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
                        const hGunu = new Date(ay.yil, ay.ay, gun).getDay()
                        const hafSonu = hGunu === 0 || hGunu === 6
                        const tatil = tatilSet.has(iso)
                        const izinKodHucre = izinKodlariBySicilGun[p.sicil_no]?.[iso]
                        const bosHucre = kod === ''
                        const hucreKey = `${p.sicil_no}:${iso}`
                        const izinHucre = Boolean(izinKodHucre)
                        const araziXIsareti =
                          (kod === 'X' || (marked.has(hucreKey) && !hafSonu && !tatil && !izinHucre))
                        const renk =
                          hafSonu
                            ? KOD_RENKLER.HT
                            : tatil
                              ? KOD_RENKLER.B
                              : izinHucre
                                ? KOD_RENKLER.YESIL
                                : araziXIsareti
                                  ? KOD_RENKLER.X
                                  : kod !== ''
                                    ? KOD_RENKLER.YESIL
                                    : ''

                        const gecerliGun = new Date(ay.yil, ay.ay, gun).getDate() === gun && new Date(ay.yil, ay.ay, gun).getMonth() === ay.ay
                        const donemde = gecerliGun && donemIcerisinde(iso, donem.baslangic_tarihi, donem.bitis_tarihi)

                        const izinSpanCls =
                          (izinKodHucre?.length ?? 0) > 2
                            ? 'text-[7px] leading-[1.05] font-bold text-slate-900 px-0.5'
                            : 'text-[10px] font-bold text-slate-900'

                        return (
                          <td key={`${p.sicil_no}-${ay.ayAdi}-${gun}`} className={`w-7 min-w-[28px] text-center py-0.5 border-r border-slate-100 ${renk}`}>
                            {!gecerliGun || !donemde ? '' :
                             hafSonu || tatil ? (
                              <span className={`text-[10px] font-bold ${kod === 'B' ? 'text-slate-900' : 'text-slate-600'}`}>{kod}</span>
                            ) : izinKodHucre ? (
                              <span className={izinSpanCls} title={`İzin: ${izinKodHucre}`}>{izinKodHucre}</span>
                            ) : gunleriIsaretleModu ? (
                              bosHucre ? (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    const isoEl = (e.currentTarget as HTMLButtonElement).dataset.iso
                                    const sicil = (e.currentTarget as HTMLButtonElement).dataset.sicil
                                    if (isoEl && sicil) handleToggle(sicil, isoEl)
                                  }}
                                  disabled={readonly || maxDoldu}
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                                    readonly || maxDoldu ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50' :
                                    'border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50 cursor-pointer text-slate-400 hover:text-teal-600'
                                  }`}
                                  data-sicil={p.sicil_no}
                                  data-iso={iso}
                                  data-gun={gun}
                                  title={`${gun}. gün - İşaretle`}
                                >
                                  <span className="text-[10px] font-bold">+</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-900">X</span>
                              )
                            ) : (
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold select-none ${
                                  kod === 'X' ? 'text-slate-900' : 'text-slate-300'
                                }`}
                                title={kod === 'X' ? 'Arazi işareti — düzenlemek için Günleri İşaretle’yi açın' : `${gun}. gün`}
                              >
                                {kod === 'X' ? 'X' : '·'}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-center border-r border-slate-200 font-bold tabular-nums">
                        {aylikSayiGetir(p.sicil_no, ay)}
                      </td>
                      {ayIdx === 0 && (
                        <>
                          <td rowSpan={aylar.length} className="px-2 py-1 text-center border-r border-slate-200 font-bold tabular-nums align-middle">
                            {uctoplam}
                          </td>
                          <td rowSpan={aylar.length} className="px-2 py-1 text-center border-r border-slate-200 font-bold tabular-nums align-middle">
                            {p.oran || 0}
                          </td>
                          <td rowSpan={aylar.length} className="px-2 py-1 text-center border-r border-slate-200 font-bold tabular-nums align-middle">
                            {toplamDeger.toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <p className="leading-relaxed text-[11px]">{PUANTAJ_KOD_ACIKLAMA}</p>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[10px] font-bold ${KOD_RENKLER.X}`}>X</span>
                Arazi işareti (çalışılan gün)
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[9px] font-bold ${KOD_RENKLER.YESIL}`}>S</span>
                İzin türü kodu (iptal hariç; yeşil alan)
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[10px] font-bold ${KOD_RENKLER.HT}`}>HT</span>
                Hafta tatili
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[10px] font-bold ${KOD_RENKLER.B}`}>B</span>
                Bayram / resmi tatil
              </span>
              <span className="ml-auto text-slate-400">
                Maks. işaretlenebilir gün: <strong className="text-slate-600">{MAX_ARAZI_GUN}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {(mudurlukPersonelMap[aktifMud]?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Puantör</label>
            <select value={puantor} onChange={e => setPuantor(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]">
              <option value="">Seçiniz</option>
              {mudurlukPersonelMap[aktifMud]?.map(pr => (
                <option key={pr.sicil_no} value={pr.sicil_no}>{pr.ad_soyad} ({pr.sicil_no})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Birim Amiri</label>
            <select value={birimAmiri} onChange={e => setBirimAmiri(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]">
              <option value="">Seçiniz</option>
              {mudurlukPersonelMap[aktifMud]?.map(pr => (
                <option key={pr.sicil_no} value={pr.sicil_no}>{pr.ad_soyad} ({pr.sicil_no})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Müdür</label>
            <select value={mudur} onChange={e => setMudur(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]">
              <option value="">Seçiniz</option>
              {mudurlukPersonelMap[aktifMud]?.map(pr => (
                <option key={pr.sicil_no} value={pr.sicil_no}>{pr.ad_soyad} ({pr.sicil_no})</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
