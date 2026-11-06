'use client'

import { useMemo, useState, useTransition } from 'react'
import { ppIliskiKaydet } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/iliski-actions'
import { PP_BIRIMLER, ppFaaliyetKodu, ppGostergeKodu, ppParaOku, ppParaYaz, type PpPhSecenek } from '@/lib/pp-iliski'

type GostergeTaslak = {
  anahtar: string
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
}

type FaaliyetTaslak = { anahtar: string; ad: string; gostergeler: GostergeTaslak[] }

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800'

function anahtar(): string {
  return `${Date.now()}-${Math.random()}`
}

function bosGosterge(): GostergeTaslak {
  return { anahtar: anahtar(), ad: '', birim: 'Adet', aciklama: '', hesaplama: '', t2: '', t1plan: '', t1son: '', thedef: '', t1tahmin: '', t2tahmin: '' }
}

function bosFaaliyet(): FaaliyetTaslak {
  return { anahtar: anahtar(), ad: '', gostergeler: [] }
}

const YIL_ALAN = [
  ['t2', 't−2 Gerçekleşme'],
  ['t1plan', 't−1 Planlanan'],
  ['t1son', 't−1 Yıl Sonu Gerçekleşme Tahmini'],
  ['thedef', 't Hedef'],
  ['t1tahmin', 't+1 Tahmin'],
  ['t2tahmin', 't+2 Tahmin'],
] as const

export type PpIliskiBaslangic = {
  altProgramId?: number
  bagId?: number
  yalnizHedef?: boolean
  sira: string
  kodu: string
  ad: string
  altHedefId: string
  gerekce: string
  faaliyetler: FaaliyetTaslak[]
}

