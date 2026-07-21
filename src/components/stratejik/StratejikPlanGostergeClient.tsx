'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'

const BIRIMLER = ['Yüzde', 'Adet', 'Kişi', 'Gün', 'Hektar', 'Ton', 'Metre', 'Metrekare', 'Saat'] as const

export interface SpGosterge {
  id: number
  sira_no: number | null
  gosterge_adi: string
  birim: string
  yil_1: number | null
  yil_2: number | null
  yil_3: number | null
  yil_4: number | null
  yil_5: number | null
}

interface TopluSatir {
  rowId: string
  sira_no: string
  gosterge_adi: string
  birim: string
  yil_1: string
  yil_2: string
  yil_3: string
  yil_4: string
  yil_5: string
}

interface Props {
  donemId: number
  faaliyetId: number
  faaliyetAdi: string
  yillar: number[]
  gostergeListesi: SpGosterge[]
  onEkle: (faaliyetId: number, donemId: number, fd: FormData) => Promise<{ hata?: string }>
  onTopluEkle: (
    faaliyetId: number,
    donemId: number,
    satirlar: {
      sira_no: number | null
      gosterge_adi: string
      birim: string
      yil_1: number | null
      yil_2: number | null
      yil_3: number | null
      yil_4: number | null
      yil_5: number | null
    }[],
  ) => Promise<{ hata?: string; kaydedilen?: number }>
  onGuncelle: (id: number, donemId: number, fd: FormData) => Promise<{ hata?: string }>
}

