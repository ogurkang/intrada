'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ppPfOdenekKaydet, type PpOdenekKalem } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/pf/odenek-actions'
import { ppParaOku, ppParaYaz } from '@/lib/pp-iliski'

export type PpOdenekKodSatir = PpOdenekKalem & { ekonomik_kod: string; hesap_adi: string }

const SUTUN = [
  ['t1Butce', 'bg-slate-500 text-white', -1, 'Bütçe'],
  ['t1Haziran', 'bg-slate-400 text-slate-900', -1, 'Haziran Sonu Harcama'],
  ['t1YilSonu', 'bg-slate-200 text-slate-800', -1, 'Yıl Sonu Tahmini Harcama'],
  ['tButce', 'bg-emerald-100 text-slate-800', 0, 'Bütçe'],
  ['t1Tahmin', 'bg-orange-100 text-slate-800', 1, 'Tahmin'],
  ['t2Tahmin', 'bg-sky-100 text-slate-800', 2, 'Tahmin'],
] as const

type Alan = typeof SUTUN[number][0]

export default function PpPfOdenekClient({
  yil,
  faaliyetId,
  baslik,
  kodlar,
}: {
  yil: number
  faaliyetId: number
  baslik: string
  kodlar: PpOdenekKodSatir[]
}) {
  const router = useRouter()
  const [ara, setAra] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()
  const [degerler, setDegerler] = useState<Record<number, Record<Alan, string>>>(() => {
    const m: Record<number, Record<Alan, string>> = {}
    for (const k of kodlar) {
      m[k.butce_kodu_id] = {
        t1Butce: ppParaYaz(k.t1Butce),
        t1Haziran: ppParaYaz(k.t1Haziran),
        t1YilSonu: ppParaYaz(k.t1YilSonu),
        tButce: ppParaYaz(k.tButce),
        t1Tahmin: ppParaYaz(k.t1Tahmin),
        t2Tahmin: ppParaYaz(k.t2Tahmin),
      }
    }
    return m
  })

  const gorunen = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    const liste = q ? kodlar.filter(k => `${k.ekonomik_kod} ${k.hesap_adi}`.toLocaleLowerCase('tr-TR').includes(q)) : kodlar
    return [...liste].sort((a, b) => a.ekonomik_kod.localeCompare(b.ekonomik_kod, 'tr'))
  }, [ara, kodlar])

  function kaydet() {
    for (const k of kodlar) {
      for (const [alan] of SUTUN) {
        const yazi = degerler[k.butce_kodu_id]?.[alan] ?? ''
        if (yazi.trim() && ppParaOku(yazi) == null) {
          setHata('Tutarlarda nokta binlik, virgül küsür olmalıdır.')
          return
        }
      }
    }
    setHata(null)
    const kalemler: PpOdenekKalem[] = kodlar.map(k => ({
      butce_kodu_id: k.butce_kodu_id,
      t1Butce: ppParaOku(degerler[k.butce_kodu_id]?.t1Butce ?? ''),
      t1Haziran: ppParaOku(degerler[k.butce_kodu_id]?.t1Haziran ?? ''),
      t1YilSonu: ppParaOku(degerler[k.butce_kodu_id]?.t1YilSonu ?? ''),
      tButce: ppParaOku(degerler[k.butce_kodu_id]?.tButce ?? ''),
      t1Tahmin: ppParaOku(degerler[k.butce_kodu_id]?.t1Tahmin ?? ''),
      t2Tahmin: ppParaOku(degerler[k.butce_kodu_id]?.t2Tahmin ?? ''),
    }))
    start(async () => {
      const s = await ppPfOdenekKaydet(faaliyetId, kalemler)
      if (s.hata) setHata(s.hata)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <button type="button" onClick={kaydet} disabled={bekliyor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
      <p className="text-sm text-slate-600">4. düzey ekonomik kodlara ödenek teklifi. t yılı {yil}.</p>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Kod veya hesap adı ara" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-left">Ekonomik kod</th>
              <th className="bg-slate-100 px-3 py-2 text-left">Hesap adı</th>
              {SUTUN.map(([alan, renk, kayma, ad]) => (
                <th key={alan} className={`px-2 py-2 text-right text-xs font-medium ${renk}`}>{yil + kayma} {ad}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gorunen.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Kod bulunamadı.</td></tr>
            ) : gorunen.map(k => (
              <tr key={k.butce_kodu_id}>
                <td className="sticky left-0 bg-white px-3 py-2 font-mono text-xs">{k.ekonomik_kod}</td>
                <td className="px-3 py-2">{k.hesap_adi}</td>
                {SUTUN.map(([alan, renk]) => (
                  <td key={alan} className={`px-1 py-1 ${renk}`}>
                    <input
                      value={degerler[k.butce_kodu_id]?.[alan] ?? ''}
                      inputMode="decimal"
                      onChange={e => setDegerler(prev => ({ ...prev, [k.butce_kodu_id]: { ...prev[k.butce_kodu_id], [alan]: e.target.value } }))}
                      onBlur={() => {
                        const yazi = degerler[k.butce_kodu_id]?.[alan] ?? ''
                        const n = ppParaOku(yazi)
                        const yaz = n == null && yazi.trim() ? yazi : ppParaYaz(n)
                        setDegerler(prev => ({ ...prev, [k.butce_kodu_id]: { ...prev[k.butce_kodu_id], [alan]: yaz } }))
                      }}
                      className="w-full rounded border border-white/60 bg-white/80 px-1 py-1 text-right text-xs text-slate-800"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
