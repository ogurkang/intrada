'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'
import { gorevYeriListeAyarKaydet } from '@/app/(dashboard)/rapor/gorev-yerine-gore-liste/actions'

interface Props {
  satirlar: GorevYerineGoreListeSatir[]
  tumSatirlar: GorevYerineGoreListeSatir[]
  seciliKeyler: string[]
  secilmeyenSatirlar?: GorevYerineGoreListeSatir[]
  anlikTarihEtiket: string
  aciklama: string
  excelHref?: string
}

export default function GorevYerineGoreListeClient({
  satirlar,
  tumSatirlar,
  seciliKeyler,
  anlikTarihEtiket,
  aciklama,
  excelHref,
}: Props) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [isPending, startTransition] = useTransition()
  const [filtre, setFiltre] = useState('')
  const [secilenArama, setSecilenArama] = useState('')
  const [kayitArama, setKayitArama] = useState('')
  const [seciliMudurlukler, setSeciliMudurlukler] = useState<string[]>([])
  const [seciliListKeyler, setSeciliListKeyler] = useState<string[]>(seciliKeyler)
  const [mesaj, setMesaj] = useState<string | null>(null)

  const mudurlukler = useMemo(() => {
    const s = new Set<string>()
    for (const r of tumSatirlar) {
      if (r.mudurluk.trim() && r.mudurluk !== '—') s.add(r.mudurluk)
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [tumSatirlar])

  const tumByKey = useMemo(() => new Map(tumSatirlar.map(s => [s.kayit_key, s] as const)), [tumSatirlar])
  const seciliSet = useMemo(() => new Set(seciliListKeyler), [seciliListKeyler])

  const kayitListesi = useMemo(() => {
    return seciliListKeyler.map(k => tumByKey.get(k)).filter((x): x is GorevYerineGoreListeSatir => !!x)
  }, [seciliListKeyler, tumByKey])

  const numarali = useMemo(() => {
    const q = filtre.trim().toLocaleLowerCase('tr-TR')
    const mudSet = seciliMudurlukler.length ? new Set(seciliMudurlukler) : null
    const list = q
      ? kayitListesi.filter(
          r =>
            (r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
              String(r.sicil_no ?? '')
              .toLocaleLowerCase('tr-TR')
              .includes(q)) &&
            (!mudSet || mudSet.has(r.mudurluk)),
        )
      : kayitListesi.filter(r => !mudSet || mudSet.has(r.mudurluk))
    return list.map((r, i) => ({ ...r, siraNo: i + 1 }))
  }, [kayitListesi, filtre, seciliMudurlukler])

  const solAdaylar = useMemo(() => {
    const q = kayitArama.trim().toLocaleLowerCase('tr-TR')
    const mudSet = seciliMudurlukler.length ? new Set(seciliMudurlukler) : null
    return tumSatirlar.filter(r => {
      if (seciliSet.has(r.kayit_key)) return false
      if (mudSet && !mudSet.has(r.mudurluk)) return false
      if (!q) return true
      return (
        r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        String(r.sicil_no ?? '').toLocaleLowerCase('tr-TR').includes(q)
      )
    })
  }, [tumSatirlar, seciliSet, kayitArama, seciliMudurlukler])

  const sagSecili = useMemo(
    () => seciliListKeyler.map(k => tumByKey.get(k)).filter((x): x is GorevYerineGoreListeSatir => !!x),
    [seciliListKeyler, tumByKey],
  )
  const secilenFiltreli = useMemo(() => {
    const q = secilenArama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return sagSecili
    return sagSecili.filter(
      r =>
        r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        String(r.sicil_no ?? '').toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [sagSecili, secilenArama])

  const excelMud = seciliMudurlukler.length ? `?m=${encodeURIComponent(seciliMudurlukler.join(','))}` : ''

  function sagaEkle(kayitKey: string) {
    setSeciliListKeyler(prev => (prev.includes(kayitKey) ? prev : [...prev, kayitKey]))
  }

  function soldanCikar(kayitKey: string) {
    setSeciliListKeyler(prev => prev.filter(k => k !== kayitKey))
  }

  function ayarKaydet() {
    setMesaj(null)
    startTransition(async () => {
      const res = await gorevYeriListeAyarKaydet(seciliListKeyler)
      if (res.hata) {
        setMesaj(res.hata)
        return
      }
      setMesaj('Liste ayarı kaydedildi.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-3xl">
          <Link
            href="/rapor"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Görev Yerine Göre Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{aciklama}</p>
          <p className="text-xs text-slate-500 mt-2">Anlık görüntü: {anlikTarihEtiket}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'liste' ? 'bg-white shadow' : ''}`} onClick={() => setSekme('liste')}>
              Kayıt Listesi
            </button>
            <button className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'toplu' ? 'bg-white shadow' : ''}`} onClick={() => setSekme('toplu')}>
              Toplu Güncelle
            </button>
          </div>
          <details className="relative">
            <summary className="list-none cursor-pointer px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
              Müdürlük {seciliMudurlukler.length ? `(${seciliMudurlukler.length})` : '(Tümü)'}
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-72 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">Checkbox ile seçiniz</p>
                <button
                  type="button"
                  onClick={() => setSeciliMudurlukler([])}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Temizle
                </button>
              </div>
              <div className="space-y-1.5">
                {mudurlukler.map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={seciliMudurlukler.includes(m)}
                      onChange={e =>
                        setSeciliMudurlukler(prev =>
                          e.target.checked ? Array.from(new Set([...prev, m])) : prev.filter(x => x !== m),
                        )
                      }
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
          </details>
          {excelHref && (
            <Link
              href={`${excelHref}${excelMud}`}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Excel İndir
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">Ara (ad veya sicil)</label>
        <input
          type="search"
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          placeholder="Filtrele…"
          className="min-w-[220px] max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <span className="text-xs text-slate-500">
          {numarali.length} / {kayitListesi.length} kayıt
        </span>
      </div>

      {sekme === 'toplu' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="text-sm text-slate-600">Soldaki Personel Listesi kaynaktır. İsme tıklayarak sağdaki Kayıt Listesi (Görev Yerine Göre Personel Listesi sıralaması) içine ekleyin; sağdaki isme tıklayarak geri çıkarın.</div>
          {mesaj && <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{mesaj}</p>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="border border-slate-200 rounded-lg">
              <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-700">Personel Listesi ({solAdaylar.length})</div>
              <div className="p-2 border-b">
                <input
                  type="search"
                  value={kayitArama}
                  onChange={e => setKayitArama(e.target.value)}
                  placeholder="Ad veya sicil ara…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="max-h-[420px] overflow-auto p-2 space-y-1">
                {solAdaylar.map(r => (
                  <button
                    type="button"
                    key={r.kayit_key}
                    onClick={() => sagaEkle(r.kayit_key)}
                    className="w-full text-left text-sm p-2 hover:bg-slate-50 rounded"
                  >
                    {r.ad_soyad} <span className="text-slate-500">({r.mudurluk})</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg">
              <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-700">Kayıt Listesi ({sagSecili.length})</div>
              <div className="p-2 border-b">
                <input
                  type="search"
                  value={secilenArama}
                  onChange={e => setSecilenArama(e.target.value)}
                  placeholder="Ad veya sicil ara…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="max-h-[420px] overflow-auto p-2 space-y-1">
                {secilenFiltreli.map(r => (
                  <button
                    type="button"
                    key={r.kayit_key}
                    onClick={() => soldanCikar(r.kayit_key)}
                    className="w-full text-left text-sm p-2 hover:bg-slate-50 rounded"
                  >
                    {r.ad_soyad} <span className="text-slate-500">({r.mudurluk})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button onClick={ayarKaydet} disabled={isPending} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap w-14">Sıra No</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[160px]">Adı Soyadı</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Konum</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Cinsiyet</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[140px]">Unvanı</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[120px]">Statü</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[160px]">Fiili Görevi</th>
              </tr>
            </thead>
            <tbody>
              {numarali.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Kayıt yok veya filtreye uyan satır yok.</td>
                </tr>
              ) : (
                numarali.map(r => (
                  <tr key={`${r.kayit_key}-${r.siraNo}`} className="border-b border-slate-100">
                    <td className="px-3 py-2.5 tabular-nums text-slate-600">{r.siraNo}</td>
                    <td className="px-3 py-2.5 text-slate-900 font-medium">{r.ad_soyad}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.konum}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.cinsiyet}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.unvan}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.statu}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.fiili_gorev}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
