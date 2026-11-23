'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpPerformansBlok, PpPerformansRaporYil } from '@/lib/pp-mudurluk-rapor'
import { ppIdareBloklariTekil } from '@/lib/pp-mudurluk-rapor'
import { ppNorm } from '@/lib/pp-erisim'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpRaporGoz from '@/components/stratejik/PpRaporGoz'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/idare-performans-bilgisi`
const EXCEL = '/api/performans-programi/raporlar/idare-performans/excel'
const TUR_UYARI = 'Önce Listeleme Türünü belirleyiniz.'

export type PpIdareListeTur = '' | 'hedef' | 'mudurluk'

export default function PpIdarePerformansListeClient({
  rapor,
  listeTur,
  secilenMudurluk,
  secilenHedefKey,
}: {
  rapor: PpPerformansRaporYil
  listeTur: PpIdareListeTur
  secilenMudurluk: string
  secilenHedefKey: string
}) {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)
  const mudurlukler = rapor.sekmeler.map(s => s.mudurluk)
  const tumBloklar = useMemo(() => ppIdareBloklariTekil(rapor), [rapor])

  const mudurlukAktif = listeTur === 'mudurluk'
    && Boolean(secilenMudurluk)
    && mudurlukler.some(m => ppNorm(m) === ppNorm(secilenMudurluk))
  const aktifMudurluk = mudurlukAktif
    ? (mudurlukler.find(m => ppNorm(m) === ppNorm(secilenMudurluk)) ?? '')
    : ''

  const hedefAktif = listeTur === 'hedef'
    && Boolean(secilenHedefKey)
    && tumBloklar.some(b => (b.tabloKey ?? '') === secilenHedefKey)
  const aktifHedefKey = hedefAktif ? secilenHedefKey : ''

  const mudurlukHedefleri: PpPerformansBlok[] = useMemo(() => {
    if (!aktifMudurluk) return []
    const sekme = rapor.sekmeler.find(s => ppNorm(s.mudurluk) === ppNorm(aktifMudurluk))
    return sekme?.bloklar ?? []
  }, [aktifMudurluk, rapor.sekmeler])

  /** Performans Hedefi türünde: tüm hedefler birer kez; Seçim doluysa yalnızca o hedef. */
  const hedefListesi: PpPerformansBlok[] = useMemo(() => {
    if (listeTur !== 'hedef') return []
    if (aktifHedefKey) return tumBloklar.filter(b => b.tabloKey === aktifHedefKey)
    return tumBloklar
  }, [listeTur, aktifHedefKey, tumBloklar])

  useEffect(() => {
    setYukleniyor(false)
  }, [rapor.yil, listeTur, aktifMudurluk, aktifHedefKey, tumBloklar.length, mudurlukHedefleri.length])

  function turYoksaUyar(): boolean {
    if (listeTur) return false
    window.alert(TUR_UYARI)
    return true
  }

  function git(opts: { y?: string; t?: PpIdareListeTur; m?: string; h?: string }) {
    setYukleniyor(true)
    const q = new URLSearchParams()
    q.set('y', opts.y ?? String(rapor.yil))
    const t = opts.t !== undefined ? opts.t : listeTur
    if (t) q.set('t', t)
    if (t === 'mudurluk') {
      const m = opts.m !== undefined ? opts.m : aktifMudurluk
      if (m) q.set('m', m)
    }
    if (t === 'hedef') {
      const h = opts.h !== undefined ? opts.h : aktifHedefKey
      if (h) q.set('h', h)
    }
    router.push(`${LISTE_YOL}?${q}`)
  }

  function hedefGorHref(b: PpPerformansBlok) {
    const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
    const q = new URLSearchParams({ y: String(rapor.yil), t: 'hedef' })
    return `${LISTE_YOL}/${encodeURIComponent(key)}?${q}`
  }

  function mudurlukHedefGorHref(b: PpPerformansBlok) {
    const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
    const q = new URLSearchParams({ y: String(rapor.yil), t: 'mudurluk' })
    if (aktifMudurluk) q.set('m', aktifMudurluk)
    return `${LISTE_YOL}/${encodeURIComponent(key)}?${q}`
  }

  function excelHref(b: PpPerformansBlok) {
    const q = new URLSearchParams({
      yil: String(rapor.yil),
      ap: String(b.altProgramId ?? ''),
      ah: String(b.altHedefId ?? ''),
    })
    return `${EXCEL}?${q}`
  }

  function hedefEtiket(b: PpPerformansBlok): string {
    return b.hedefKod
      ? `${b.hedefKod} — ${b.hedefAd ?? b.hedef}`
      : (b.hedefAd ?? b.hedef)
  }

  const secimValue = listeTur === 'mudurluk'
    ? aktifMudurluk
    : listeTur === 'hedef'
      ? aktifHedefKey
      : ''

  return (
    <div className="space-y-6 relative">
      {yukleniyor ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/75 backdrop-blur-[1px]"
          role="alert"
          aria-busy="true"
          aria-label="Rapor yükleniyor"
        >
          <IntradaLoader label="Rapor yükleniyor" />
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">İdare Performans Bilgisi Tablosu</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Varsayılan olarak bir sonraki takvim yılıdır. Kayıt girişi yapmaz.' },
              { baslik: 'Listeleme Türü', metin: 'Önce bunu seçin: Performans Hedefi veya Müdürlük.' },
              { baslik: 'Seçim', metin: 'Tür seçilmeden kullanılırsa uyarı çıkar. Hedef türünde filtre; müdürlük türünde müdürlük seçimi.' },
              { baslik: 'Hedef listesi', metin: 'Her performans hedefi bir kez listelenir; birden fazla müdürlük virgülle yazılır. Göz/Excel birleşik tabloyu açar.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Önce Listeleme Türü’nü seçin; ardından Seçim ile ilerleyin.
          </p>
        </div>
        <Link
          href={PP_RAPORLAR_BASE}
          className="inline-flex shrink-0 items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 self-start"
        >
          ← Raporlar
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block font-medium">Yıl</span>
          <select
            value={rapor.yil}
            onChange={e => git({ y: e.target.value })}
            className="min-w-[7rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {rapor.yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700 min-w-[14rem]">
          <span className="mb-1 block font-medium">Listeleme Türü</span>
          <select
            value={listeTur}
            onChange={e => git({ t: e.target.value as PpIdareListeTur, m: '', h: '' })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Seçiniz</option>
            <option value="hedef">Performans Hedefi</option>
            <option value="mudurluk">Müdürlük</option>
          </select>
        </label>

        <label className="text-sm text-slate-700 min-w-[16rem] flex-1">
          <span className="mb-1 block font-medium">Seçim</span>
          <select
            value={secimValue}
            onMouseDown={e => {
              if (!listeTur) {
                e.preventDefault()
                window.alert(TUR_UYARI)
              }
            }}
            onFocus={() => {
              if (!listeTur) window.alert(TUR_UYARI)
            }}
            onChange={e => {
              if (turYoksaUyar()) return
              const v = e.target.value
              if (listeTur === 'mudurluk') git({ t: 'mudurluk', m: v })
              else if (listeTur === 'hedef') git({ t: 'hedef', h: v })
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Seçiniz</option>
            {listeTur === 'mudurluk'
              ? mudurlukler.map(m => (
                <option key={m} value={m}>{m}</option>
              ))
              : null}
            {listeTur === 'hedef'
              ? tumBloklar.map(b => {
                const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
                return (
                  <option key={key} value={key}>{hedefEtiket(b)}</option>
                )
              })
              : null}
          </select>
        </label>
      </div>

      {listeTur === '' ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Listelemek için önce Listeleme Türü’nü belirleyin.
        </div>
      ) : null}

      {listeTur === 'hedef' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
            Performans Hedefleri
            {aktifHedefKey ? ' (filtrelendi)' : ''}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-16 px-4 py-3 text-center">Sıra</th>
                <th className="w-28 px-4 py-3 text-left">Kodu</th>
                <th className="px-4 py-3 text-left">Performans Hedefi</th>
                <th className="px-4 py-3 text-left">Program</th>
                <th className="px-4 py-3 text-left">Alt Program</th>
                <th className="px-4 py-3 text-left">Sorumlu Birim</th>
                <th className="w-28 px-4 py-3 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hedefListesi.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Bu yıl için performans hedefi yok.
                  </td>
                </tr>
              ) : hedefListesi.map((b, i) => {
                const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
                const gor = hedefGorHref(b)
                return (
                  <tr key={key} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.hedefKod ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={gor} className="font-medium text-teal-800 hover:underline">
                        {b.hedefAd ?? b.hedef}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.programAdi}</td>
                    <td className="px-4 py-3 text-slate-600">{b.altProgramAdi}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{b.veriKaynagi || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <PpRaporGoz href={gor} />
                        <a
                          href={excelHref(b)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"
                          title="Excel indir (tüm sorumlu müdürlükler birleşik)"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {listeTur === 'mudurluk' ? (
        !aktifMudurluk ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
            Seçim’den bir müdürlük seçin.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
              Seçim — {aktifMudurluk}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="w-16 px-4 py-3 text-center">Sıra</th>
                  <th className="w-28 px-4 py-3 text-left">Kodu</th>
                  <th className="px-4 py-3 text-left">Performans Hedefi</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-left">Alt Program</th>
                  <th className="w-28 px-4 py-3 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mudurlukHedefleri.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      Bu müdürlük için performans hedefi yok.
                    </td>
                  </tr>
                ) : mudurlukHedefleri.map((b, i) => {
                  const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
                  const gor = mudurlukHedefGorHref(b)
                  return (
                    <tr key={key} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.hedefKod ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link href={gor} className="font-medium text-teal-800 hover:underline">
                          {b.hedefAd ?? b.hedef}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.programAdi}</td>
                      <td className="px-4 py-3 text-slate-600">{b.altProgramAdi}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <PpRaporGoz href={gor} />
                          <a
                            href={excelHref(b)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"
                            title="Excel indir"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  )
}
