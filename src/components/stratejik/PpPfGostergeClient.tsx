'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ppPfGostergeFormKaydet } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/pf/gosterge-actions'
import type { PpOdenekKalem } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/pf/odenek-actions'
import { PP_BIRIMLER, ppGostergeKodu, ppParaOku, ppParaYaz } from '@/lib/pp-iliski'

export type PpGostergeOdenekKod = PpOdenekKalem & { ekonomik_kod: string; hesap_adi: string }

export type PpPfGostergeBaslangic = {
  gostergeId?: number
  ad: string
  birim: string
  aciklama: string
  hesaplama: string
  t2: string
  t1plan: string
  t1son: string
  thedef: string
  t1tahmin: string
  t2tahmin: string
  sira: number
}

const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
const YIL_ANAHTAR = ['t2', 't1plan', 't1son', 'thedef', 't1tahmin', 't2tahmin'] as const

const SUTUN = [
  ['t1Butce', 'bg-slate-500 text-white', -1, 'Bütçe'],
  ['t1Haziran', 'bg-slate-400 text-slate-900', -1, 'Haziran Sonu Harcama'],
  ['t1YilSonu', 'bg-slate-200 text-slate-800', -1, 'Yıl Sonu Tahmini Harcama'],
  ['tButce', 'bg-emerald-100 text-slate-800', 0, 'Bütçe'],
  ['t1Tahmin', 'bg-orange-100 text-slate-800', 1, 'Tahmin'],
  ['t2Tahmin', 'bg-sky-100 text-slate-800', 2, 'Tahmin'],
] as const

type Alan = (typeof SUTUN)[number][0]

function yilBasliklari(yil: number): [typeof YIL_ANAHTAR[number], string][] {
  return [
    ['t2', `${yil - 2} Gerçekleşme`],
    ['t1plan', `${yil - 1} Planlanan`],
    ['t1son', `${yil - 1} Yıl Sonu Gerçekleşme Tahmini`],
    ['thedef', `${yil} Hedef`],
    ['t1tahmin', `${yil + 1} Tahmin`],
    ['t2tahmin', `${yil + 2} Tahmin`],
  ]
}

