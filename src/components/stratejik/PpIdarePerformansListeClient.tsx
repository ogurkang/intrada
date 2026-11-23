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

export default function PpIdarePerformansListeClient({
  rapor,
  secilenMudurluk,
  secilenHedefKey,
}: {
  rapor: PpPerformansRaporYil
  secilenMudurluk: string
  secilenHedefKey: string
}) {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)
  const mudurlukler = rapor.sekmeler.map(s => s.mudurluk)
  const tumBloklar = useMemo(() => ppIdareBloklariTekil(rapor), [rapor])

  const mudurlukAktif = Boolean(secilenMudurluk)
    && mudurlukler.some(m => ppNorm(m) === ppNorm(secilenMudurluk))
  const aktifMudurluk = mudurlukAktif
    ? (mudurlukler.find(m => ppNorm(m) === ppNorm(secilenMudurluk)) ?? '')
    : ''

  const mudurlukBloklari = useMemo(() => {
    if (!aktifMudurluk) return tumBloklar
    const sekme = rapor.sekmeler.find(s => ppNorm(s.mudurluk) === ppNorm(aktifMudurluk))
    return sekme?.bloklar ?? []
  }, [aktifMudurluk, rapor.sekmeler, tumBloklar])

  const hedefSecenekleri = useMemo(() => mudurlukBloklari, [mudurlukBloklari])

  const hedefAktif = Boolean(secilenHedefKey)
    && hedefSecenekleri.some(b => (b.tabloKey ?? '') === secilenHedefKey)
  const aktifHedefKey = hedefAktif ? secilenHedefKey : ''

  const tablolar: PpPerformansBlok[] = useMemo(() => {
    if (aktifHedefKey) {
      return mudurlukBloklari.filter(b => b.tabloKey === aktifHedefKey)
    }
    return mudurlukBloklari
  }, [aktifHedefKey, mudurlukBloklari])

  useEffect(() => {
    setYukleniyor(false)
  }, [rapor.yil, aktifMudurluk, aktifHedefKey, tablolar.length])

  function git(opts: { y?: string; m?: string; h?: string }) {
    setYukleniyor(true)
    const q = new URLSearchParams()
    q.set('y', opts.y ?? String(rapor.yil))
    const m = opts.m !== undefined ? opts.m : aktifMudurluk
    const h = opts.h !== undefined ? opts.h : aktifHedefKey
    if (m) q.set('m', m)
    if (h) q.set('h', h)
    router.push(`${LISTE_YOL}?${q}`)
  }

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
              { baslik: 'Müdürlük', metin: 'Seçilirse yalnızca o müdürlüğe bağlı performans hedefleri listelenir. Tümü: tüm hedefler.' },
              { baslik: 'Performans Hedefi', metin: 'Seçilirse o hedefe ait tablo açılır; aynı hedefe bağlı müdürlükler tek tabloda birleştirilir.' },
              { baslik: 'Göz', metin: 'Seçilen performans hedefinin tablosunu açar.' },
              { baslik: 'İndir', metin: 'O hedefin Excel dosyasını indirir.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Yıl, müdürlük veya performans hedefi ile filtreleyin; listeden göz ile bakın veya indirin.
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
            onChange={e => git({ y: e.target.value, m: aktifMudurluk, h: aktifHedefKey })}
            className="min-w-[7rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {rapor.yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700 min-w-[14rem] flex-1">
          <span className="mb-1 block font-medium">Müdürlük</span>
          <select
            value={aktifMudurluk}
            onChange={e => git({ m: e.target.value, h: '' })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tümü</option>
            {mudurlukler.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700 min-w-[16rem] flex-1">
          <span className="mb-1 block font-medium">Performans Hedefi</span>
          <select
            value={aktifHedefKey}
            onChange={e => git({ h: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={hedefSecenekleri.length === 0}
          >
            <option value="">Tümü</option>
            {hedefSecenekleri.map(b => {
              const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
              const etiket = b.hedefKod
                ? `${b.hedefKod} — ${b.hedefAd ?? b.hedef}`
                : (b.hedefAd ?? b.hedef)
              return (
                <option key={key} value={key}>{etiket}</option>
              )
            })}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
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
            {tablolar.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  Seçilen filtreler için performans hedefi yok.
                </td>
              </tr>
            ) : tablolar.map((b, i) => {
              const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
              const gorQ = new URLSearchParams({ y: String(rapor.yil) })
              if (aktifMudurluk) gorQ.set('m', aktifMudurluk)
              const gor = `${LISTE_YOL}/${encodeURIComponent(key)}?${gorQ}`
              const excelQ = new URLSearchParams({
                yil: String(rapor.yil),
                ap: String(b.altProgramId ?? ''),
                ah: String(b.altHedefId ?? ''),
              })
              if (aktifMudurluk) excelQ.set('m', aktifMudurluk)
              const excel = `${EXCEL}?${excelQ}`
              return (
                <tr key={key} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.hedefKod ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-800">{b.hedefAd ?? b.hedef}</td>
                  <td className="px-4 py-3 text-slate-600">{b.programAdi}</td>
                  <td className="px-4 py-3 text-slate-600">{b.altProgramAdi}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{b.veriKaynagi || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <PpRaporGoz href={gor} />
                      <a
                        href={excel}
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
    </div>
  )
}
