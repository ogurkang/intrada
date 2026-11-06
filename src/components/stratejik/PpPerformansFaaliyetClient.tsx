'use client'

import { useState, useTransition } from 'react'
import { ppPerformansFaaliyetFormKaydet } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/iliski-actions'
import { PP_BIRIMLER, ppFaaliyetKodu, ppGostergeKodu, ppParaOku, ppParaYaz } from '@/lib/pp-iliski'
import { CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'

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

const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
const YIL_ANAHTAR = ['t2', 't1plan', 't1son', 'thedef', 't1tahmin', 't2tahmin'] as const

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

function anahtar() {
  return `${Date.now()}-${Math.random()}`
}

function bosGosterge(): GostergeTaslak {
  return { anahtar: anahtar(), ad: '', birim: 'Adet', aciklama: '', hesaplama: '', t2: '', t1plan: '', t1son: '', thedef: '', t1tahmin: '', t2tahmin: '' }
}

export type PpPerformansFormBaslangic = {
  faaliyetId?: number
  ad: string
  aciklama: string
  sira: number
  gostergeler: GostergeTaslak[]
}

export default function PpPerformansFaaliyetClient({
  yil,
  bagId,
  phKod,
  baslangic,
}: {
  yil: number
  bagId: number
  phKod: string
  baslangic: PpPerformansFormBaslangic
}) {
  const [ad, setAd] = useState(baslangic.ad)
  const [aciklama, setAciklama] = useState(baslangic.aciklama)
  const [gostergeler, setGostergeler] = useState<GostergeTaslak[]>(baslangic.gostergeler)
  const yilAlan = yilBasliklari(yil)
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()
  const fKod = ppFaaliyetKodu(phKod, baslangic.sira)

  function guncelle(anahtarGosterge: string, fn: (g: GostergeTaslak) => GostergeTaslak) {
    setGostergeler(liste => liste.map(g => g.anahtar === anahtarGosterge ? fn(g) : g))
  }

  function gostergeSil(g: GostergeTaslak) {
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return
    setGostergeler(liste => liste.filter(x => x.anahtar !== g.anahtar))
  }

  function kaydet() {
    if (!ad.trim()) {
      setHata('Performans faaliyeti adı girin.')
      return
    }
    for (const g of gostergeler) {
      const alanlar = [g.t2, g.t1plan, g.t1son, g.thedef, g.t1tahmin, g.t2tahmin]
      if (alanlar.some(a => a.trim() && ppParaOku(a) == null)) {
        setHata('Gösterge hedeflerinde nokta binlik, virgül küsür olmalıdır.')
        return
      }
    }
    setHata(null)
    start(async () => {
      const sonuc = await ppPerformansFaaliyetFormKaydet({
        id: baslangic.faaliyetId,
        bagId,
        ad,
        aciklama,
        gostergeler: gostergeler.map(g => ({
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
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        <p className="pb-2 font-mono text-sm text-slate-700">{fKod}</p>
        <label className="block flex-1 text-sm text-slate-700">Performans Faaliyeti
          <input value={ad} onChange={e => setAd(e.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-sm text-slate-700">Faaliyet Açıklaması
        <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} className={`${input} min-h-24`} />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setGostergeler(liste => [...liste, bosGosterge()])} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">Gösterge Ekle</button>
        <button type="button" disabled={gostergeler.length === 0} onClick={() => setGostergeler(liste => liste.slice(0, -1))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Kaldır</button>
      </div>
      {gostergeler.map((g, gi) => (
        <div key={g.anahtar} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm text-slate-800">{ppGostergeKodu(fKod, gi + 1)}</p>
            <CopKutusuSilDugmesi onClick={() => gostergeSil(g)} />
          </div>
          <label className="block text-sm text-slate-700">Gösterge adı
            <input value={g.ad} onChange={e => guncelle(g.anahtar, x => ({ ...x, ad: e.target.value }))} className={input} />
          </label>
          <div className="overflow-x-auto">
            <div className="grid min-w-[1080px] grid-cols-7 gap-2">
              <label className="text-xs text-slate-700">Ölçü birimi
                <select value={g.birim} onChange={e => guncelle(g.anahtar, x => ({ ...x, birim: e.target.value }))} className={input}>
                  {PP_BIRIMLER.map(b => <option key={b}>{b}</option>)}
                </select>
              </label>
              {yilAlan.map(([alan, etiket]) => (
                <label key={alan} className="text-xs text-slate-700">{etiket}
                  <input
                    value={g[alan]}
                    inputMode="decimal"
                    onChange={e => guncelle(g.anahtar, x => ({ ...x, [alan]: e.target.value }))}
                    onBlur={() => {
                      const n = ppParaOku(g[alan])
                      const yaz = n == null && g[alan].trim() ? g[alan] : ppParaYaz(n)
                      guncelle(g.anahtar, x => ({ ...x, [alan]: yaz }))
                    }}
                    className={input}
                  />
                </label>
              ))}
            </div>
          </div>
          <label className="block text-sm text-slate-700">Göstergeye İlişkin Açıklama
            <textarea value={g.aciklama} onChange={e => guncelle(g.anahtar, x => ({ ...x, aciklama: e.target.value }))} className={`${input} min-h-20`} />
          </label>
          <label className="block text-sm text-slate-700">Hesaplama Yöntemi
            <textarea value={g.hesaplama} onChange={e => guncelle(g.anahtar, x => ({ ...x, hesaplama: e.target.value }))} className={`${input} min-h-20`} />
          </label>
        </div>
      ))}
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <div className="flex justify-end">
        <button type="button" onClick={kaydet} disabled={bekliyor} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
