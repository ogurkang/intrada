'use client'

import { useMemo, useState } from 'react'
import { trNormalize } from '@/lib/turkce-search'
import type { PersonelKazancBilgiKart } from '@/lib/personel-kazanc-bilgi'

interface Props {
  kartlar: PersonelKazancBilgiKart[]
}

function metin(v: string | null | undefined): string {
  const t = String(v ?? '').trim()
  return t || '—'
}

function dk(d: string | null | undefined, k: string | null | undefined): string {
  if (!d && !k) return '—'
  return `${metin(d)}/${metin(k)}`
}

function Alan({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{etiket}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{deger}</p>
    </div>
  )
}

function UnvanFiltre({
  options,
  selected,
  onToggle,
  onClear,
}: {
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  onClear: () => void
}) {
  const [arama, setArama] = useState('')
  const aktif = selected.length > 0
  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return options
    return options.filter(v => trNormalize(v).includes(q))
  }, [options, arama])

  return (
    <details className="relative inline-block">
      <summary className="list-none cursor-pointer inline-flex items-center gap-2 text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white hover:bg-slate-50">
        Unvan filtresi
        {aktif ? (
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">
            {selected.length}
          </span>
        ) : null}
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-[min(26rem,calc(100vw-2rem))] min-w-[18rem] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-slate-700">Unvan seç</p>
          <button
            type="button"
            onClick={e => {
              e.preventDefault()
              onClear()
            }}
            className="text-[11px] text-slate-500 hover:text-slate-800"
          >
            Temizle
          </button>
        </div>
        <div className="mb-2 px-1">
          <input
            type="text"
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Unvan ara…"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="max-h-64 overflow-auto pr-1">
          {filtreli.map(v => (
            <label key={v} className="flex items-start gap-2 rounded px-1 py-1 text-xs text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(v)}
                onChange={() => onToggle(v)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
              />
              <span className="leading-4">{v}</span>
            </label>
          ))}
          {filtreli.length === 0 && (
            <p className="px-1 py-2 text-xs text-slate-400">Eşleşen unvan yok.</p>
          )}
        </div>
      </div>
    </details>
  )
}

