'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpPerformansRaporYil } from '@/lib/pp-mudurluk-rapor'
import { ppNorm } from '@/lib/pp-erisim'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpRaporGoz from '@/components/stratejik/PpRaporGoz'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/idare-performans-bilgisi`
const EXCEL = '/api/performans-programi/raporlar/idare-performans/excel'

export default function PpIdarePerformansListeClient({
  rapor,
  secilenMudurluk,
}: {
  rapor: PpPerformansRaporYil
  secilenMudurluk: string
}) {
  const router = useRouter()
  const mudurlukler = rapor.sekmeler.map(s => s.mudurluk)
  const aktifMudurluk = mudurlukler.find(m => ppNorm(m) === ppNorm(secilenMudurluk))
    ?? mudurlukler[0]
    ?? ''
  const sekme = rapor.sekmeler.find(s => ppNorm(s.mudurluk) === ppNorm(aktifMudurluk))
  const tablolar = sekme?.bloklar ?? []

  function yilDegistir(y: string) {
    const q = new URLSearchParams()
    q.set('y', y)
    if (aktifMudurluk) q.set('m', aktifMudurluk)
    router.push(`${LISTE_YOL}?${q}`)
  }

  function mudurlukDegistir(m: string) {
    const q = new URLSearchParams()
    q.set('y', String(rapor.yil))
    if (m) q.set('m', m)
    router.push(`${LISTE_YOL}?${q}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">İdare Performans Bilgisi Tablosu</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Bütçe yılını seçer. Kayıt girişi yapmaz.' },
              { baslik: 'Müdürlük', metin: 'Hedef ekleme aşamasında seçilen müdürlüğe bağlı tabloları listeler.' },
              { baslik: 'Göz', metin: 'Seçilen performans hedefinin tablosunu açar.' },
              { baslik: 'İndir', metin: 'O hedefin Excel dosyasını indirir.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Her performans hedefi ayrı tablodur. Yıl ve müdürlük seçin; listeden göz ile bakın veya indirin.
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
            onChange={e => yilDegistir(e.target.value)}
            className="min-w-[7rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {rapor.yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700 min-w-[16rem] flex-1">
          <span className="mb-1 block font-medium">Müdürlük</span>
          <select
            value={aktifMudurluk}
            onChange={e => mudurlukDegistir(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={mudurlukler.length === 0}
          >
            {mudurlukler.length === 0 ? (
              <option value="">Bu yıl için müdürlük yok</option>
            ) : mudurlukler.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
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
              <th className="w-28 px-4 py-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tablolar.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Seçilen yıl ve müdürlük için performans hedefi yok.
                </td>
              </tr>
            ) : tablolar.map((b, i) => {
              const key = b.tabloKey ?? `${b.altProgramId}_${b.altHedefId}`
              const gor = `${LISTE_YOL}/${encodeURIComponent(key)}?y=${rapor.yil}&m=${encodeURIComponent(aktifMudurluk)}`
              const excel = `${EXCEL}?yil=${rapor.yil}&m=${encodeURIComponent(aktifMudurluk)}&ap=${b.altProgramId}&ah=${b.altHedefId}`
              return (
                <tr key={key} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.hedefKod ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-800">{b.hedefAd ?? b.hedef}</td>
                  <td className="px-4 py-3 text-slate-600">{b.programAdi}</td>
                  <td className="px-4 py-3 text-slate-600">{b.altProgramAdi}</td>
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