function toNum(v: string): number | null {
  const s = v.trim()
  if (!s) return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function newTopluSatir(): TopluSatir {
  return {
    rowId: `${Date.now()}-${Math.random()}`,
    sira_no: '',
    gosterge_adi: '',
    birim: '',
    yil_1: '',
    yil_2: '',
    yil_3: '',
    yil_4: '',
    yil_5: '',
  }
}

export default function StratejikPlanGostergeClient({
  donemId,
  faaliyetId,
  faaliyetAdi,
  yillar,
  gostergeListesi,
  onEkle,
  onTopluEkle,
  onGuncelle,
}: Props) {
  const router = useRouter()
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<SpGosterge | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [topluHata, setTopluHata] = useState<string | null>(null)
  const [topluMesaj, setTopluMesaj] = useState<string | null>(null)
  const [topluSatirlar, setTopluSatirlar] = useState<TopluSatir[]>([newTopluSatir()])
  const [isPending, startTransition] = useTransition()
  const [mod, setMod] = useState<'tekil' | 'toplu'>('tekil')

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const ok =
        typeof e.data === 'object' &&
        e.data != null &&
        (e.data as { source?: string; type?: string }).source === 'intrada-stratejik-gosterge' &&
        (e.data as { type?: string }).type === 'refresh'
      if (ok) router.refresh()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [router])

  function yeniAc() {
    setSecili(null)
    setHata(null)
    setMod('tekil')
    setFormAcik(true)
  }

  function duzenleAc(g: SpGosterge) {
    setSecili(g)
    setHata(null)
    setMod('tekil')
    setFormAcik(true)
  }

  function kayitSonrasiKapatmayiDene() {
    if (typeof window !== 'undefined' && window.opener) {
      window.close()
      return true
    }
    return false
  }

  function kaydet(fd: FormData) {
    setHata(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, donemId, fd) : await onEkle(faaliyetId, donemId, fd)
      if (res.hata) setHata(res.hata)
      else {
        setFormAcik(false)
        setSecili(null)
        if (!kayitSonrasiKapatmayiDene()) router.refresh()
      }
    })
  }

  function topluKaydet() {
    setTopluHata(null)
    setTopluMesaj(null)
    const payload = topluSatirlar.map(s => ({
      sira_no: s.sira_no.trim() ? Number.parseInt(s.sira_no, 10) : null,
      gosterge_adi: s.gosterge_adi.trim(),
      birim: s.birim.trim(),
      yil_1: toNum(s.yil_1),
      yil_2: toNum(s.yil_2),
      yil_3: toNum(s.yil_3),
      yil_4: toNum(s.yil_4),
      yil_5: toNum(s.yil_5),
    }))
    startTransition(async () => {
      const res = await onTopluEkle(faaliyetId, donemId, payload)
      if (res.hata) setTopluHata(res.hata)
      else {
        setTopluMesaj(`${res.kaydedilen ?? 0} gösterge eklendi.`)
        setTopluSatirlar([newTopluSatir()])
        if (!kayitSonrasiKapatmayiDene()) router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{faaliyetAdi}</h1>
          <p className="text-sm text-slate-500 mt-1">Bu faaliyete bağlı göstergeleri yönetebilirsiniz.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={yeniAc} className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Gösterge Ekle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1280px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-center w-16">Sıra</th>
                <th className="px-3 py-3 text-left">Gösterge İsmi</th>
                <th className="px-3 py-3 text-left w-28">Birim</th>
                {yillar.map(y => (
                  <th key={y} className="px-3 py-3 text-center w-24">{y}</th>
                ))}
                <th className="px-3 py-3 text-center w-24">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gostergeListesi.length === 0 ? (
                <tr><td colSpan={3 + yillar.length + 1} className="px-4 py-12 text-center text-slate-500">Bu faaliyete bağlı gösterge bulunamadı.</td></tr>
              ) : (
                gostergeListesi.map((g, i) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-center text-slate-600">{g.sira_no ?? i + 1}</td>
                    <td className="px-3 py-2.5 text-slate-800 font-medium">{g.gosterge_adi}</td>
                    <td className="px-3 py-2.5 text-slate-700">{g.birim}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{g.yil_1 ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{g.yil_2 ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{g.yil_3 ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{g.yil_4 ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{g.yil_5 ?? '-'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center">
                        <button onClick={() => duzenleAc(g)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Düzenle">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formAcik} onClose={() => setFormAcik(false)} title={secili ? 'Gösterge Düzenle' : 'Gösterge Ekle'} size="lg">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMod('tekil')}
            className={`px-3 py-1.5 text-xs rounded-lg border ${mod === 'tekil' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'}`}
          >
            Tekil Ekleme
          </button>
          {!secili && (
            <button
              type="button"
              onClick={() => setMod('toplu')}
              className={`px-3 py-1.5 text-xs rounded-lg border ${mod === 'toplu' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'}`}
            >
              Toplu Ekleme
            </button>
          )}
        </div>
        {mod === 'tekil' ? (
        <form onSubmit={async e => { e.preventDefault(); await kaydet(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
              <input name="sira_no" type="number" min={1} defaultValue={secili?.sira_no ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gösterge İsmi *</label>
              <input name="gosterge_adi" required defaultValue={secili?.gosterge_adi ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Birim *</label>
            <select name="birim" required defaultValue={secili?.birim ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Seçiniz</option>
              {BIRIMLER.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {yillar.map((y, i) => (
              <div key={y}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{y}</label>
                <input name={`yil_${i + 1}`} type="number" step="0.01" defaultValue={secili?.[`yil_${i + 1}` as keyof SpGosterge] as number | null ?? ''} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
              </div>
            ))}
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">İptal</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-2 py-2 w-14">Sıra</th>
                    <th className="px-2 py-2 text-left">Gösterge İsmi</th>
                    <th className="px-2 py-2 w-28">Birim</th>
                    {yillar.map(y => <th key={y} className="px-2 py-2 w-20">{y}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topluSatirlar.map(row => (
                    <tr key={row.rowId}>
                      <td className="px-2 py-1.5"><input value={row.sira_no} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, sira_no: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded" /></td>
                      <td className="px-2 py-1.5"><input value={row.gosterge_adi} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, gosterge_adi: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded" /></td>
                      <td className="px-2 py-1.5">
                        <select value={row.birim} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, birim: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded bg-white">
                          <option value="">Seçiniz</option>
                          {BIRIMLER.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><input value={row.yil_1} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, yil_1: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded" /></td>
                      <td className="px-2 py-1.5"><input value={row.yil_2} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, yil_2: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded" /></td>
                      <td className="px-2 py-1.5"><input value={row.yil_3} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, yil_3: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded" /></td>
                      <td className="px-2 py-1.5"><input value={row.yil_4} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, yil_4: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded" /></td>
                      <td className="px-2 py-1.5"><input value={row.yil_5} onChange={e => setTopluSatirlar(prev => prev.map(r => r.rowId === row.rowId ? { ...r, yil_5: e.target.value } : r))} className="w-full px-1 py-1 border border-slate-300 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setTopluSatirlar(prev => [...prev, newTopluSatir()])} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">
                Satır Ekle
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Kapat</button>
                <button type="button" onClick={topluKaydet} disabled={isPending} className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50">
                  {isPending ? 'Kaydediliyor…' : 'Toplu Kaydet'}
                </button>
              </div>
            </div>
            {topluHata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{topluHata}</p>}
            {topluMesaj && <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{topluMesaj}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}