export default function PpAltProgramKayitClient({
  yil,
  programId,
  programAdi,
  secenekler,
  baslangic,
}: {
  yil: number
  programId: number
  programAdi: string
  secenekler: PpPhSecenek[]
  baslangic?: PpIliskiBaslangic
}) {
  const [sira, setSira] = useState(baslangic?.sira ?? '')
  const [kodu, setKodu] = useState(baslangic?.kodu ?? '')
  const [ad, setAd] = useState(baslangic?.ad ?? '')
  const [altHedefId, setAltHedefId] = useState(baslangic?.altHedefId ?? '')
  const [gerekce, setGerekce] = useState(baslangic?.gerekce ?? '')
  const [faaliyetler, setFaaliyetler] = useState<FaaliyetTaslak[]>(baslangic?.faaliyetler?.length ? baslangic.faaliyetler : [bosFaaliyet()])
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()
  const secili = useMemo(() => secenekler.find(s => String(s.id) === altHedefId) ?? null, [secenekler, altHedefId])

  function guncelleFaaliyet(anahtarFaaliyet: string, fn: (f: FaaliyetTaslak) => FaaliyetTaslak) {
    setFaaliyetler(liste => liste.map(f => f.anahtar === anahtarFaaliyet ? fn(f) : f))
  }

  function paraAlan(deger: string, yaz: (v: string) => void) {
    return (
      <input
        value={deger}
        inputMode="decimal"
        onChange={e => yaz(e.target.value)}
        onBlur={() => {
          const n = ppParaOku(deger)
          yaz(n == null && deger.trim() ? deger : ppParaYaz(n))
        }}
        className={input}
      />
    )
  }

  function kaydet() {
    const siraNo = sira.trim() ? Number(sira) : null
    if (sira.trim() && !Number.isFinite(siraNo)) {
      setHata('Sıra no sayı olmalı.')
      return
    }
    for (const f of faaliyetler) {
      for (const g of f.gostergeler) {
        const alanlar = [g.t2, g.t1plan, g.t1son, g.thedef, g.t1tahmin, g.t2tahmin]
        if (alanlar.some(a => a.trim() && ppParaOku(a) == null)) {
          setHata('Gösterge hedeflerinde nokta binlik, virgül küsür olmalıdır.')
          return
        }
      }
    }
    setHata(null)
    start(async () => {
      const sonuc = await ppIliskiKaydet({
        altProgramId: baslangic?.altProgramId,
        bagId: baslangic?.bagId,
        yalnizHedef: baslangic?.yalnizHedef,
        programId,
        yil,
        sira: siraNo,
        kodu,
        ad,
        altHedefId: Number(altHedefId),
        gerekce,
        faaliyetler: faaliyetler.filter(f => f.ad.trim() || f.gostergeler.length).map(f => ({
          ad: f.ad,
          gostergeler: f.gostergeler.map(g => ({
            ad: g.ad,
            birim: g.birim,
            aciklama: g.aciklama,
            hesaplama: g.hesaplama,
            t2: ppParaOku(g.t2),
            t1plan: ppParaOku(g.t1plan),
            t1son: ppParaOku(g.t1son),
            thedef: ppParaOku(g.thedef),
            t1tahmin: ppParaOku(g.t1tahmin),
            t2tahmin: ppParaOku(g.t2tahmin),
          })),
        })),
      })
      if (sonuc.hata) {
        setHata(sonuc.hata)
        return
      }
      try { window.opener?.location.reload() } catch { /* sekme açan sayfa kapalı olabilir */ }
      window.close()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{programAdi}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {baslangic?.yalnizHedef
            ? 'Tek performans hedefi. Göstergeler bu hedefe yazılır. Kaydet sekmeyi kapatır.'
            : `${yil} yılı alt programı. Kaydet, sekmeyi kapatır ve ilişkilendirmeyi tamamlar.`}
        </p>
      </div>
      {baslangic?.yalnizHedef ? null : <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm text-slate-700">Sıra no
          <input value={sira} onChange={e => setSira(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-sm text-slate-700">Kodu
          <input value={kodu} onChange={e => setKodu(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-sm text-slate-700 sm:col-span-1">Alt program adı
          <input value={ad} onChange={e => setAd(e.target.value)} className={`${input} mt-1`} />
        </label>
      </div>}
      <label className="block text-sm text-slate-700">Alt program hedefi
        <select value={altHedefId} onChange={e => setAltHedefId(e.target.value)} className={`${input} mt-1`}>
          <option value="">Performans hedefi seçin</option>
          {secenekler.map(s => <option key={s.id} value={s.id}>{s.etiket}</option>)}
        </select>
      </label>
      {secili ? (
        <>
          <label className="block text-sm text-slate-700">Gerekçe ve Açıklama
            <textarea value={gerekce} onChange={e => setGerekce(e.target.value)} className={`${input} mt-1 min-h-40`} />
          </label>
          {faaliyetler.map((f, fi) => {
            const fKod = ppFaaliyetKodu(secili.kod, fi + 1)
            return (
              <section key={f.anahtar} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-end justify-between gap-3">
                  <label className="block flex-1 text-sm text-slate-700">Performans Faaliyeti
                    <input value={f.ad} onChange={e => guncelleFaaliyet(f.anahtar, x => ({ ...x, ad: e.target.value }))} className={`${input} mt-1`} />
                  </label>
                  <p className="pb-2 text-sm text-slate-600">Sıra {fi + 1} · Kod {fKod}</p>
                </div>
                {f.gostergeler.map((g, gi) => (
                  <div key={g.anahtar} className="space-y-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-800">Gösterge {gi + 1} · Kod {ppGostergeKodu(fKod, gi + 1)}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-slate-700">Gösterge adı
                        <input value={g.ad} onChange={e => guncelleFaaliyet(f.anahtar, x => ({ ...x, gostergeler: x.gostergeler.map(k => k.anahtar === g.anahtar ? { ...k, ad: e.target.value } : k) }))} className={`${input} mt-1`} />
                      </label>
                      <label className="text-sm text-slate-700">Ölçü birimi
                        <select value={g.birim} onChange={e => guncelleFaaliyet(f.anahtar, x => ({ ...x, gostergeler: x.gostergeler.map(k => k.anahtar === g.anahtar ? { ...k, birim: e.target.value } : k) }))} className={`${input} mt-1`}>
                          {PP_BIRIMLER.map(b => <option key={b}>{b}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block text-sm text-slate-700">Göstergeye İlişkin Açıklama
                      <textarea value={g.aciklama} onChange={e => guncelleFaaliyet(f.anahtar, x => ({ ...x, gostergeler: x.gostergeler.map(k => k.anahtar === g.anahtar ? { ...k, aciklama: e.target.value } : k) }))} className={`${input} mt-1 min-h-20`} />
                    </label>
                    <label className="block text-sm text-slate-700">Hesaplama Yöntemi
                      <textarea value={g.hesaplama} onChange={e => guncelleFaaliyet(f.anahtar, x => ({ ...x, gostergeler: x.gostergeler.map(k => k.anahtar === g.anahtar ? { ...k, hesaplama: e.target.value } : k) }))} className={`${input} mt-1 min-h-20`} />
                    </label>
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-800">Gösterge Hedefleri · t = {yil}</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {YIL_ALAN.map(([alan, baslik]) => (
                          <label key={alan} className="text-sm text-slate-700">{baslik}
                            {paraAlan(g[alan], v => guncelleFaaliyet(f.anahtar, x => ({ ...x, gostergeler: x.gostergeler.map(k => k.anahtar === g.anahtar ? { ...k, [alan]: v } : k) })))}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => guncelleFaaliyet(f.anahtar, x => ({ ...x, gostergeler: [...x.gostergeler, bosGosterge()] }))} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
                    Gösterge Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => guncelleFaaliyet(f.anahtar, x => ({ ...x, gostergeler: x.gostergeler.slice(0, -1) }))}
                    disabled={f.gostergeler.length === 0}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 disabled:opacity-40"
                  >
                    Kaldır
                  </button>
                </div>
              </section>
            )
          })}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFaaliyetler(liste => [...liste, bosFaaliyet()])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800">
              Faaliyet Ekle
            </button>
            <button
              type="button"
              onClick={() => setFaaliyetler(liste => liste.length > 1 ? liste.slice(0, -1) : liste)}
              disabled={faaliyetler.length < 2}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 disabled:opacity-40"
            >
              Kaldır
            </button>
          </div>
        </>
      ) : null}
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <button type="button" onClick={kaydet} disabled={bekliyor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </div>
  )
}
