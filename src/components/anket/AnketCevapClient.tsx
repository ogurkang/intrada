'use client'

import { useState } from 'react'
import { ANKET_BASLANGIC_UYARISI, ANKET_PUAN_OLCEK, type AnketSoruTipi } from '@/lib/anket'
import { anketCevapGonder } from '@/app/anket/[kod]/actions'

export type AnketCevapSoru = {
  id: string
  sira: number
  metin: string
  tip: AnketSoruTipi
  secenekler: string[]
}

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'

export default function AnketCevapClient({
  kod,
  baslik,
  aciklama,
  sorular,
}: {
  kod: string
  baslik: string
  aciklama: string
  sorular: AnketCevapSoru[]
}) {
  const [basladi, setBasladi] = useState(false)
  const [secimler, setSecimler] = useState<Record<string, string[]>>({})
  const [puanlar, setPuanlar] = useState<Record<string, number>>({})
  const [metinler, setMetinler] = useState<Record<string, string>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [gonderiyor, setGonderiyor] = useState(false)
  const [bitti, setBitti] = useState(false)

  function tekSec(soruId: string, deger: string) {
    setSecimler(once => ({ ...once, [soruId]: [deger] }))
  }

  function cokSec(soruId: string, deger: string) {
    setSecimler(once => {
      const varOlan = once[soruId] ?? []
      const sonraki = varOlan.includes(deger) ? varOlan.filter(s => s !== deger) : [...varOlan, deger]
      return { ...once, [soruId]: sonraki }
    })
  }

  async function gonder(e: React.FormEvent) {
    e.preventDefault()
    if (gonderiyor) return
    setHata(null)
    setGonderiyor(true)
    const sonuc = await anketCevapGonder(kod, sorular.map(soru => ({
      soruId: soru.id,
      secimler: secimler[soru.id] ?? [],
      puan: puanlar[soru.id] ?? null,
      metin: metinler[soru.id] ?? '',
    })))
    setGonderiyor(false)
    if (sonuc.hata) {
      setHata(sonuc.hata)
      return
    }
    setBitti(true)
  }

  if (bitti) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Cevabınız kaydedildi</h1>
        <p className="mt-3 text-sm text-slate-600">Anket isimsizdir. Adınız ve siciliniz tutulmadı.</p>
        <a
          href={`/anket/${encodeURIComponent(kod)}/pdf`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-emerald-700 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Soruları PDF indir
        </a>
      </div>
    )
  }

  if (!basladi) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">{baslik}</h1>
        {aciklama ? <p className="mt-2 text-sm text-slate-600">{aciklama}</p> : null}
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {ANKET_BASLANGIC_UYARISI}
        </div>
        <button
          type="button"
          onClick={() => setBasladi(true)}
          className="mt-5 w-full rounded-lg bg-blue-700 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          Ankete başla
        </button>
        <a
          href={`/anket/${encodeURIComponent(kod)}/pdf`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-emerald-700 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Soruları PDF indir
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={gonder} className="mx-auto max-w-lg space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">{baslik}</h1>
        {aciklama ? <p className="mt-2 text-sm text-slate-600">{aciklama}</p> : null}
        <a
          href={`/anket/${encodeURIComponent(kod)}/pdf`}
          className="mt-4 inline-flex rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Soruları PDF indir
        </a>
      </div>
      {sorular.map(soru => (
        <section key={soru.id} className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold leading-6 text-slate-800 break-words">
            {soru.sira}. {soru.metin}
          </p>
          <div className="mt-4 space-y-2">
            {soru.tip === 'metin' ? (
              <textarea
                required
                rows={4}
                value={metinler[soru.id] ?? ''}
                onChange={e => setMetinler(once => ({ ...once, [soru.id]: e.target.value }))}
                className={inputSinif}
              />
            ) : null}
            {soru.tip === 'puan' ? (
              <div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(puan => {
                    const secili = puanlar[soru.id] === puan
                    return (
                      <label key={puan} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium ${secili ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 text-slate-800'}`}>
                        <input
                          type="radio"
                          name={`puan-${soru.id}`}
                          className="sr-only"
                          required
                          checked={secili}
                          onChange={() => setPuanlar(once => ({ ...once, [soru.id]: puan }))}
                        />
                        {puan}
                      </label>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">{ANKET_PUAN_OLCEK}</p>
              </div>
            ) : null}
            {soru.tip === 'tek_secim' || soru.tip === 'evet_hayir' ? (
              soru.secenekler.map(secenek => (
                <label key={secenek} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="radio"
                    name={`tek-${soru.id}`}
                    required
                    checked={(secimler[soru.id] ?? [])[0] === secenek}
                    onChange={() => tekSec(soru.id, secenek)}
                  />
                  {secenek}
                </label>
              ))
            ) : null}
            {soru.tip === 'coklu_secim' ? (
              soru.secenekler.map(secenek => (
                <label key={secenek} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={(secimler[soru.id] ?? []).includes(secenek)}
                    onChange={() => cokSec(soru.id, secenek)}
                  />
                  {secenek}
                </label>
              ))
            ) : null}
          </div>
        </section>
      ))}
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <button
        type="submit"
        disabled={gonderiyor}
        className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {gonderiyor ? 'Gönderiliyor…' : 'Cevapları gönder'}
      </button>
    </form>
  )
}
