'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ppAltProgramHedefEkle, ppOzelFaaliyetEkle } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/[alt_program_id]/actions'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpFaaliyetGostergeYonet, { type PpGostergeKayit, type PpYilSutun } from '@/components/stratejik/PpFaaliyetGostergeYonet'

export type PpGostergeDetay = {
  id: number
  ad: string
  birim: string
  aciklama: string
  hesaplama: string
}

export type PpFaaliyetSatir = {
  id: number
  ozel: boolean
  sira: number
  kod: string
  ad: string
  gostergeler: string[]
  gostergeKayit: PpGostergeKayit[]
  gostergeDetay: PpGostergeDetay[]
  toplam: number
  girilen: { kod: string; ad: string; tutar: number }[]
  loglar: { id: number; zaman: string; kisi: string; metin: string }[]
}

export type PpHedefKart = {
  id: number
  kodu: string
  ad: string
  mudurluk: string
  maliyetAcik: boolean
  faaliyetler: PpFaaliyetSatir[]
}

function para(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function saat(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function PpAltProgramHedefClient({
  baslik,
  baglilar,
  secenekler,
  altProgramId,
  yil,
  programId,
  yillar,
}: {
  baslik: string
  baglilar: PpHedefKart[]
  secenekler: PpHedefKart[]
  altProgramId: number
  yil: number
  programId: number
  yillar: PpYilSutun[]
}) {
  const router = useRouter()
  const [hedefAcik, setHedefAcik] = useState(false)
  const [secili, setSecili] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()
  const [faaliyetHedef, setFaaliyetHedef] = useState<PpHedefKart | null>(null)
  const [faaliyetAd, setFaaliyetAd] = useState('')
  const [faaliyetSira, setFaaliyetSira] = useState('')
  const [faaliyetHata, setFaaliyetHata] = useState<string | null>(null)
  const onizleme = useMemo(() => secenekler.find(s => String(s.id) === secili) ?? null, [secenekler, secili])

  function hedefKaydet() {
    const id = Number(secili)
    if (!Number.isFinite(id) || !secili) {
      setHata('Performans hedefi seçin.')
      return
    }
    setHata(null)
    start(async () => {
      const s = await ppAltProgramHedefEkle(altProgramId, yil, programId, id)
      if (s.hata) setHata(s.hata)
      else {
        setSecili('')
        setHedefAcik(false)
        router.refresh()
      }
    })
  }

  function faaliyetKaydet() {
    if (!faaliyetHedef) return
    const sira = faaliyetSira.trim() ? Number(faaliyetSira) : null
    if (faaliyetSira.trim() && !Number.isFinite(sira)) {
      setFaaliyetHata('Sıra no sayı olmalı.')
      return
    }
    setFaaliyetHata(null)
    start(async () => {
      const s = await ppOzelFaaliyetEkle(altProgramId, yil, programId, faaliyetHedef.id, faaliyetAd, sira)
      if (s.hata) setFaaliyetHata(s.hata)
      else {
        setFaaliyetHedef(null)
        setFaaliyetAd('')
        setFaaliyetSira('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Alt Program Hedefi</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Hedef Ekle', metin: 'Stratejik plandaki performans hedefini bu alt programa bağlar. Hedefin faaliyetleri ve göstergeleri gelir. Ayrı bir faaliyet listesi oluşturulmaz.' },
              { baslik: 'Faaliyet Ekle', metin: 'Yalnızca bu performans programı yılına özel faaliyet yazar. Stratejik plandaki faaliyet listesine girmez.' },
              { baslik: 'Saat', metin: 'Bu faaliyetin maliyet kayıt geçmişini açar. Tutarları değiştirmez.' },
              { baslik: 'Göz', metin: 'Yalnızca teklif girilmiş ödenekleri gösterir.' },
              { baslik: 'Kalem', metin: '4. düzey ekonomik kodlara bu yılın maliyetini yazar. Faaliyet satırındaki toplam bu kayıttan gelir.' },
              { baslik: 'Grafik', metin: 'Gösterge açıklaması, hesaplama yöntemi ve yıl değerlerini yeni sekmede açar. Kaydet o sekmeyi kapatır.' },
              { baslik: 'Gösterge Ekle, Düzenle, Sil', metin: 'Stratejik plandaki göstergeyi değiştirir. Yıl değeri yalnızca bu performans programı yılı ve sonrası için girilir. Silinen gösterge planda ve bu programda görünmez.' },
            ]} />
          </div>
          <p className="text-sm text-slate-500 mt-1">{baslik}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}`} className="inline-flex items-center gap-2 bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-600">
            <span aria-hidden>{'<'}</span>
            Alt programlar
          </Link>
          <button type="button" onClick={() => { setHedefAcik(true); setHata(null) }} className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700">
            Hedef Ekle
          </button>
        </div>
      </div>

      <Modal open={hedefAcik} onClose={() => setHedefAcik(false)} title="Hedef Ekle" size="xl">
        <div className="space-y-3">
          <label className="block text-sm text-slate-700">
            Performans hedefi
            <select value={secili} onChange={e => setSecili(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
              <option value="">Seçin</option>
              {secenekler.map(s => (
                <option key={s.id} value={s.id}>{s.kodu} {s.ad} — {s.mudurluk}</option>
              ))}
            </select>
          </label>
          {onizleme && <HedefGovde kart={onizleme} />}
          {hata && <p className="text-sm text-red-700">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setHedefAcik(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">İptal</button>
            <button type="button" disabled={bekliyor} onClick={hedefKaydet} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50">
              {bekliyor ? 'Kaydediliyor…' : 'Bağla'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={faaliyetHedef != null} onClose={() => setFaaliyetHedef(null)} title="Faaliyet Ekle" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{faaliyetHedef ? `${faaliyetHedef.kodu} ${faaliyetHedef.ad}` : ''} · {yil}</p>
          <label className="block text-sm text-slate-700">
            Faaliyet adı
            <input value={faaliyetAd} onChange={e => setFaaliyetAd(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg" />
          </label>
          <label className="block text-sm text-slate-700">
            Sıra no
            <input value={faaliyetSira} onChange={e => setFaaliyetSira(e.target.value)} placeholder="Boşsa sıradaki numara" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg" />
          </label>
          {faaliyetHata && <p className="text-sm text-red-700">{faaliyetHata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setFaaliyetHedef(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">İptal</button>
            <button type="button" disabled={bekliyor} onClick={faaliyetKaydet} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50">
              {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {baglilar.length === 0 ? (
        <p className="text-sm text-slate-500">Henüz alt program hedefi yok.</p>
      ) : baglilar.map(h => (
        <section key={h.id} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">{h.kodu} {h.ad}</h2>
              <p className="text-xs text-slate-500 mt-1">{h.mudurluk}</p>
            </div>
            <button type="button" onClick={() => { setFaaliyetHedef(h); setFaaliyetAd(''); setFaaliyetSira(''); setFaaliyetHata(null) }} className="shrink-0 inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-3 py-2 rounded-lg hover:bg-slate-700">
              Faaliyet Ekle
            </button>
          </div>
          <HedefGovde kart={h} yil={yil} programId={programId} altProgramId={altProgramId} yillar={yillar} maliyet />
        </section>
      ))}
    </div>
  )
}

function HedefGovde({
  kart,
  yil,
  programId,
  altProgramId,
  yillar = [],
  maliyet = false,
}: {
  kart: PpHedefKart
  yil?: number
  programId?: number
  altProgramId?: number
  yillar?: PpYilSutun[]
  maliyet?: boolean
}) {
  const [pencere, setPencere] = useState<PpFaaliyetSatir | null>(null)
  const [tur, setTur] = useState<'log' | 'goz'>('log')
  if (kart.faaliyetler.length === 0) return <p className="mt-3 text-sm text-slate-500">Bu performans hedefinde faaliyet yok.</p>
  if (!maliyet) {
    return (
      <ul className="mt-3 space-y-2">
        {kart.faaliyetler.map(f => (
          <li key={`${f.ozel}-${f.id}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
            <span className="font-mono text-xs text-slate-500">{f.kod}</span>
            <span className="mt-0.5 block font-semibold">{f.ad}</span>
            {f.gostergeler.length > 0 && <span className="block text-xs text-slate-500">{f.gostergeler.join(' · ')}</span>}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="px-3 py-2.5 text-center font-medium w-20">Sıra No</th>
            <th className="px-3 py-2.5 text-left font-medium w-28">Kod</th>
            <th className="px-3 py-2.5 text-left font-medium">Faaliyet</th>
            <th className="px-3 py-2.5 text-right font-medium w-40">Faaliyet Maliyeti</th>
            <th className="px-3 py-2.5 text-center font-medium w-40">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {kart.faaliyetler.map(f => (
            <tr key={`${f.ozel}-${f.id}`} className="bg-slate-50">
              <td className="px-3 py-3 text-center text-slate-700">{f.sira}</td>
              <td className="px-3 py-3 font-mono text-sm font-semibold text-slate-800">{f.kod}</td>
              <td className="px-3 py-3 text-slate-800">
                <span className="block text-base font-semibold">{f.ad}</span>
                {f.ozel && <span className="mt-1 block text-xs text-slate-500">Bu yıla özel</span>}
                {f.ozel || !kart.maliyetAcik || yil == null || programId == null || altProgramId == null ? (
                  f.gostergeler.length > 0 && <span className="mt-1 block text-xs text-slate-500">{f.gostergeler.join(' · ')}</span>
                ) : (
                  <PpFaaliyetGostergeYonet
                    faaliyetId={f.id}
                    kayitlar={f.gostergeKayit}
                    yillar={yillar}
                    yil={yil}
                    programId={programId}
                    altProgramId={altProgramId}
                  />
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-medium text-slate-800">
                {kart.maliyetAcik ? para(f.toplam) : '—'}
              </td>
              <td className="px-3 py-3">
                {kart.maliyetAcik && yil != null && programId != null && altProgramId != null ? (
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={() => { setTur('log'); setPencere(f) }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100" title="Kayıt geçmişi">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <button type="button" onClick={() => { setTur('goz'); setPencere(f) }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50" title="Girilen ödenekler">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <Link href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/maliyet/${f.id}${f.ozel ? '?ozel=1' : ''}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-700 hover:bg-emerald-50" title="Düzenle">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Link>
                    {!f.ozel && (
                      <button
                        type="button"
                        onClick={() => window.open(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/gosterge/${f.id}`, '_blank')}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-amber-700 hover:bg-amber-50"
                        title="Performans göstergeleri"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      </button>
                    )}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={pencere != null} onClose={() => setPencere(null)} title={tur === 'log' ? 'Kayıt geçmişi' : 'Girilen ödenekler'} size="lg">
        {pencere && tur === 'log' && (
          pencere.loglar.length === 0 ? <p className="text-sm text-slate-500">Kayıt yok.</p> : (
            <ul className="space-y-2">
              {pencere.loglar.map(l => (
                <li key={l.id} className="text-sm text-slate-700">
                  <span className="text-slate-500">{saat(l.zaman)} · {l.kisi}</span>
                  <span className="block">{l.metin}</span>
                </li>
              ))}
            </ul>
          )
        )}
        {pencere && tur === 'goz' && (
          pencere.girilen.filter(g => g.tutar > 0).length === 0 ? <p className="text-sm text-slate-500">Teklif girilmiş ödenek yok.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-2 text-left font-medium">Kod</th>
                  <th className="py-2 text-left font-medium">Hesap</th>
                  <th className="py-2 text-right font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pencere.girilen.filter(g => g.tutar > 0).map(g => (
                  <tr key={`${g.kod}-${g.ad}`}>
                    <td className="py-2 font-mono text-xs">{g.kod}</td>
                    <td className="py-2">{g.ad}</td>
                    <td className="py-2 text-right tabular-nums">{para(g.tutar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </Modal>
    </div>
  )
}
