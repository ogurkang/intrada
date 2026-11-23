'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpMudurlukProgramRapor } from '@/lib/pp-mudurluk-program-rapor'
import { ppNorm } from '@/lib/pp-erisim'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpMudurlukProgramTablo from '@/components/stratejik/PpMudurlukProgramTablo'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/mudurluklerin-performans-programi`
const EXCEL = '/api/performans-programi/raporlar/mudurluk-performans/excel'

export default function PpMudurlukPerformansClient({
  rapor,
  secilenMudurluk,
}: {
  rapor: PpMudurlukProgramRapor
  secilenMudurluk: string
}) {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)
  const mudurlukler = useMemo(() => rapor.sekmeler.map(s => s.mudurluk), [rapor.sekmeler])

  const mudurlukAktif = Boolean(secilenMudurluk)
    && mudurlukler.some(m => ppNorm(m) === ppNorm(secilenMudurluk))
  const aktifMudurluk = mudurlukAktif
    ? (mudurlukler.find(m => ppNorm(m) === ppNorm(secilenMudurluk)) ?? '')
    : ''
  const aktif = aktifMudurluk
    ? rapor.sekmeler.find(s => ppNorm(s.mudurluk) === ppNorm(aktifMudurluk))
    : undefined

  useEffect(() => {
    setYukleniyor(false)
  }, [rapor.yil, aktifMudurluk])

  function git(opts: { y?: string; m?: string }) {
    setYukleniyor(true)
    const q = new URLSearchParams()
    q.set('y', opts.y ?? String(rapor.yil))
    const m = opts.m !== undefined ? opts.m : aktifMudurluk
    if (m) q.set('m', m)
    router.push(`${LISTE_YOL}?${q}`)
  }

  const excel = aktif
    ? `${EXCEL}?yil=${rapor.yil}&m=${encodeURIComponent(aktif.mudurluk)}`
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
            <h1 className="text-2xl font-bold text-slate-800">Müdürlüklerin Performans Programı Tablosu</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Raporun bütçe yılını değiştirir. Kayıt girişi yapmaz.' },
              { baslik: 'Müdürlük', metin: 'Liste’den müdürlük seçince t6 hiyerarşik tablo açılır.' },
              { baslik: 'Hiyerarşi', metin: 'Stratejik Amaç → Program → Alt Program → Faaliyet → Stratejik Hedef → Müdürlük → Performans Hedefi → Performans Faaliyeti → Gösterge / BÜTÇE.' },
              { baslik: 'Excel İndir', metin: 'Seçili müdürlüğün tablosunu t6 şablon düzeniyle indirir.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Yıl ve müdürlük seçerek tabloyu görüntüleyin veya Excel indirin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={PP_RAPORLAR_BASE}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ← Raporlar
          </Link>
          {aktif ? (
            <a
              href={excel}
              className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Excel İndir
            </a>
          ) : null}
        </div>
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
        <label className="text-sm text-slate-700 min-w-[16rem] flex-1">
          <span className="mb-1 block font-medium">Müdürlük</span>
          <select
            value={aktifMudurluk}
            onChange={e => git({ m: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={mudurlukler.length === 0}
          >
            <option value="">Seçiniz</option>
            {mudurlukler.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>

      {mudurlukler.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Bu yıl için bağlı müdürlük yok.
        </p>
      ) : !aktif ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Tabloyu görmek için Müdürlük seçin.
        </p>
      ) : (
        <PpMudurlukProgramTablo satirlar={aktif.satirlar} />
      )}
    </div>
  )
}
