'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  adreseGorePersonelListeFiltrele,
  type AdreseGorePersonelListeSatir,
} from '@/lib/rapor-adrese-gore-personel-liste'

export interface AdreseGorePersonelListeTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: AdreseGorePersonelListeSatir[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: AdreseGorePersonelListeTabVerisi[]
  initialIl: string
  initialIlce: string
  initialMahalle: string
  raporBasePath: string
  excelBasePath?: string
  baslik: string
  aciklama: string
}

function benzersizSirali(values: string[]): string[] {
  return [...new Set(values.filter(v => v && v !== '—'))].sort((a, b) => a.localeCompare(b, 'tr'))
}

export default function AdreseGorePersonelListeRaporClient({
  yil,
  minYil,
  maxYil,
  tabs,
  initialIl,
  initialIlce,
  initialMahalle,
  raporBasePath,
  excelBasePath,
  baslik,
  aciklama,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const [il, setIl] = useState(initialIl)
  const [ilce, setIlce] = useState(initialIlce)
  const [mahalle, setMahalle] = useState(initialMahalle)
  const aktif = tabs[sekmeIndex]

  const ilSecenekleri = useMemo(
    () => (aktif ? benzersizSirali(aktif.satirlar.map(s => s.il)) : []),
    [aktif],
  )
  const ilceSecenekleri = useMemo(() => {
    if (!aktif || !il) return []
    return benzersizSirali(
      aktif.satirlar.filter(s => s.il === il).map(s => s.ilce),
    )
  }, [aktif, il])
  const mahalleSecenekleri = useMemo(() => {
    if (!aktif || !il || !ilce) return []
    return benzersizSirali(
      aktif.satirlar.filter(s => s.il === il && s.ilce === ilce).map(s => s.mahalle),
    )
  }, [aktif, il, ilce])

  const gorunenSatirlar = useMemo(() => {
    if (!aktif) return []
    return adreseGorePersonelListeFiltrele(aktif.satirlar, { il, ilce, mahalle })
  }, [aktif, il, ilce, mahalle])

  const yilDegistir = useCallback(
    (y: number) => {
      const params = new URLSearchParams()
      params.set('y', String(y))
      if (il) params.set('il', il)
      if (ilce) params.set('ilce', ilce)
      if (mahalle) params.set('mahalle', mahalle)
      router.push(`${raporBasePath}?${params.toString()}`)
    },
    [router, raporBasePath, il, ilce, mahalle],
  )

  const filtreSifirla = useCallback(() => {
    setIl('')
    setIlce('')
    setMahalle('')
  }, [])

  const excelHref = useMemo(() => {
    if (!aktif || !excelBasePath) return null
    const params = new URLSearchParams()
    params.set('y', String(yil))
    params.set('p', aktif.periyot === 'yillik' ? 'yillik' : String(aktif.periyot))
    if (il) params.set('il', il)
    if (ilce) params.set('ilce', ilce)
    if (mahalle) params.set('mahalle', mahalle)
    return `${excelBasePath}?${params.toString()}`
  }, [aktif, excelBasePath, yil, il, ilce, mahalle])

  const filtreAktif = Boolean(il || ilce || mahalle)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-3xl">
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-600 mt-1">{aciklama}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          {excelHref && (
            <Link
              href={excelHref}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Excel İndir ({aktif?.label})
            </Link>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
            <select
              value={yil}
              onChange={e => yilDegistir(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              {Array.from({ length: maxYil - minYil + 1 }, (_, i) => minYil + i).map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">İl</label>
            <select
              value={il}
              onChange={e => {
                setIl(e.target.value)
                setIlce('')
                setMahalle('')
              }}
              className="min-w-[160px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Tümü</option>
              {ilSecenekleri.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">İlçe</label>
            <select
              value={ilce}
              disabled={!il}
              onChange={e => {
                setIlce(e.target.value)
                setMahalle('')
              }}
              className="min-w-[160px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
            >
              <option value="">{il ? 'Tümü' : 'Önce il seçin'}</option>
              {ilceSecenekleri.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Mahalle</label>
            <select
              value={mahalle}
              disabled={!il || !ilce}
              onChange={e => setMahalle(e.target.value)}
              className="min-w-[180px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
            >
              <option value="">{il && ilce ? 'Tümü' : 'Önce ilçe seçin'}</option>
              {mahalleSecenekleri.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          {filtreAktif && (
            <button
              type="button"
              onClick={filtreSifirla}
              className="px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" aria-label="Dönem sekmeleri">
          {tabs.map((t, i) => (
            <button
              key={`${t.label}-${i}`}
              type="button"
              onClick={() => setSekmeIndex(i)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                sekmeIndex === i
                  ? 'border-teal-600 text-teal-800 bg-teal-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {aktif && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Anlık görüntü tarihi: <strong className="text-slate-700">{aktif.sonGunuEtiket}</strong>
            </p>
            <p className="text-xs text-slate-500">
              Listelenen personel: <strong className="text-slate-700">{gorunenSatirlar.length}</strong>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-16">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-28">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[180px]">Adı Soyadı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[140px]">Görev Unvanı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-28">İl</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">İlçe</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[140px]">Mahalle</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[220px]">Açık Adres</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gorunenSatirlar.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        Bu dönem ve filtre için kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    gorunenSatirlar.map((row, i) => (
                      <tr key={`${row.sicil_no}-${row.ad_soyad}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.sicil_no}</td>
                        <td className="px-4 py-2.5 text-slate-800">{row.ad_soyad}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.gorev_unvani}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.il}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.ilce}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.mahalle}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-normal break-words">{row.adres}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
