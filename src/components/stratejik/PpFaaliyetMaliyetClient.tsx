'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ppFaaliyetMaliyetKaydet } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/[alt_program_id]/actions'

export type PpMaliyetKod = {
  id: number
  ekonomik_kod: string
  hesap_adi: string
  tutar: number | null
}

function para(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function metin(v: number | null): string {
  if (v == null || Number.isNaN(v)) return ''
  return para(v)
}

function sayi(v: string): number | null {
  const t = v.trim().replace(/\./g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export default function PpFaaliyetMaliyetClient({
  yil,
  altProgramId,
  programId,
  faaliyetId,
  kodlar,
  ozel = false,
}: {
  yil: number
  altProgramId: number
  programId: number
  faaliyetId: number
  kodlar: PpMaliyetKod[]
  ozel?: boolean
}) {
  const router = useRouter()
  const [ara, setAra] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [tamam, setTamam] = useState(false)
  const [bekliyor, start] = useTransition()
  const [degerler, setDegerler] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {}
    for (const k of kodlar) m[k.id] = metin(k.tutar)
    return m
  })

  const gorunen = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    const liste = q
      ? kodlar.filter(k => `${k.ekonomik_kod} ${k.hesap_adi}`.toLocaleLowerCase('tr-TR').includes(q))
      : kodlar
    return [...liste].sort((a, b) => {
      const doluA = a.tutar != null ? 0 : 1
      const doluB = b.tutar != null ? 0 : 1
      if (doluA !== doluB) return doluA - doluB
      return a.ekonomik_kod.localeCompare(b.ekonomik_kod, 'tr')
    })
  }, [ara, kodlar])

  const toplam = useMemo(
    () => kodlar.reduce((a, k) => a + (sayi(degerler[k.id] ?? '') ?? 0), 0),
    [kodlar, degerler],
  )

  function kaydet() {
    setHata(null)
    setTamam(false)
    const onceki = new Map(kodlar.map(k => [k.id, k.tutar]))
    const kalemler = kodlar.flatMap(k => {
      const tutar = sayi(degerler[k.id] ?? '')
      if (tutar == null && onceki.get(k.id) == null) return []
      return [{ butce_kodu_id: k.id, tutar }]
    })
    start(async () => {
      const s = await ppFaaliyetMaliyetKaydet(altProgramId, yil, programId, faaliyetId, kalemler, ozel)
      if (s.hata) setHata(s.hata)
      else {
        setTamam(true)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Toplam <span className="font-semibold tabular-nums text-slate-800">{para(toplam)}</span>
        </p>
        <button type="button" disabled={bekliyor} onClick={kaydet} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50">
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
      {hata && <p className="text-sm text-red-700">{hata}</p>}
      {tamam && <p className="text-sm text-emerald-700">Kaydedildi. Faaliyet satırındaki toplam güncellendi.</p>}
      <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Kod veya hesap adı ara" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[68vh]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-left w-40">Ekonomik kod</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-left">Hesap adı</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-right w-44">{yil} ödenek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gorunen.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-500">Kod bulunamadı.</td></tr>
              ) : gorunen.map(k => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{k.ekonomik_kod}</td>
                  <td className="px-3 py-2">{k.hesap_adi}</td>
                  <td className="px-3 py-2">
                    <input
                      value={degerler[k.id] ?? ''}
                      onChange={e => {
                        setTamam(false)
                        setDegerler(prev => ({ ...prev, [k.id]: e.target.value }))
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm"
                      placeholder="0,00"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
