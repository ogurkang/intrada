'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'

type DonemSortSutun = 'sira_no' | 'donem_adi' | 'baslangic_tarihi' | 'bitis_tarihi' | 'durum'
type SortYon = 'asc' | 'desc'

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
  return yon === 'asc'
    ? <span className="ml-1 text-blue-500">↑</span>
    : <span className="ml-1 text-blue-500">↓</span>
}

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface Donem {
  id:               number
  yil:              number
  sira_no:          string | null
  donem_adi:        string | null
  baslangic_tarihi: string
  bitis_tarihi:     string
  durum:            'Açık' | 'Kapalı'
  created_at:       string
  secim_sayisi?:    number
}

export interface IzinSatir {
  sira_no:   string | null
  sicil_no:  string | null
  ad_soyad:  string | null
  tur:       string | null
  baslama:   string | null
  ayrilis:   string | null
  gun:       number | null
}

interface Props {
  baslik:      string
  kod:         string
  donemler:    Donem[]
  /** Opsiyonel: Başlık altında gösterilecek kural metni (örn. İZY için) */
  kuralMetni?: string
  /** true ise Seçim sütunu ve SecimModal gizlenir (IZY, IVY detay sayfasında seçim yapıldığı için) */
  hideSecimColumn?: boolean
  onEkle:      (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle:  (id: number, fd: FormData) => Promise<{ hata?: string }>
  onKapat:     (id: number) => Promise<{ hata?: string }>
  onAc:        (id: number) => Promise<{ hata?: string }>
  onSecimGetir:(donem_id: number) => Promise<{ izinler: IzinSatir[]; secimler: { izin_sira_no: string; dahil: boolean }[] }>
  onSecimKaydet:(donem_id: number, secimler: { izin_sira_no: string; dahil: boolean }[]) => Promise<{ hata?: string }>
  /** Detay sayfası varsa base URL (örn. "/kesintiler/ayy"). Eklenince tabloya Hesap butonu eklenir. */
  detayBase?:  string
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

// ─── Seçim Modalı ────────────────────────────────────────────────────────────
function SecimModal({
  open, onClose, donem, onGetir, onKaydet, onKaydetSonrasi,
}: {
  open: boolean; onClose: () => void; donem: Donem | null
  onGetir: (id: number) => Promise<{ izinler: IzinSatir[]; secimler: { izin_sira_no: string; dahil: boolean }[] }>
  onKaydet: (id: number, s: { izin_sira_no: string; dahil: boolean }[]) => Promise<{ hata?: string }>
  onKaydetSonrasi?: () => void
}) {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [izinler, setIzinler]       = useState<IzinSatir[]>([])
  const [secimler, setSecimler]     = useState<Map<string, boolean>>(new Map())
  const [hata, setHata]             = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function yukle() {
    if (!donem) return
    setYukleniyor(true)
    setHata(null)
    const { izinler: izL, secimler: secL } = await onGetir(donem.id)
    const sMap = new Map<string, boolean>()
    secL.forEach(s => sMap.set(s.izin_sira_no, s.dahil))
    // Henüz seçim kaydı olmayan izinleri de dahil et (varsayılan: dahil)
    izL.forEach(iz => { if (iz.sira_no && !sMap.has(iz.sira_no)) sMap.set(iz.sira_no, true) })
    setIzinler(izL)
    setSecimler(sMap)
    setYukleniyor(false)
  }

  // Modal açıldığında izinleri yükle
  useEffect(() => { if (open && donem) yukle() }, [open, donem?.id])

  function toggle(sira_no: string) {
    setSecimler(prev => {
      const next = new Map(prev)
      next.set(sira_no, !prev.get(sira_no))
      return next
    })
  }

  function hepsiniSec(dahil: boolean) {
    setSecimler(prev => {
      const next = new Map(prev)
      izinler.forEach(iz => { if (iz.sira_no) next.set(iz.sira_no, dahil) })
      return next
    })
  }

  function kaydet() {
    if (!donem) return
    setHata(null)
    startTransition(async () => {
      const payload = Array.from(secimler.entries()).map(([izin_sira_no, dahil]) => ({ izin_sira_no, dahil }))
      const res = await onKaydet(donem.id, payload)
      if (res.hata) setHata(res.hata)
      else {
        onClose()
        onKaydetSonrasi?.()
      }
    })
  }

  const dahilSayisi = Array.from(secimler.values()).filter(Boolean).length

  return (
    <Modal open={open} onClose={onClose} title={donem ? `Seçim Yönetimi — ${donem.donem_adi ?? donem.sira_no ?? donem.id}` : ''} size="lg">
      {yukleniyor ? (
        <p className="text-center py-8 text-slate-400">İzin kayıtları yükleniyor…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {tarih(donem?.baslangic_tarihi ?? null)} – {tarih(donem?.bitis_tarihi ?? null)} arasındaki izinler
            </p>
            <div className="flex gap-2">
              <button onClick={() => hepsiniSec(true)}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">Tümünü Dahil Et</button>
              <button onClick={() => hepsiniSec(false)}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">Tümünü Çıkar</button>
            </div>
          </div>

          {izinler.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Bu dönem aralığında izin kaydı bulunamadı.</p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-10 px-3 py-2.5 text-center">
                      <span className="text-slate-400 font-medium">{dahilSayisi}/{izinler.length}</span>
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Sıra No</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Personel</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Tür</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Başlangıç</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Bitiş</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-600">Gün</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {izinler.map(iz => {
                    const dahil = iz.sira_no ? (secimler.get(iz.sira_no) ?? true) : true
                    return (
                      <tr key={iz.sira_no} className={`transition-colors ${dahil ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-50'}`}>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={dahil}
                            onChange={() => iz.sira_no && toggle(iz.sira_no)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-800" />
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">{iz.sira_no ?? '—'}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{iz.ad_soyad ?? iz.sicil_no ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{iz.tur ?? '—'}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-500">{tarih(iz.baslama)}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-500">{tarih(iz.ayrilis)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-700">{iz.gun ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button type="button" onClick={kaydet} disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : `Seçimi Kaydet (${dahilSayisi} dahil)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Dönem Formu ─────────────────────────────────────────────────────────────
function DonemForm({
  open, onClose, secili, onSubmit, isPending, hata,
}: {
  open: boolean; onClose: () => void; secili: Donem | null
  onSubmit: (fd: FormData) => Promise<void>; isPending: boolean; hata: string | null
}) {
  const d = secili
  const buYil = new Date().getFullYear()

  return (
    <Modal open={open} onClose={onClose} title={d ? 'Dönem Düzenle' : 'Yeni Dönem Ekle'} size="sm">
      <form onSubmit={async e => { e.preventDefault(); await onSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Yıl *</label>
            <input name="yil" type="number" required defaultValue={d?.yil ?? buYil} min={2000} max={2100}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
            <input name="sira_no" type="text" defaultValue={d?.sira_no ?? ''}
              placeholder="2024/1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Adı</label>
          <input name="donem_adi" type="text" defaultValue={d?.donem_adi ?? ''}
            placeholder="Ocak 2024"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Başlangıç *</label>
            <input name="baslangic_tarihi" type="date" required defaultValue={d?.baslangic_tarihi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bitiş *</label>
            <input name="bitis_tarihi" type="date" required defaultValue={d?.bitis_tarihi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>

        {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : d ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function DonemListClient({
  baslik, kod, donemler, onEkle, onGuncelle, onKapat, onAc, onSecimGetir, onSecimKaydet, detayBase, kuralMetni, hideSecimColumn,
}: Props) {
  const [yilFiltre, setYilFiltre]     = useState(new Date().getFullYear())
  const [durumFiltre, setDurumFiltre] = useState<'Tümü' | 'Açık' | 'Kapalı'>('Tümü')
  const [formAcik, setFormAcik]       = useState(false)
  const [secimAcik, setSecimAcik]     = useState(false)
  const [seciliDonem, setSeciliDonem] = useState<Donem | null>(null)
  const [sunuciHata, setSunuciHata]   = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [sortSutun, setSortSutun]     = useState<DonemSortSutun>('baslangic_tarihi')
  const [sortYon, setSortYon]         = useState<SortYon>('desc')
  const router = useRouter()

  function handleSutunTikla(sutun: DonemSortSutun) {
    if (sortSutun === sutun) setSortYon(y => y === 'asc' ? 'desc' : 'asc')
    else { setSortSutun(sutun); setSortYon('asc') }
  }

  const filtreli = useMemo(() => {
    let list = donemler
    if (durumFiltre !== 'Tümü') list = list.filter(d => d.durum === durumFiltre)
    list = list.filter(d => d.yil === yilFiltre)
    return [...list].sort((a, b) => {
      let fark = 0
      if (sortSutun === 'sira_no') {
        fark = (a.sira_no ?? '').localeCompare(b.sira_no ?? '', 'tr', { numeric: true })
      } else if (sortSutun === 'donem_adi') {
        fark = (a.donem_adi ?? '').localeCompare(b.donem_adi ?? '', 'tr')
      } else if (sortSutun === 'baslangic_tarihi') {
        fark = a.baslangic_tarihi.localeCompare(b.baslangic_tarihi)
      } else if (sortSutun === 'bitis_tarihi') {
        fark = a.bitis_tarihi.localeCompare(b.bitis_tarihi)
      } else if (sortSutun === 'durum') {
        fark = a.durum.localeCompare(b.durum, 'tr')
      }
      return sortYon === 'asc' ? fark : -fark
    })
  }, [donemler, yilFiltre, durumFiltre, sortSutun, sortYon])

  const tumYillar = useMemo(() => {
    const yillar = new Set(donemler.map(d => d.yil))
    yillar.add(new Date().getFullYear())
    return Array.from(yillar).sort((a, b) => b - a)
  }, [donemler])

  function yeniEkleAc()           { setSeciliDonem(null); setSunuciHata(null); setFormAcik(true) }
  function duzenleAc(d: Donem)    { setSeciliDonem(d);    setSunuciHata(null); setFormAcik(true) }
  function secimAc(d: Donem)      { setSeciliDonem(d); setSecimAcik(true) }
  function formKapat()            { setFormAcik(false); setSeciliDonem(null); setSunuciHata(null) }

  async function handleSubmit(fd: FormData) {
    setSunuciHata(null)
    startTransition(async () => {
      const res = seciliDonem ? await onGuncelle(seciliDonem.id, fd) : await onEkle(fd)
      if (res.hata) setSunuciHata(res.hata)
      else {
        formKapat()
        broadcastIntradaRefresh('kesintiler')
        router.refresh()
      }
    })
  }

  function handleKapat(id: number) {
    if (!confirm('Bu dönem kapatılacak. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const res = await onKapat(id)
      if (res.hata) alert(res.hata)
      else {
        broadcastIntradaRefresh('kesintiler')
        router.refresh()
      }
    })
  }

  function handleAc(id: number) {
    if (!confirm('Bu dönem tekrar açılacak. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const res = await onAc(id)
      if (res.hata) alert(res.hata)
      else {
        broadcastIntradaRefresh('kesintiler')
        router.refresh()
      }
    })
  }

  const acikSayisi = donemler.filter(d => d.durum === 'Açık').length

  return (
    <div>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {acikSayisi > 0
              ? <span className="text-amber-600 font-medium">{acikSayisi} açık dönem</span>
              : 'Açık dönem yok'}
          </p>
          {kuralMetni && (
            <p className="text-sm leading-6 text-slate-600 mt-2 max-w-4xl">{kuralMetni}</p>
          )}
        </div>
        <button onClick={yeniEkleAc}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Dönem
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={yilFiltre} onChange={e => setYilFiltre(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          {tumYillar.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(['Tümü', 'Açık', 'Kapalı'] as const).map(d => (
          <button key={d} onClick={() => setDurumFiltre(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              durumFiltre === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>
            {d}
          </button>
        ))}
        <span className="text-xs text-slate-400">{filtreli.length} dönem</span>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {(['sira_no', 'donem_adi', 'baslangic_tarihi', 'bitis_tarihi'] as DonemSortSutun[]).map((s, i) => {
                  const labels: Record<string, string> = { sira_no: 'Sıra No', donem_adi: 'Dönem Adı', baslangic_tarihi: 'Başlangıç', bitis_tarihi: 'Bitiş' }
                  const widths: Record<string, string> = { sira_no: 'w-24', baslangic_tarihi: 'w-28', bitis_tarihi: 'w-28' }
                  const center = i >= 2
                  const aktif = sortSutun === s
                  return (
                    <th key={s}
                      onClick={() => handleSutunTikla(s)}
                      className={`px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors ${center ? 'text-center' : 'text-left'} ${widths[s] ?? ''} ${aktif ? 'text-blue-600 bg-blue-50' : ''}`}>
                      {labels[s]}<SortIkon aktif={aktif} yon={sortYon} />
                    </th>
                  )
                })}
                {!hideSecimColumn && <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Seçim</th>}
                {(() => {
                  const aktif = sortSutun === 'durum'
                  return (
                    <th onClick={() => handleSutunTikla('durum')}
                      className={`text-center px-4 py-3 font-semibold text-slate-600 w-24 cursor-pointer select-none hover:bg-slate-100 transition-colors ${aktif ? 'text-blue-600 bg-blue-50' : ''}`}>
                      Durum<SortIkon aktif={aktif} yon={sortYon} />
                    </th>
                  )
                })()}
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-40">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 && (
                <tr><td colSpan={hideSecimColumn ? 6 : 7} className="text-center py-14 text-slate-400">{yilFiltre} yılında dönem kaydı yok.</td></tr>
              )}
              {filtreli.map(d => (
                <tr
                  key={d.id}
                  className={`hover:bg-slate-50 transition-colors ${detayBase ? 'cursor-pointer' : ''}`}
                  onClick={detayBase ? (e) => {
                    if ((e.target as HTMLElement).closest('button, a')) return
                    router.push(`${detayBase}/${d.id}`)
                  } : undefined}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.sira_no ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{d.donem_adi ?? `${d.yil} Dönemi`}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(d.baslangic_tarihi)}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(d.bitis_tarihi)}</td>
                  {!hideSecimColumn && (
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => secimAc(d)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        {d.secim_sayisi != null ? `${d.secim_sayisi} kayıt` : 'Yönet'}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      d.durum === 'Açık' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {d.durum}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {detayBase && (
                        <Link href={`${detayBase}/${d.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Detay">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      )}
                      <button onClick={() => duzenleAc(d)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Düzenle">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {d.durum === 'Açık' && (
                        <button onClick={() => handleKapat(d.id)} disabled={isPending}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Kapat">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                      {d.durum === 'Kapalı' && (
                        <button onClick={() => handleAc(d.id)} disabled={isPending}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                          title="Aç">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DonemForm
        open={formAcik} onClose={formKapat} secili={seciliDonem}
        onSubmit={handleSubmit} isPending={isPending} hata={sunuciHata}
      />

      {!hideSecimColumn && (
        <SecimModal
          open={secimAcik} onClose={() => setSecimAcik(false)}
          donem={seciliDonem}
          onGetir={onSecimGetir}
          onKaydet={onSecimKaydet}
          onKaydetSonrasi={() => {
            broadcastIntradaRefresh('kesintiler')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
