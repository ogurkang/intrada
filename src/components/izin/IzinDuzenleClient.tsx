'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { izinGunHesapla } from '@/app/(dashboard)/izin/actions'
import type { Tables } from '@/types/database'

type IzinHareketi = Tables<'izin_hareketleri'>
type Durum = IzinHareketi['durum']

interface Props {
  izin: IzinHareketi
  adSoyad: string | null
  izinTurleri: string[]
  onGuncelle:      (id: number, fd: FormData) => Promise<{ hata?: string }>
  onDurumDegistir: (id: number, d: Durum)    => Promise<{ hata?: string }>
}

/** Takvim günü farkı (Yıllık İzin dışı türler için) */
function hesaplaGunBasit(ayrilis: string, baslama: string): number {
  if (!ayrilis || !baslama) return 0
  const a = new Date(ayrilis)
  const b = new Date(baslama)
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

const DURUMLAR: Durum[] = ['Taslak', 'Onaylandı', 'Değiştirildi', 'İptal Edildi']

export default function IzinDuzenleClient({
  izin, adSoyad, izinTurleri, onGuncelle, onDurumDegistir,
}: Props) {
  const router = useRouter()
  const [hata, setHata]               = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [tur, setTur]                 = useState(izin.tur ?? '')
  const [ayrilis, setAyrilis]         = useState(izin.ayrilis ?? '')
  const [baslama, setBaslama]         = useState(izin.baslama ?? '')
  const [gun, setGun]                 = useState(izin.gun)
  const [bilgi, setBilgi]             = useState(izin.bilgi ?? '')

  const isYillikIzin = tur === 'Yıllık İzin' || (tur && tur.includes('Yıllık'))

  useEffect(() => {
    if (!ayrilis || !baslama) { setGun(0); setBilgi(''); return }
    if (!isYillikIzin) {
      setGun(hesaplaGunBasit(ayrilis, baslama))
      setBilgi('')
      return
    }
    let cancelled = false
    izinGunHesapla(izin.sicil_no, tur, ayrilis, baslama, izin.id).then(res => {
      if (!cancelled) {
        setGun(res.gun)
        setBilgi(res.bilgiler?.join('\n') ?? '')
      }
    })
    return () => { cancelled = true }
  }, [ayrilis, baslama, tur, izin.sicil_no, isYillikIzin])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    fd.set('gun', String(gun))
    fd.set('bilgi', bilgi)
    startTransition(async () => {
      const res = await onGuncelle(izin.id, fd)
      if (res.hata) { setHata(res.hata); return }
      router.push(`/izin?yil=${izin.yil ?? new Date().getFullYear()}`)
    })
  }

  function handleDurumDegistir(yeniDurum: Durum) {
    if (!confirm(`Durum "${yeniDurum}" olarak değiştirilecek. Onaylıyor musunuz?`)) return
    startTransition(async () => {
      const res = await onDurumDegistir(izin.id, yeniDurum)
      if (res.hata) { setHata(res.hata); return }
      router.push(`/izin?yil=${izin.yil ?? new Date().getFullYear()}`)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* İşlem Yapan - gizli */}
        <input name="islem_yapan" type="hidden" value={izin.islem_yapan ?? ''} />

        {/* Satır 1: Personel, Vekalet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
            <div className="flex gap-2">
              <input readOnly value={izin.sicil_no}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600" />
              <input readOnly value={adSoyad ?? ''}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vekalet Eden</label>
            <input name="vekalet" type="text" defaultValue={izin.vekalet ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Ad Soyad veya Sicil No" />
          </div>
        </div>

        {/* Satır 2: İzin türü, Ayrılış, Başlama, Gün hesabı */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              İzin Türü <span className="text-red-500">*</span>
            </label>
            <select name="tur" required value={tur} onChange={e => setTur(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
              <option value="">— Seçin —</option>
              {izinTurleri.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Ayrılış <span className="text-red-500">*</span>
            </label>
            <input name="ayrilis" type="date" required value={ayrilis}
              onChange={e => setAyrilis(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            <p className="text-xs text-slate-400 mt-0.5">İznin ilk günü</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Başlama <span className="text-red-500">*</span>
            </label>
            <input name="baslama" type="date" required value={baslama}
              onChange={e => setBaslama(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            <p className="text-xs text-slate-400 mt-0.5">İşe dönüş günü</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Gün</label>
            <input name="gun" type="number" min={1} readOnly
              value={gun || ''}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-semibold text-center text-slate-700" />
            <p className="text-xs text-slate-400 mt-0.5">Otomatik hesaplandı</p>
          </div>
        </div>

        {/* Satır 3: Durum */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Durum</label>
          <select name="durum" defaultValue={izin.durum}
            className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
            {DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Satır 4: Bilgi */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Bilgi</label>
          <textarea name="bilgi" rows={3} value={bilgi} readOnly
            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm resize-none text-slate-700"
            placeholder="Yıllık İzin için: Tatil bilgilendirme metni (örn. Ramazan Bayramı yıllık izninizden sayılmayacaktır.)" />
          <p className="text-xs text-slate-400 mt-0.5">Yıllık İzin türünde tatil ve personel için tanımlı ifadeler otomatik gösterilir.</p>
        </div>

        {/* Satır 5: Açıklama */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama</label>
          <textarea name="aciklama" rows={3} defaultValue={izin.aciklama ?? ''}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Gerekirse not ekleyin" />
        </div>

        {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

        <div className="flex justify-end gap-3 pt-4">
          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 bg-blue-700 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button type="button" onClick={() => router.push(`/izin?yil=${izin.yil ?? new Date().getFullYear()}`)} disabled={isPending}
            className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            İptal
          </button>
        </div>
      </form>
    </div>
  )
}
