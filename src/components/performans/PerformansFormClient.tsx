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
  PERFORMANS_HIZLI_BANDLAR,
  performansHizliBantDagit,
  performansHizliBantToplam,
  type PerformansHizliBant,
} from '@/lib/performans-hizli-bant'
import {
  performansAmir1Kaydet,
  performansAmir2Kaydet,
  performansAmir2MudurlukBildirimSmsGonder,
  performansSonrakiDegerlendirmeBul,
} from '@/app/(dashboard)/performans/actions'
import Modal from '@/components/ui/Modal'

type KriterSatir = {
  id: number
  kod: number
  baslik: string
  aciklama: string | null
  puan_amir1: number | null
  puan_amir2: number | null
}

type HizliBantModal = {
  bant: PerformansHizliBant
  puanlar: Record<number, number>
  toplam: number
}

function GeriLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
      </svg>
      Geri
    </Link>
  )
}

export default function PerformansFormClient({
  degerlendirme,
  kriterler,
  rol,
  kaydedilebilir,
  tamamlandi = false,
  geriHref = '/performans/degerlendirme',
  donemId = null,
  mudurlukAdi = null,
  adminVekalet = false,
  bbyAmir1Mudur = false,
  bbyAmir2Mod = false,
  baskanMod = false,
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
  tamamlandi?: boolean
  geriHref?: string
  donemId?: number | null
  mudurlukAdi?: string | null
  adminVekalet?: boolean
  bbyAmir1Mudur?: boolean
  bbyAmir2Mod?: boolean
  baskanMod?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [iadeNotu, setIadeNotu] = useState('')
  const [smsModal, setSmsModal] = useState<{
    sonraHref: string
    amir2Ad: string
    bildirimMetni: string
  } | null>(null)
  const [smsHata, setSmsHata] = useState<string | null>(null)
  const [smsPending, startSms] = useTransition()
  const [hizliBantModal, setHizliBantModal] = useState<HizliBantModal | null>(null)

  const amir1Baslangic = useMemo(() => {
    const m: Record<number, number> = {}
    for (const k of kriterler) {
      if (k.puan_amir1) m[k.id] = k.puan_amir1
    }
    return m
  }, [kriterler])

  const baslangic = useMemo(() => {
    const m: Record<number, number> = {}
    for (const k of kriterler) {
      const v = rol === 'amir2' ? (k.puan_amir2 ?? k.puan_amir1) : k.puan_amir1
      if (v) m[k.id] = v
    }
    return m
  }, [kriterler, rol])

  const [puanlar, setPuanlar] = useState<Record<number, number>>(baslangic)

  const kriterIdleri = useMemo(() => kriterler.map(k => k.id), [kriterler])

  const toplam = Object.values(puanlar).reduce((s, v) => s + (v || 0), 0)
  const toplamAmir1 = kriterler.reduce((s, k) => s + (k.puan_amir1 ?? 0), 0)
  const hepsiDolu = kriterler.every(k => puanlar[k.id] >= 1 && puanlar[k.id] <= 5)

  function setPuan(kriterId: number, v: number) {
    if (!kaydedilebilir) return
    setPuanlar(prev => ({ ...prev, [kriterId]: v }))
  }

  function kayitHref(degId: number, kayitRol: 'amir1' | 'amir2' = rol): string {
    const q = new URLSearchParams({ rol: kayitRol })
    if (donemId) q.set('donem', String(donemId))
    if (mudurlukAdi) q.set('mudurluk', mudurlukAdi)
    if (bbyAmir1Mudur) q.set('bby', '1')
    else if (bbyAmir2Mod) q.set('bby2', '1')
    else if (baskanMod) q.set('baskan', '1')
    if (adminVekalet) q.set('vekalet', '1')
    return `/performans/degerlendirme/kayit/${degId}?${q.toString()}`
  }

  function run(
    fn: () => Promise<{ hata?: string; sonraHref?: string }>,
    varsayilanHref?: string,
  ) {
    setHata(null)
    start(async () => {
      const r = await fn()
      if (r.hata) {
        setHata(r.hata)
        return
      }
      const href = r.sonraHref ?? varsayilanHref
      if (href) router.push(href)
      else router.refresh()
    })
  }

  function hizliBantSec(bant: PerformansHizliBant) {
    if (!kaydedilebilir) return
    const dagitim = performansHizliBantDagit(kriterIdleri, bant)
    setHizliBantModal({
      bant,
      puanlar: dagitim,
      toplam: performansHizliBantToplam(dagitim),
    })
  }

  function hizliBantModalKapat() {
    setHizliBantModal(null)
  }

  function hizliBantUygulaVe(
    fn: (puanKaynak: Record<number, number>) => Promise<{ hata?: string; sonraHref?: string }>,
    href?: string,
  ) {
    if (!hizliBantModal) return
    const uygulanan = hizliBantModal.puanlar
    setPuanlar(uygulanan)
    setHizliBantModal(null)
    run(() => fn(uygulanan), href)
  }

  async function amir1GonderSonrasi(
    puanKaynak: Record<number, number> = puanlar,
  ): Promise<{ hata?: string; sonraHref?: string }> {
    const r = await performansAmir1Kaydet({
      degerlendirmeId: degerlendirme.id,
      puanlar: puanKaynak,
      gonder: true,
    })
    if (r.hata) return r

    try {
      const sonraki = await performansSonrakiDegerlendirmeBul({
        mevcutDegId: degerlendirme.id,
        donemId: donemId!,
        mudurlukAdi,
        rol: 'amir1',
        bbyAmir1Mudur,
      })
      if (sonraki.hata) return { hata: sonraki.hata }

      const href = sonraki.sonrakiId
        ? kayitHref(sonraki.sonrakiId, 'amir1')
        : geriHref

      if (
        !degerlendirme.tek_amir &&
        !sonraki.sonrakiId &&
        sonraki.mudurlukAmir1Tamam &&
        sonraki.bildirimMetni &&
        sonraki.amir2Ad &&
        (bbyAmir1Mudur || mudurlukAdi)
      ) {
        setSmsHata(null)
        setSmsModal({
          sonraHref: href,
          amir2Ad: sonraki.amir2Ad,
          bildirimMetni: sonraki.bildirimMetni,
        })
        return {}
      }

      return { sonraHref: href }
    } catch (e) {
      return { hata: e instanceof Error ? e.message : 'Sonraki kayıt bulunamadı.' }
    }
  }

  function smsModalKapat(gonder: boolean) {
    if (!smsModal || !donemId) return
    const href = smsModal.sonraHref
    if (!gonder) {
      setSmsModal(null)
      router.push(href)
      return
    }
    setSmsHata(null)
    startSms(async () => {
      const r = await performansAmir2MudurlukBildirimSmsGonder({
        donemId,
        mudurlukAdi: mudurlukAdi ?? undefined,
        mevcutDegId: degerlendirme.id,
        bbyAmir1Mudur,
      })
      if (r.hata) {
        setSmsHata(r.hata)
        return
      }
      setSmsModal(null)
      router.push(href)
    })
  }

  async function sonrakiHrefBul(kayitRol: 'amir1' | 'amir2'): Promise<string> {
    if (!donemId) return geriHref
    const sonraki = await performansSonrakiDegerlendirmeBul({
      mevcutDegId: degerlendirme.id,
      donemId,
      mudurlukAdi,
      rol: kayitRol,
      bbyAmir1Mudur,
      bbyAmir2Mod: kayitRol === 'amir2' ? bbyAmir2Mod : undefined,
    })
    if (sonraki.hata) throw new Error(sonraki.hata)
    if (sonraki.sonrakiId) return kayitHref(sonraki.sonrakiId, kayitRol)
    if (kayitRol === 'amir2' && bbyAmir2Mod) {
      const q = new URLSearchParams({ bby2: '1' })
      if (mudurlukAdi) q.set('mudurluk', mudurlukAdi)
      return `/performans/degerlendirme/${donemId}?${q.toString()}`
    }
    return geriHref
  }

  async function amir2DevamEt(
    puanKaynak: Record<number, number> = puanlar,
  ): Promise<{ hata?: string; sonraHref?: string }> {
    const r = await performansAmir2Kaydet({
      degerlendirmeId: degerlendirme.id,
      puanlar: puanKaynak,
      islem: 'onayla',
    })
    if (r.hata) return r
    try {
      return { sonraHref: await sonrakiHrefBul('amir2') }
    } catch (e) {
      return { hata: e instanceof Error ? e.message : 'Sonraki kayıt bulunamadı.' }
    }
  }

  async function amir2IadeSonrasi(): Promise<{ hata?: string; sonraHref?: string }> {
    const r = await performansAmir2Kaydet({
      degerlendirmeId: degerlendirme.id,
      puanlar,
      islem: 'iade',
      iadeNotu,
    })
    if (r.hata) return r
    try {
      return { sonraHref: await sonrakiHrefBul('amir2') }
    } catch (e) {
      return { hata: e instanceof Error ? e.message : 'Sonraki kayıt bulunamadı.' }
    }
  }

  async function amir2KaydetKapat(
    puanKaynak: Record<number, number> = puanlar,
  ): Promise<{ hata?: string; sonraHref?: string }> {
    const r = await performansAmir2Kaydet({
      degerlendirmeId: degerlendirme.id,
      puanlar: puanKaynak,
      islem: 'kaydet',
    })
    if (r.hata) return r
    return { sonraHref: geriHref }
  }

  const ciftSutun = rol === 'amir2'

  return (
    <div className={`mx-auto space-y-6 ${ciftSutun ? 'max-w-4xl' : 'max-w-3xl'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
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
          {tamamlandi && (
            <p className="mt-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Bu personelin değerlendirmesi tamamlanmıştır. Yeniden değerlendirme için yönetici sıfırlama gerekir.
            </p>
          )}
        </div>
        <GeriLink href={geriHref} />
      </div>

      {hata && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{hata}</div>
      )}

      {kaydedilebilir && !tamamlandi && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Hızlı puanlama</p>
          <div className="flex flex-wrap gap-2">
            {PERFORMANS_HIZLI_BANDLAR.map(b => (
              <button
                key={b.key}
                type="button"
                disabled={pending}
                onClick={() => hizliBantSec(b)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-800 transition-colors disabled:opacity-50"
              >
                {b.etiket} ({b.min}–{b.max})
              </button>
            ))}
          </div>
        </div>
      )}

      {ciftSutun && !tamamlandi && (
        <p className="text-sm text-slate-600 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
          Sol sütunda 1. amir puanları salt okunurdur. Değişikliklerinizi sağ sütundan yapın.
        </p>
      )}

      {ciftSutun && (
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>Kriter</span>
          <span className="w-36 text-center">1. Amir</span>
          <span className="w-36 text-center">2. Amir</span>
        </div>
      )}

      <div className="space-y-3">
        {kriterler.map(k => {
          const amir1Puan = amir1Baslangic[k.id] ?? k.puan_amir1
          const farkli = ciftSutun && amir1Puan != null && puanlar[k.id] != null && amir1Puan !== puanlar[k.id]
          return (
            <div
              key={k.id}
              className={`rounded-xl border px-4 py-3 ${
                farkli ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'
              } ${ciftSutun ? 'grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 sm:items-center' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'}`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  <span className="text-slate-400 mr-2">{k.kod}.</span>
                  {k.baslik}
                </div>
                {k.aciklama && (
                  <p className="text-xs text-slate-500 mt-0.5">{k.aciklama}</p>
                )}
              </div>
              {ciftSutun ? (
                <>
                  <div className="sm:w-36 flex sm:justify-center rounded-lg bg-slate-100/80 px-2 py-1">
                    <YildizPuan value={amir1Puan ?? null} disabled muted size="sm" />
                  </div>
                  <div className="sm:w-36 flex sm:justify-center">
                    <YildizPuan
                      value={puanlar[k.id] ?? null}
                      onChange={v => setPuan(k.id, v)}
                      disabled={!kaydedilebilir}
                      size="sm"
                    />
                  </div>
                </>
              ) : (
                <YildizPuan
                  value={puanlar[k.id] ?? null}
                  onChange={v => setPuan(k.id, v)}
                  disabled={!kaydedilebilir}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-0 bg-white/95 border-t border-slate-200 py-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="text-sm text-slate-700">
          {ciftSutun ? (
            <>
              1. amir toplam:{' '}
              <strong className="tabular-nums">{toplamAmir1}</strong>
              <span className="text-slate-400 ml-1">({performansPuanBandi(toplamAmir1)})</span>
              <span className="mx-2 text-slate-300">·</span>
              2. amir toplam:{' '}
              <strong className="tabular-nums">{toplam}</strong>
              <span className="text-slate-400 ml-1">({performansPuanBandi(toplam)})</span>
            </>
          ) : (
            <>
              Toplam: <strong className="tabular-nums">{toplam}</strong>
              <span className="text-slate-400 ml-2">({performansPuanBandi(toplam)})</span>
            </>
          )}
        </div>

        {kaydedilebilir && rol === 'amir1' && (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    performansAmir1Kaydet({
                      degerlendirmeId: degerlendirme.id,
                      puanlar,
                      gonder: false,
                    }),
                  geriHref,
                )
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {'Kaydet>Kapat'}
            </button>
            <button
              type="button"
              disabled={pending || !hepsiDolu}
              onClick={() => run(() => amir1GonderSonrasi())}
              className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {degerlendirme.tek_amir ? 'Kaydet ve tamamla' : 'Kaydet>2. Amire Gönder'}
            </button>
            <button
              type="button"
              disabled={pending || !hepsiDolu}
              onClick={() => run(() => amir1GonderSonrasi())}
              className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              {'Kaydet>Devam Et'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => router.push(geriHref)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Çıkış
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
              onClick={() => run(() => amir2IadeSonrasi())}
              className="rounded-lg border border-amber-300 text-amber-900 px-4 py-2 text-sm hover:bg-amber-50 disabled:opacity-50"
            >
              1. Amire İade Et
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => amir2KaydetKapat())}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {'Kaydet>Kapat'}
            </button>
            <button
              type="button"
              disabled={pending || !hepsiDolu}
              onClick={() => run(() => amir2DevamEt())}
              className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              {'Onayla>Devam Et'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => router.push(geriHref)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Çıkış
            </button>
          </div>
        )}
      </div>

      <Modal
        open={hizliBantModal != null}
        onClose={hizliBantModalKapat}
        title="Hızlı puanlama"
        size="sm"
      >
        {hizliBantModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{hizliBantModal.bant.etiket}</span>{' '}
              ({hizliBantModal.bant.min}–{hizliBantModal.bant.max}) aralığından rastgele bir toplam seçilip
              kriterlere dağıtılacak.
            </p>
            <p className="text-sm text-slate-700">
              Toplam:{' '}
              <strong className="tabular-nums">{hizliBantModal.toplam}</strong>
              <span className="text-slate-400 ml-1">
                ({performansPuanBandi(hizliBantModal.toplam)})
              </span>
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {rol === 'amir1' ? (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      hizliBantUygulaVe(
                        p =>
                          performansAmir1Kaydet({
                            degerlendirmeId: degerlendirme.id,
                            puanlar: p,
                            gonder: false,
                          }),
                        geriHref,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {'Kaydet>Kapat'}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      hizliBantUygulaVe(p => amir1GonderSonrasi(p))
                    }
                    className="w-full rounded-lg bg-slate-800 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                  >
                    {degerlendirme.tek_amir ? 'Kaydet ve tamamla' : 'Kaydet>2. Amire Gönder'}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      hizliBantUygulaVe(p => amir1GonderSonrasi(p))
                    }
                    className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {'Kaydet>Devam Et'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => hizliBantUygulaVe(p => amir2KaydetKapat(p))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {'Kaydet>Kapat'}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => hizliBantUygulaVe(p => amir2DevamEt(p))}
                    className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {'Kaydet>Devam Et'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={smsModal != null}
        onClose={() => smsModalKapat(false)}
        title="2. Amire Mesaj Gönderilsin mi?"
        size="md"
      >
        {smsModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{mudurlukAdi}</span> müdürlüğündeki tüm
              personelin 1. amir değerlendirmesi tamamlandı. 2. amir{' '}
              <span className="font-medium text-slate-800">{smsModal.amir2Ad}</span> bilgilendirilsin
              mi?
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap">
              {smsModal.bildirimMetni}
            </div>
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Test modu: SMS şimdilik <strong>05322804987</strong> numarasına{' '}
              <strong>ADPZRIBLD</strong> başlığıyla gönderilir.
            </p>
            {smsHata && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {smsHata}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={smsPending}
                onClick={() => smsModalKapat(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Hayır
              </button>
              <button
                type="button"
                disabled={smsPending}
                onClick={() => smsModalKapat(true)}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {smsPending ? 'Gönderiliyor…' : 'Evet, gönder'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
