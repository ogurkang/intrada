'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { YildizPuan } from '@/components/performans/YildizPuan'
import {
  PERF_FORM_ETIKET,
  performansPuanBandi,
  type PerformansFormTipi,
} from '@/lib/performans'
import {
  performansAmir1Kaydet,
  performansAmir2Kaydet,
} from '@/app/(dashboard)/performans/actions'

type KriterSatir = {
  id: number
  kod: number
  baslik: string
  aciklama: string | null
  puan_amir1: number | null
  puan_amir2: number | null
}

export default function PerformansFormClient({
  degerlendirme,
  kriterler,
  rol,
  kaydedilebilir,
  geriHref = '/performans/degerlendirme',
  adminVekalet = false,
}: {
  degerlendirme: {
    id: number
    sicil_no: string
    ad_soyad: string
    form_tipi: PerformansFormTipi
    durum: string
    tek_amir: boolean
    iade_notu: string | null
    puan_amir1: number | null
    puan_amir2: number | null
    ortalama: number | null
    donem_yil: number
  }
  kriterler: KriterSatir[]
  rol: 'amir1' | 'amir2'
  kaydedilebilir: boolean
  geriHref?: string
  adminVekalet?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [iadeNotu, setIadeNotu] = useState('')

  const baslangic = useMemo(() => {
    const m: Record<number, number> = {}
    for (const k of kriterler) {
      const v = rol === 'amir2' ? (k.puan_amir2 ?? k.puan_amir1) : k.puan_amir1
      if (v) m[k.id] = v
    }
    return m
  }, [kriterler, rol])

  const [puanlar, setPuanlar] = useState<Record<number, number>>(baslangic)

  const toplam = Object.values(puanlar).reduce((s, v) => s + (v || 0), 0)
  const hepsiDolu = kriterler.every(k => puanlar[k.id] >= 1 && puanlar[k.id] <= 5)

  function setPuan(kriterId: number, v: number) {
    if (!kaydedilebilir) return
    setPuanlar(prev => ({ ...prev, [kriterId]: v }))
  }

  function run(fn: () => Promise<{ hata?: string }>, sonraHref?: string) {
    setHata(null)
    start(async () => {
      const r = await fn()
      if (r.hata) {
        setHata(r.hata)
        return
      }
      if (sonraHref) router.push(sonraHref)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href={geriHref} className="text-sm text-slate-500 hover:text-slate-700">
          ← Geri
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">
          {degerlendirme.ad_soyad}{' '}
          <span className="text-base font-normal text-slate-500">
            ({degerlendirme.sicil_no})
          </span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {degerlendirme.donem_yil} · {PERF_FORM_ETIKET[degerlendirme.form_tipi]} ·{' '}
          {rol === 'amir1' ? '1. amir' : '2. amir'}
          {degerlendirme.tek_amir ? ' (tek amir)' : ''}
        </p>
        {degerlendirme.iade_notu && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            İade notu: {degerlendirme.iade_notu}
          </p>
        )}
        {adminVekalet && (
          <p className="mt-2 text-sm text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            Yönetici vekaleti: {rol === 'amir1' ? '1.' : '2.'} amir adına değerlendirme yapıyorsunuz.
          </p>
        )}
      </div>

      {hata && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{hata}</div>
      )}

      {rol === 'amir2' && (
        <p className="text-sm text-slate-600 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
          1. amir puanları önceden yüklendi. İstediğiniz kriteri değiştirebilir veya aynen onaylayabilirsiniz.
        </p>
      )}

      <div className="space-y-3">
        {kriterler.map(k => (
          <div
            key={k.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800">
                <span className="text-slate-400 mr-2">{k.kod}.</span>
                {k.baslik}
              </div>
              {k.aciklama && (
                <p className="text-xs text-slate-500 mt-0.5">{k.aciklama}</p>
              )}
              {rol === 'amir2' && k.puan_amir1 != null && (
                <p className="text-xs text-slate-400 mt-1">1. amir: {k.puan_amir1}★</p>
              )}
            </div>
            <YildizPuan
              value={puanlar[k.id] ?? null}
              onChange={v => setPuan(k.id, v)}
              disabled={!kaydedilebilir}
            />
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-white/95 border-t border-slate-200 py-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="text-sm text-slate-700">
          Toplam: <strong className="tabular-nums">{toplam}</strong>
          <span className="text-slate-400 ml-2">({performansPuanBandi(toplam)})</span>
        </div>

        {kaydedilebilir && rol === 'amir1' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  performansAmir1Kaydet({
                    degerlendirmeId: degerlendirme.id,
                    puanlar,
                    gonder: false,
                  }),
                )
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Kaydet kapat
            </button>
            <button
              type="button"
              disabled={pending || !hepsiDolu}
              onClick={() =>
                run(
                  () =>
                    performansAmir1Kaydet({
                      degerlendirmeId: degerlendirme.id,
                      puanlar,
                      gonder: true,
                    }),
                  geriHref,
                )
              }
              className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {degerlendirme.tek_amir ? 'Kaydet ve tamamla' : 'Kaydet · 2. amire gönder'}
            </button>
            <button
              type="button"
              disabled={pending || !hepsiDolu}
              onClick={() =>
                run(async () => {
                  const r = await performansAmir1Kaydet({
                    degerlendirmeId: degerlendirme.id,
                    puanlar,
                    gonder: true,
                  })
                  if (r.hata) return r
                  return {}
                }, geriHref)
              }
              className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              Kaydet · devam et
            </button>
          </div>
        )}

        {kaydedilebilir && rol === 'amir2' && (
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={iadeNotu}
              onChange={e => setIadeNotu(e.target.value)}
              placeholder="İade notu (opsiyonel)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-48"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    performansAmir2Kaydet({
                      degerlendirmeId: degerlendirme.id,
                      puanlar,
                      islem: 'iade',
                      iadeNotu,
                    }),
                  geriHref,
                )
              }
              className="rounded-lg border border-amber-300 text-amber-900 px-4 py-2 text-sm hover:bg-amber-50 disabled:opacity-50"
            >
              1. amire iade
            </button>
            <button
              type="button"
              disabled={pending || !hepsiDolu}
              onClick={() =>
                run(
                  () =>
                    performansAmir2Kaydet({
                      degerlendirmeId: degerlendirme.id,
                      puanlar,
                      islem: 'onayla',
                    }),
                  geriHref,
                )
              }
              className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              Onayla
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