export default function PpPfGostergeClient({
  yil,
  faaliyetId,
  faaliyetAd,
  fKod,
  baslangic,
  kodlar,
}: {
  yil: number
  faaliyetId: number
  faaliyetAd: string
  fKod: string
  baslangic: PpPfGostergeBaslangic
  kodlar: PpGostergeOdenekKod[]
}) {
  const router = useRouter()
  const [ad, setAd] = useState(baslangic.ad)
  const [birim, setBirim] = useState(baslangic.birim || 'Adet')
  const [aciklama, setAciklama] = useState(baslangic.aciklama)
  const [hesaplama, setHesaplama] = useState(baslangic.hesaplama)
  const [hedefler, setHedefler] = useState({
    t2: baslangic.t2,
    t1plan: baslangic.t1plan,
    t1son: baslangic.t1son,
    thedef: baslangic.thedef,
    t1tahmin: baslangic.t1tahmin,
    t2tahmin: baslangic.t2tahmin,
  })
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

  const yilAlan = yilBasliklari(yil)
  const gKod = ppGostergeKodu(fKod, baslangic.sira)

  const gorunen = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    const liste = q
      ? kodlar.filter(k => `${k.ekonomik_kod} ${k.hesap_adi}`.toLocaleLowerCase('tr-TR').includes(q))
      : kodlar
    return [...liste].sort((a, b) => a.ekonomik_kod.localeCompare(b.ekonomik_kod, 'tr'))
  }, [ara, kodlar])

  function kaydet() {
    if (!ad.trim()) {
      setHata('Gösterge adı girin.')
      return
    }
    for (const alan of YIL_ANAHTAR) {
      const yazi = hedefler[alan]
      if (yazi.trim() && ppParaOku(yazi) == null) {
        setHata('Gösterge hedeflerinde nokta binlik, virgül küsür olmalıdır.')
        return
      }
    }
    for (const k of kodlar) {
      for (const [alan] of SUTUN) {
        const yazi = degerler[k.butce_kodu_id]?.[alan] ?? ''
        if (yazi.trim() && ppParaOku(yazi) == null) {
          setHata('Ödenek tutarlarında nokta binlik, virgül küsür olmalıdır.')
          return
        }
      }
    }
    setHata(null)
    const odenekler: PpOdenekKalem[] = kodlar.map(k => ({
      butce_kodu_id: k.butce_kodu_id,
      t1Butce: ppParaOku(degerler[k.butce_kodu_id]?.t1Butce ?? ''),
      t1Haziran: ppParaOku(degerler[k.butce_kodu_id]?.t1Haziran ?? ''),
      t1YilSonu: ppParaOku(degerler[k.butce_kodu_id]?.t1YilSonu ?? ''),
      tButce: ppParaOku(degerler[k.butce_kodu_id]?.tButce ?? ''),
      t1Tahmin: ppParaOku(degerler[k.butce_kodu_id]?.t1Tahmin ?? ''),
      t2Tahmin: ppParaOku(degerler[k.butce_kodu_id]?.t2Tahmin ?? ''),
    }))
    start(async () => {
      const sonuc = await ppPfGostergeFormKaydet({
        id: baslangic.gostergeId,
        faaliyetId,
        ad,
        birim,
        aciklama,
        hesaplama,
        t2: ppParaOku(hedefler.t2),
        t1plan: ppParaOku(hedefler.t1plan),
        t1son: ppParaOku(hedefler.t1son),
        thedef: ppParaOku(hedefler.thedef),
        t1tahmin: ppParaOku(hedefler.t1tahmin),
        t2tahmin: ppParaOku(hedefler.t2tahmin),
        odenekler,
      })
      if (sonuc.hata) {
        setHata(sonuc.hata)
        return
      }
      try {
        window.opener?.location.reload()
      } catch {
        /* ignore */
      }
      try {
        window.close()
      } catch {
        /* ignore */
      }
      if (!window.closed) {
        router.push(`/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gostergeler`)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-slate-500">Performans faaliyeti</p>
        <p className="text-sm font-medium text-slate-800">
          <span className="font-mono text-slate-600">{fKod}</span> · {faaliyetAd}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-end gap-3">
          <p className="pb-2 font-mono text-sm text-slate-700">{gKod}</p>
          <label className="block flex-1 text-sm text-slate-700">
            Gösterge adı
            <input value={ad} onChange={e => setAd(e.target.value)} className={input} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[1080px] grid-cols-7 gap-2">
            <label className="text-xs text-slate-700">
              Ölçü birimi
              <select value={birim} onChange={e => setBirim(e.target.value)} className={input}>
                {PP_BIRIMLER.map(b => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            {yilAlan.map(([alan, etiket]) => (
              <label key={alan} className="text-xs text-slate-700">
                {etiket}
                <input
                  value={hedefler[alan]}
                  inputMode="decimal"
                  onChange={e => setHedefler(prev => ({ ...prev, [alan]: e.target.value }))}
                  onBlur={() => {
                    const n = ppParaOku(hedefler[alan])
                    const yaz = n == null && hedefler[alan].trim() ? hedefler[alan] : ppParaYaz(n)
                    setHedefler(prev => ({ ...prev, [alan]: yaz }))
                  }}
                  className={input}
                />
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm text-slate-700">
          Göstergeye İlişkin Açıklama
          <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} className={`${input} min-h-20`} />
        </label>
        <label className="block text-sm text-slate-700">
          Hesaplama Yöntemi
          <textarea value={hesaplama} onChange={e => setHesaplama(e.target.value)} className={`${input} min-h-20`} />
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Ödenek Teklifi</h2>
          <p className="text-xs text-slate-500">4. düzey ekonomik kodlar · t yılı {yil}</p>
        </div>
        <input
          value={ara}
          onChange={e => setAra(e.target.value)}
          placeholder="Kod veya hesap adı ara"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-left">Ekonomik kod</th>
                <th className="bg-slate-100 px-3 py-2 text-left">Hesap adı</th>
                {SUTUN.map(([alan, renk, kayma, etiket]) => (
                  <th key={alan} className={`px-2 py-2 text-right text-xs font-medium ${renk}`}>
                    {yil + kayma} {etiket}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gorunen.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    Kod bulunamadı.
                  </td>
                </tr>
              ) : (
                gorunen.map(k => (
                  <tr key={k.butce_kodu_id}>
                    <td className="sticky left-0 bg-white px-3 py-2 font-mono text-xs">{k.ekonomik_kod}</td>
                    <td className="px-3 py-2">{k.hesap_adi}</td>
                    {SUTUN.map(([alan, renk]) => (
                      <td key={alan} className={`px-1 py-1 ${renk}`}>
                        <input
                          value={degerler[k.butce_kodu_id]?.[alan] ?? ''}
                          inputMode="decimal"
                          onChange={e =>
                            setDegerler(prev => ({
                              ...prev,
                              [k.butce_kodu_id]: { ...prev[k.butce_kodu_id], [alan]: e.target.value },
                            }))
                          }
                          onBlur={() => {
                            const yazi = degerler[k.butce_kodu_id]?.[alan] ?? ''
                            const n = ppParaOku(yazi)
                            const yaz = n == null && yazi.trim() ? yazi : ppParaYaz(n)
                            setDegerler(prev => ({
                              ...prev,
                              [k.butce_kodu_id]: { ...prev[k.butce_kodu_id], [alan]: yaz },
                            }))
                          }}
                          className="w-full rounded border border-white/60 bg-white/80 px-1 py-1 text-right text-xs text-slate-800"
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={kaydet}
          disabled={bekliyor}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