export default function PersonelKazancBilgiClient({ kartlar }: Props) {
  const [arama, setArama] = useState('')
  const [unvanFiltre, setUnvanFiltre] = useState<string[]>([])
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false)
  const [pdfHata, setPdfHata] = useState<string | null>(null)

  const unvanSecenekleri = useMemo(() => {
    const set = new Set<string>()
    for (const k of kartlar) {
      for (const u of k.unvanlar) set.add(u)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [kartlar])

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    return kartlar.filter(k => {
      if (unvanFiltre.length > 0 && !k.unvanlar.some(u => unvanFiltre.includes(u))) return false
      if (!q) return true
      return trNormalize(
        `${k.sicil_no} ${k.ad_soyad} ${k.asilUnvan ?? ''} ${k.vekilUnvanlar.join(' ')}`,
      ).includes(q)
    })
  }, [kartlar, arama, unvanFiltre])

  async function pdfIndir() {
    setPdfHata(null)
    if (!filtreli.length) {
      setPdfHata('İndirilecek personel yok.')
      return
    }
    setPdfYukleniyor(true)
    try {
      const res = await fetch('/api/personel/kazanc-bilgileri/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siciller: filtreli.map(k => k.sicil_no) }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(j?.error || 'PDF oluşturulamadı.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Personel_Kazanc_Bilgileri.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setPdfHata(e instanceof Error ? e.message : 'PDF oluşturulamadı.')
    } finally {
      setPdfYukleniyor(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Personel Kazanç Bilgileri</h1>
        <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
          Unvanında «müdürü» geçen asil / vekil personel ile memur Belediye Başkan Yardımcılarının kadro,
          terfi ve kazanç mevzuat bilgileri.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Sicil, ad soyad veya unvan ara…"
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 min-w-[18rem]"
        />
        <UnvanFiltre
          options={unvanSecenekleri}
          selected={unvanFiltre}
          onToggle={v =>
            setUnvanFiltre(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]))
          }
          onClear={() => setUnvanFiltre([])}
        />
        <button
          type="button"
          onClick={pdfIndir}
          disabled={pdfYukleniyor || filtreli.length === 0}
          className="text-sm rounded-lg px-3 py-2 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pdfYukleniyor ? 'PDF hazırlanıyor…' : 'PDF indir'}
        </button>
        <span className="text-sm text-slate-500">{filtreli.length} personel</span>
        {pdfHata ? <span className="text-sm text-red-600">{pdfHata}</span> : null}
      </div>

      <div className="space-y-4">
        {filtreli.length === 0 && (
          <p className="text-sm text-slate-400 bg-white border border-slate-200 rounded-xl px-4 py-10 text-center">
            Aramaya veya unvan filtresine uyan personel yok.
          </p>
        )}
        {filtreli.map(k => (
          <article key={k.sicil_no} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <header className="mb-4 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 tabular-nums">{k.sicil_no}</p>
              <h2 className="text-lg font-semibold text-slate-800">{k.ad_soyad}</h2>
              {k.ogrenim ? <p className="text-xs text-slate-500 mt-0.5">{k.ogrenim}</p> : null}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <p>
                  <span className="text-slate-500">Asil unvan:</span>{' '}
                  <span className="font-medium text-slate-800">{k.asilUnvan ?? '—'}</span>
                </p>
                <p>
                  <span className="text-slate-500">Vekil unvan:</span>{' '}
                  <span className="font-medium text-slate-800">
                    {k.vekilUnvanlar.length ? k.vekilUnvanlar.join(', ') : '—'}
                  </span>
                </p>
              </div>
            </header>

            <section className="mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Kadro Bilgileri</h3>
              {k.kadrolar.length === 0 ? (
                <p className="text-sm text-slate-400">Kadro kaydı yok.</p>
              ) : (
                <div className="space-y-3">
                  {k.kadrolar.map((kd, i) => (
                    <div
                      key={`${k.sicil_no}-kadro-${i}`}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        {kd.rol} kadro
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Alan etiket="Kadro Sıra No" deger={metin(kd.kadro_sira_no)} />
                        <Alan etiket="Kadro Ünvanı" deger={metin(kd.kadro_unvani)} />
                        <Alan etiket="Görev Ünvanı" deger={metin(kd.gorev_unvani)} />
                        <Alan etiket="Kadro Müdürlüğü" deger={metin(kd.kadro_mudurlugu)} />
                        <Alan etiket="Görev Müdürlüğü" deger={metin(kd.gorev_mudurlugu)} />
                        <Alan etiket="Statü" deger={metin(kd.statu)} />
                        <Alan etiket="Kadro Derecesi" deger={metin(kd.kadro_derecesi)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Terfi Bilgileri</h3>
              {k.terfiler.length === 0 ? (
                <p className="text-sm text-slate-400">Terfi kaydı yok.</p>
              ) : (
                <div className="space-y-3">
                  {k.terfiler.map((t, i) => (
                    <div
                      key={`${k.sicil_no}-terfi-${i}`}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        {t.rol}
                        {t.unvan_adi ? ` · ${t.unvan_adi}` : ''}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Alan etiket="Kadro Derecesi" deger={metin(t.kadro_derecesi)} />
                        <Alan etiket="Görev Aylığı" deger={dk(t.gorev_ayligi_derece, t.gorev_ayligi_kademe)} />
                        <Alan etiket="KHA" deger={`${dk(t.kha_derece, t.kha_kademe)} · ${metin(t.kha_tarihi)}`} />
                        <Alan etiket="EKEA" deger={`${dk(t.ekea_derece, t.ekea_kademe)} · ${metin(t.ekea_tarihi)}`} />
                        <Alan etiket="Kıdem" deger={`${metin(t.kidem_yili)} yıl · ${metin(t.kidem_tarihi)}`} />
                        <Alan etiket="İyi Hal" deger={metin(t.iyi_hal_terfi_tarihi)} />
                        <Alan etiket="Ek Gösterge" deger={metin(t.ek_gosterge)} />
                        <Alan etiket="Ek Ödeme" deger={metin(t.ek_odeme)} />
                        <Alan etiket="ÖHT" deger={metin(t.oht)} />
                        <Alan etiket="Yan Ödeme" deger={metin(t.yan_odeme)} />
                        <Alan etiket="SDS" deger={metin(t.sds_orani)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Mevzuat Hükümleri</h3>
              <dl className="space-y-3">
                {k.mevzuat.map(kalem => (
                  <div key={kalem.baslik} className="grid grid-cols-1 md:grid-cols-[9rem_1fr] gap-1 md:gap-4">
                    <dt className="text-sm font-semibold text-slate-700 pt-0.5">{kalem.baslik}</dt>
                    <dd className="text-sm text-slate-600 leading-relaxed">{kalem.aciklama}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </article>
        ))}
      </div>
    </div>
  )
}
