'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import type { Tables, Views } from '@/types/database'

type IzinHak   = Tables<'izin_haklari'>
type KadroOzet = Views<'personel_kadro_ozet'>

interface SatirVeri {
  sicil_no:       string
  ad_soyad:       string | null
  statu:          string | null
  hak:            IzinHak | null
}

interface Props {
  yil:         number
  satirlar:    SatirVeri[]
  tumYillar:   number[]
  onKaydet:    (fd: FormData) => Promise<{ hata?: string }>
  onTopluOlustur: (yil: number) => Promise<{ hata?: string; olusturulan: number; guncellenen?: number }>
  onKullanilanGuncelle?: () => Promise<{ hata?: string; guncellenen?: number; toplam?: number }>
  onDevamAyrilisGuncelle?: () => Promise<{ hata?: string; guncellenen: number }>
}

function renkBg(kalan: number) {
  if (kalan > 10) return 'text-green-700 font-semibold'
  if (kalan > 0)  return 'text-amber-700 font-semibold'
  if (kalan < 0)  return 'text-red-600 font-semibold'
  return 'text-slate-400'
}

export default function IzinHakYonetimClient({
  yil, satirlar, tumYillar,   onKaydet, onTopluOlustur, onKullanilanGuncelle, onDevamAyrilisGuncelle,
}: Props) {
  const router                              = useRouter()
  const [aramaQ, setAramaQ]                = useState('')
  const [sadeceTanimsiz, setSadeceTanimsiz] = useState(false)
  const [modalAcik, setModalAcik]          = useState(false)
  const [seciliSatir, setSeciliSatir]      = useState<SatirVeri | null>(null)
  const [sunuciHata, setSunuciHata]        = useState<string | null>(null)
  const [topluMesaj, setTopluMesaj]        = useState<string | null>(null)
  const [topluYuzde, setTopluYuzde]        = useState<number | null>(null)
  const [isPending, startTransition]       = useTransition()

  const filtreli = useMemo(() => {
    let list = satirlar
    if (sadeceTanimsiz) list = list.filter(s => !s.hak)
    if (aramaQ.trim()) {
      const q = aramaQ.toLowerCase()
      list = list.filter(s =>
        s.sicil_no.toLowerCase().includes(q) ||
        (s.ad_soyad ?? '').toLowerCase().includes(q) ||
        (s.statu ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [satirlar, aramaQ, sadeceTanimsiz])

  const istatistik = useMemo(() => ({
    tanimlanan: satirlar.filter(s => s.hak).length,
    tanimsiz:   satirlar.filter(s => !s.hak).length,
    toplam:     satirlar.length,
  }), [satirlar])

  function duzenleAc(s: SatirVeri) {
    setSeciliSatir(s)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function yeniEkleAc() {
    setSeciliSatir(null)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function kapat() {
    setModalAcik(false)
    setSeciliSatir(null)
    setSunuciHata(null)
  }

  function handleYilDegistir(yeniYil: string) {
    router.push(`/izin/haklar?yil=${yeniYil}`)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onKaydet(fd)
      if (res.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  function handleToplu() {
    setTopluMesaj(null)
    startTransition(async () => {
      const res = await onTopluOlustur(yil)
      if (res.hata) {
        setTopluMesaj(`Hata: ${res.hata}`)
      } else if (res.olusturulan === 0 && (res.guncellenen ?? 0) === 0) {
        setTopluMesaj(`${yil} yılı için tüm personelin hakkı zaten tanımlı.`)
      } else {
        const msgs: string[] = []
        if ((res.olusturulan ?? 0) > 0) msgs.push(`${res.olusturulan} personel için hak oluşturuldu`)
        if ((res.guncellenen ?? 0) > 0) msgs.push(`${res.guncellenen} personelin hak edilen günü güncellendi`)
        setTopluMesaj(msgs.join('. '))
        if ((res.olusturulan ?? 0) > 0 || (res.guncellenen ?? 0) > 0) router.refresh()
      }
    })
  }

  const h = seciliSatir?.hak

  return (
    <div>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">İzin Hakları Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Yıllık devreden ve hak edilen gün tanımları</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Yıl seçici */}
          <select value={yil} onChange={e => handleYilDegistir(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
            {tumYillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Arama */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" placeholder="Sicil / Ad / Statü…" value={aramaQ} onChange={e => setAramaQ(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-48" />
          </div>

          {/* Kullanılan günleri hareketlerden güncelle */}
          {onKullanilanGuncelle && (
            <button
              onClick={() => {
                setTopluMesaj(null)
                setTopluYuzde(0)
                startTransition(async () => {
                  const res = await onKullanilanGuncelle()
                  if (res.hata) {
                    setTopluMesaj(`Hata: ${res.hata}`)
                    setTopluYuzde(null)
                  } else {
                    const g = res.guncellenen ?? 0
                    const t = res.toplam ?? g
                    const pct = t > 0 ? Math.round((g / t) * 100) : 100
                    setTopluYuzde(pct)
                    setTopluMesaj(`${g} / ${t} izin hakkı kaydında kullanılan gün güncellendi. (%${pct})`)
                  }
                  router.refresh()
                })
              }}
              disabled={isPending}
              className="flex items-center gap-2 border border-amber-300 text-amber-800 text-sm px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors font-medium whitespace-nowrap disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
              </svg>
              Kullanılan Günleri Güncelle
            </button>
          )}
          {onDevamAyrilisGuncelle && (
            <button
              onClick={() => {
                setTopluMesaj(null)
                startTransition(async () => {
                  const res = await onDevamAyrilisGuncelle()
                  if (res.hata) setTopluMesaj(`Hata: ${res.hata}`)
                  else setTopluMesaj(`${res.guncellenen} devam niteliğindeki izin kaydının ayrılış tarihi güncellendi.`)
                  router.refresh()
                })
              }}
              disabled={isPending}
              className="flex items-center gap-2 border border-slate-300 text-slate-600 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium whitespace-nowrap disabled:opacity-50"
              title="Devam niteliğindeki izinlerin ayrılış tarihini önceki izinin başlama tarihine günceller"
            >
              Devam Ayrılış Düzelt
            </button>
          )}
          {/* Toplu oluştur */}
          <button onClick={handleToplu} disabled={isPending}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium whitespace-nowrap disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
            {yil} Yılı Toplu Oluştur
          </button>

          {/* Tekli ekle */}
          <button onClick={yeniEkleAc}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tekil Ekle
          </button>
        </div>
      </div>

      {/* Toplu işlem mesajı */}
      {topluMesaj && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
          topluMesaj.startsWith('Hata')
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {topluMesaj}
          {topluYuzde !== null && !topluMesaj.startsWith('Hata') && (
            <span className="ml-2 font-semibold">(%{topluYuzde})</span>
          )}
          <button onClick={() => setTopluMesaj(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.tanimlanan}</p>
          <p className="text-xs text-slate-500 mt-0.5">Tanımlanan</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.tanimsiz}</p>
          <p className="text-xs text-slate-500 mt-0.5">Tanımlanmamış</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.toplam}</p>
          <p className="text-xs text-slate-500 mt-0.5">Toplam Personel</p>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={sadeceTanimsiz} onChange={e => setSadeceTanimsiz(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-slate-800" />
          Sadece tanımlanmamışları göster
        </label>
        <span className="text-xs text-slate-400">{filtreli.length} kayıt</span>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Sicil No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Statü</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">Devreden</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">Hak Edilen</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">Kullanılan</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24 pr-6">Kalan</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    {aramaQ || sadeceTanimsiz ? 'Filtreyle eşleşen kayıt yok.' : 'Kayıt bulunamadı.'}
                  </td>
                </tr>
              )}
              {filtreli.map((s, idx) => {
                const devreden     = s.hak?.devreden_gun ?? null
                const hakEdilen    = s.hak?.hak_edilen_gun ?? null
                const kullanilan   = s.hak?.kullanilan_gun ?? null
                const kalan        = s.hak ? (s.hak.kalan_gun ?? ((devreden ?? 0) + (hakEdilen ?? 0) - (kullanilan ?? 0))) : null

                return (
                  <tr key={`${s.sicil_no}-${idx}`} className={`hover:bg-slate-50 transition-colors ${!s.hak ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.sicil_no}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.ad_soyad ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.statu ?? '—'}</td>

                    {s.hak ? (
                      <>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{devreden}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{hakEdilen}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">{kullanilan ?? 0}</td>
                        <td className="px-4 py-3 text-right tabular-nums pr-6">
                          <span className={renkBg(kalan ?? 0)}>{kalan}</span>
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} className="px-4 py-3 text-center">
                        <span className="text-xs text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full font-medium">
                          Tanımlanmamış
                        </span>
                      </td>
                    )}

                    <td className="px-4 py-3 text-right">
                      <button onClick={() => duzenleAc(s)}
                        className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        {s.hak ? 'Düzenle' : 'Tanımla'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtreli.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtreli.length} personel gösteriliyor · {yil} yılı
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalAcik} onClose={kapat}
        title={seciliSatir?.hak ? `${seciliSatir.ad_soyad} — ${yil} Yılı Düzenle` : `${yil} Yılı İzin Hakkı Tanımla`}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="yil" value={yil} />

          {/* Personel seçimi (tekil ekle modunda) */}
          {!seciliSatir ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No *</label>
              <input name="sicil_no" type="text" required placeholder="0001"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          ) : (
            <>
              <input type="hidden" name="sicil_no" value={seciliSatir.sicil_no} />
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm">
                <p className="font-semibold text-slate-800">{seciliSatir.ad_soyad}</p>
                <p className="text-slate-500 font-mono text-xs mt-0.5">{seciliSatir.sicil_no} · {seciliSatir.statu ?? '—'}</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Devreden Gün</label>
              <input name="devreden_gun" type="number" min="0"
                defaultValue={h?.devreden_gun ?? 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 tabular-nums" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hak Edilen Gün</label>
              <input name="hak_edilen_gun" type="number" min="0"
                defaultValue={h?.hak_edilen_gun ?? 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 tabular-nums" />
            </div>
          </div>

          {h && (
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-slate-400">Kullanılan</p>
                <p className="font-semibold text-slate-700">{h.kullanilan_gun ?? 0} gün</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Kalan (güncel)</p>
                <p className={`font-semibold ${renkBg(h.kalan_gun ?? 0)}`}>{h.kalan_gun ?? 0} gün</p>
              </div>
            </div>
          )}

          {sunuciHata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : h ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
