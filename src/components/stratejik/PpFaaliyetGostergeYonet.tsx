'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ppGostergeKaydet, ppGostergeSil } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/[alt_program_id]/actions'

const BIRIMLER = ['Yüzde', 'Adet', 'Kişi', 'Gün', 'Hektar', 'Ton', 'Metre', 'Metrekare', 'Saat']

export type PpYilSutun = { yil: number; indeks: number; giris: boolean }

export type PpGostergeKayit = {
  id: number
  sira: number | null
  ad: string
  birim: string
  degerler: (number | null)[]
}

export default function PpFaaliyetGostergeYonet({
  faaliyetId,
  kayitlar,
  yillar,
  yil,
  programId,
  altProgramId,
}: {
  faaliyetId: number
  kayitlar: PpGostergeKayit[]
  yillar: PpYilSutun[]
  yil: number
  programId: number
  altProgramId: number
}) {
  const router = useRouter()
  const [acik, setAcik] = useState<PpGostergeKayit | 'yeni' | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()
  const secili = acik && acik !== 'yeni' ? acik : null
  const [ad, setAd] = useState('')
  const [birim, setBirim] = useState('Adet')
  const [sira, setSira] = useState('')
  const [deger, setDeger] = useState<Record<number, string>>({})

  function ac(kayit: PpGostergeKayit | 'yeni') {
    setHata(null)
    setAcik(kayit)
    if (kayit === 'yeni') {
      setAd('')
      setBirim('Adet')
      setSira('')
      setDeger({})
      return
    }
    setAd(kayit.ad)
    setBirim(kayit.birim)
    setSira(kayit.sira == null ? '' : String(kayit.sira))
    const ilk: Record<number, string> = {}
    for (const y of yillar) {
      const n = kayit.degerler[y.indeks]
      if (n != null) ilk[y.indeks] = String(n).replace('.', ',')
    }
    setDeger(ilk)
  }

  function sayi(v: string): number | null {
    const t = v.trim().replace(/\s/g, '').replace(',', '.')
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }

  function kaydet() {
    const siraNo = sira.trim() ? Number(sira) : null
    if (sira.trim() && !Number.isFinite(siraNo)) {
      setHata('Sıra no sayı olmalı.')
      return
    }
    const degerler = yillar.filter(y => y.giris).map(y => ({ indeks: y.indeks, deger: sayi(deger[y.indeks] ?? '') }))
    if (degerler.some(d => (deger[d.indeks] ?? '').trim() && d.deger == null)) {
      setHata('Yıl değeri sayı olmalı.')
      return
    }
    setHata(null)
    start(async () => {
      const s = await ppGostergeKaydet({
        id: secili?.id,
        faaliyetId,
        altProgramId,
        yil,
        programId,
        ad,
        birim,
        sira: siraNo,
        degerler,
      })
      if (s.hata) setHata(s.hata)
      else {
        setAcik(null)
        router.refresh()
      }
    })
  }

  function sil(id: number) {
    if (!confirm('Gösterge stratejik plandan ve performans programından kalkar. Onaylıyor musunuz?')) return
    start(async () => {
      const s = await ppGostergeSil(id, faaliyetId, altProgramId, yil, programId)
      if (s.hata) alert(s.hata)
      else router.refresh()
    })
  }

  return (
    <div className="mt-2 space-y-1">
      {kayitlar.map(g => (
        <div key={g.id} className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>{g.ad} · {g.birim}</span>
          <span className="flex shrink-0 gap-1">
            <button type="button" onClick={() => ac(g)} className="rounded px-1.5 py-0.5 text-slate-700 hover:bg-white" title="Düzenle">Düzenle</button>
            <button type="button" onClick={() => sil(g.id)} disabled={bekliyor} className="rounded px-1.5 py-0.5 text-red-700 hover:bg-white" title="Sil">Sil</button>
          </span>
        </div>
      ))}
      <button type="button" onClick={() => ac('yeni')} className="text-xs font-medium text-slate-800 underline">
        Gösterge Ekle
      </button>
      <Modal open={acik != null} onClose={() => setAcik(null)} title={secili ? 'Gösterge düzenle' : 'Gösterge ekle'} size="lg">
        <div className="space-y-3">
          <label className="block text-sm text-slate-700">
            Gösterge adı
            <input value={ad} onChange={e => setAd(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-700">
              Birim
              <select value={birim} onChange={e => setBirim(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {BIRIMLER.map(b => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Sıra no
              <input value={sira} onChange={e => setSira(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {yillar.map(y => (
              <label key={y.yil} className="block text-sm text-slate-700">
                {y.yil}
                <input
                  value={y.giris ? (deger[y.indeks] ?? '') : (secili?.degerler[y.indeks] == null ? '' : String(secili.degerler[y.indeks]))}
                  onChange={e => setDeger(d => ({ ...d, [y.indeks]: e.target.value }))}
                  disabled={!y.giris}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Değer, stratejik plan dönemindeki bu yıl ve sonraki yıllar için girilir. Önceki yıllar kapalıdır.</p>
          {hata ? <p className="text-sm text-red-700">{hata}</p> : null}
          <button type="button" onClick={kaydet} disabled={bekliyor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50">
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
