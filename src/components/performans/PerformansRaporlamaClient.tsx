'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  performansEk2BantEtiket,
  type PerformansEk2Satir,
  type PerformansEk3Satir,
} from '@/lib/performans-ek3-rapor'
import type { PerformansDonemOzet } from '@/lib/performans-raporlama-yukle'

type Props = {
  donemler: PerformansDonemOzet[]
  seciliDonemId: number
  ek3FlatListe: PerformansEk3Satir[]
  mudurlukler: string[]
  ek2Satirlar: PerformansEk2Satir[]
  donemEtiket: string
  hayaletAktif?: boolean
}

export default function PerformansRaporlamaClient({
  donemler,
  seciliDonemId,
  ek3FlatListe,
  mudurlukler,
  ek2Satirlar,
  donemEtiket,
  hayaletAktif = false,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [seciliMudurluk, setSeciliMudurluk] = useState('')

  function donemDegistir(id: number) {
    const p = new URLSearchParams(searchParams?.toString() ?? '')
    p.set('donem_id', String(id))
    router.push(`/performans/raporlama?${p.toString()}`)
  }

  const filtreliEk3 = useMemo(() => {
    if (!seciliMudurluk) return ek3FlatListe
    return ek3FlatListe.filter(s => (s.mudurluk_adi ?? '') === seciliMudurluk)
  }, [ek3FlatListe, seciliMudurluk])

  const filtreliEk2 = useMemo(() => {
    if (!seciliMudurluk) return ek2Satirlar
    return ek2Satirlar.filter(s => (s.mudurluk_adi ?? '') === seciliMudurluk)
  }, [ek2Satirlar, seciliMudurluk])

  const gosterilenEk3 = useMemo(
    () => filtreliEk3.map((s, i) => ({ ...s, sira: i + 1 })),
    [filtreliEk3],
  )

  const excelHref = useMemo(() => {
    const p = new URLSearchParams({ donem_id: String(seciliDonemId) })
    if (seciliMudurluk) p.set('mudurluk', seciliMudurluk)
    return `/api/performans/raporlama/ek3/excel?${p.toString()}`
  }, [seciliDonemId, seciliMudurluk])

  const geriHref = hayaletAktif ? '/performans/degerlendirme' : '/performans'
  const geriMetin = hayaletAktif ? '← Değerlendirme' : '← Performans Yönetimi'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={geriHref}
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            {geriMetin}
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Raporlama</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tamamlanmış değerlendirmeler tek listede. Müdürlük filtresi ve Ek-2 düşük performans
            formları aşağıda.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-slate-500 mb-1">Dönem</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[160px]"
              value={seciliDonemId}
              onChange={e => donemDegistir(Number(e.target.value))}
            >
              {donemler.map(d => (
                <option key={d.id} value={d.id}>
                  {d.etiket} ({d.durum})
                </option>
              ))}
            </select>
          </label>
          {mudurlukler.length > 0 && (
            <label className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">Müdürlük</span>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[200px] max-w-[280px]"
                value={seciliMudurluk}
                onChange={e => setSeciliMudurluk(e.target.value)}
              >
                <option value="">Tüm müdürlükler</option>
                {mudurlukler.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
          {gosterilenEk3.length > 0 && (
            <a
              href={excelHref}
              className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600"
            >
              Ek-3 Excel İndir
            </a>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Ek-3 — Personel Değerlendirme Cetveli
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {donemEtiket} · {gosterilenEk3.length} kayıt
            {seciliMudurluk ? ` · ${seciliMudurluk}` : ''}
          </p>
        </div>

        {gosterilenEk3.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-400 text-sm">
            Bu dönemde görüntülenecek tamamlanmış değerlendirme yok.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <Ek3Tablo satirlar={gosterilenEk3} />
          </div>
        )}
      </section>

      {filtreliEk2.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Ek-2 — Performans Değerlendirme Sonuçları Formu
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ortalaması yetersiz veya çok yetersiz ({filtreliEk2.length} personel). İndirme
              özelliği sonraki adımda eklenecek.
            </p>
          </div>

          <div className="space-y-4">
            {filtreliEk2.map(s => (
              <Ek2Kart key={s.degerlendirme_id} satir={s} hayaletAktif={hayaletAktif} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Ek3Tablo({ satirlar }: { satirlar: PerformansEk3Satir[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-slate-600 text-xs">
        <tr>
          <th className="px-3 py-2 whitespace-nowrap">Sıra No</th>
          <th className="px-3 py-2 whitespace-nowrap">Sicil</th>
          <th className="px-3 py-2 whitespace-nowrap">Adı-Soyadı</th>
          <th className="px-3 py-2 whitespace-nowrap">Müdürlük</th>
          <th className="px-3 py-2 whitespace-nowrap">Ünvanı</th>
          <th className="px-3 py-2 whitespace-nowrap text-center">1. Amir Not Ort.</th>
          <th className="px-3 py-2 whitespace-nowrap text-center">2. Amir Not Ort.</th>
          <th className="px-3 py-2 whitespace-nowrap text-center">Genel Toplam Not Ort.</th>
          <th className="px-3 py-2 whitespace-nowrap">1. Amir</th>
          <th className="px-3 py-2 whitespace-nowrap">2. Amir</th>
        </tr>
      </thead>
      <tbody>
        {satirlar.map(s => (
          <tr key={s.degerlendirme_id} className="border-t border-slate-100">
            <td className="px-3 py-2 tabular-nums">{s.sira}</td>
            <td className="px-3 py-2 font-mono text-xs">{s.sicil_no}</td>
            <td className="px-3 py-2">{s.ad_soyad}</td>
            <td className="px-3 py-2 text-slate-600 text-xs">{s.mudurluk_adi ?? '—'}</td>
            <td className="px-3 py-2 text-slate-600">{s.unvan ?? '—'}</td>
            <td className="px-3 py-2 text-center tabular-nums">{s.puan_amir1 ?? '—'}</td>
            <td className="px-3 py-2 text-center tabular-nums">{s.puan_amir2 ?? '—'}</td>
            <td className="px-3 py-2 text-center tabular-nums font-medium">
              {s.ortalama ?? '—'}
            </td>
            <td className="px-3 py-2 text-xs text-slate-600">{s.amir1_ad ?? '—'}</td>
            <td className="px-3 py-2 text-xs text-slate-600">{s.amir2_ad ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Ek2Kart({
  satir,
  hayaletAktif,
}: {
  satir: PerformansEk2Satir
  hayaletAktif?: boolean
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800">Performans Değerlendirme Sonuç Formu</h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
          {performansEk2BantEtiket(satir.bant)} · Ort: {satir.ortalama}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <span className="text-slate-500">Adı Soyadı:</span>{' '}
          <span className="font-medium">{satir.ad_soyad}</span>
        </div>
        <div>
          <span className="text-slate-500">T.C. Kimlik No:</span>{' '}
          <span>{satir.tckn ?? '…………………'}</span>
        </div>
        <div>
          <span className="text-slate-500">Görevi:</span>{' '}
          <span>{satir.gorev ?? '…………………'}</span>
        </div>
        <div>
          <span className="text-slate-500">Statüsü:</span>{' '}
          <span>{satir.statu ?? '…………………'}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-slate-500">Müdürlük:</span>{' '}
          <span>{satir.mudurluk_adi ?? '—'}</span>
        </div>
      </div>

      <div className="text-sm flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" readOnly checked={satir.bant === 'cok_yetersiz'} />
          0–34 Çok Yetersiz
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" readOnly checked={satir.bant === 'yetersiz'} />
          35–59 Yetersiz
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm border-t border-amber-200/60 pt-3">
        <div>
          <p className="font-medium text-slate-700 mb-1">Değerlendirenler — 1. Amir</p>
          <p>{satir.amir1_ad ?? '…………………'}</p>
        </div>
        <div>
          <p className="font-medium text-slate-700 mb-1">2. Amir</p>
          <p>{satir.amir2_ad ?? '…………………'}</p>
        </div>
      </div>

      {!hayaletAktif && (
        <div className="text-right">
          <Link
            href={`/performans/degerlendirme/kayit/${satir.degerlendirme_id}?rol=amir2`}
            className="text-sm text-sky-700 hover:underline"
          >
            Değerlendirme kaydı →
          </Link>
        </div>
      )}
    </div>
  )
}
