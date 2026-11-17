'use client'

import { useMemo, useState, useTransition } from 'react'
import OranAdimi, { MiktarAlani, temizTutar } from '@/components/hesaplama/OranAdimi'
import { memurMaasKaydet } from '@/app/(dashboard)/hesaplama/memur-maas/actions'
import {
  bosOran,
  memurMaasEtkinTutar,
  memurMaasSatirAl,
  memurMaasSatirAnahtari,
  memurMaasYilEtiketleri,
  varsayilanMemurMaasBelge,
  yuzdeFromMiktar,
  type MemurMaasBelge,
  type MemurMaasDonem,
  type MemurMaasOdenek,
  type MemurMaasOran,
} from '@/lib/memur-maas-hesap'

type Props = {
  odenekler: MemurMaasOdenek[]
  mudurlukler: string[]
  unvanByMudurluk: Record<string, string[]>
  sunucuBelge: MemurMaasBelge | null
  tabloYok: boolean
}

export default function MemurMaasClient({
  odenekler,
  mudurlukler,
  unvanByMudurluk,
  sunucuBelge,
  tabloYok,
}: Props) {
  const [belge, setBelge] = useState<MemurMaasBelge>(
    () => sunucuBelge ?? varsayilanMemurMaasBelge(new Date().getFullYear()),
  )
  const [mudurluk, setMudurluk] = useState(mudurlukler[0] ?? '')
  const unvanlar = useMemo(
    () => (mudurluk ? unvanByMudurluk[mudurluk] ?? [] : []),
    [mudurluk, unvanByMudurluk],
  )
  const [unvan, setUnvan] = useState(unvanlar[0] ?? '')
  const [mesaj, setMesaj] = useState<string | null>(
    tabloYok ? 'Kayıt tablosu henüz yok; senaryo oturumda tutulur. SQL migration’ı uygulayınca Kaydet çalışır.' : null,
  )
  const [pending, startTransition] = useTransition()

  const yillar = memurMaasYilEtiketleri(belge.cari_yil)

  // Müdürlük değişince ilk unvana geç
  function mudurlukSec(m: string) {
    setMudurluk(m)
    const liste = unvanByMudurluk[m] ?? []
    setUnvan(liste[0] ?? '')
  }

  function satirYaz(odenekId: number, patch: Partial<{ taban: number; oran: Partial<MemurMaasOran> }>) {
    if (!mudurluk || !unvan) return
    const key = memurMaasSatirAnahtari(mudurluk, unvan, odenekId)
    const once = memurMaasSatirAl(belge, mudurluk, unvan, odenekId)
    const sonraki = {
      taban: patch.taban ?? once.taban,
      oran: { ...once.oran, ...(patch.oran ?? {}) },
    }
    setBelge({
      ...belge,
      satirlar: { ...belge.satirlar, [key]: sonraki },
    })
  }

  function oranYaz(odenekId: number, alan: keyof MemurMaasOran, deger: number) {
    satirYaz(odenekId, { oran: { [alan]: deger } })
  }

  function miktarYaz(odenekId: number, donem: Exclude<MemurMaasDonem, 'cari'>, miktar: number) {
    const s = memurMaasSatirAl(belge, mudurluk, unvan, odenekId)
    const baz =
      donem === 'yil1'
        ? s.taban
        : donem === 'yil2'
          ? memurMaasEtkinTutar(s.taban, s.oran, 'yil1')
          : memurMaasEtkinTutar(s.taban, s.oran, 'yil2')
    const yuzdeDeger = yuzdeFromMiktar(baz, miktar)
    if (yuzdeDeger == null) {
      setMesaj('Cari yıl tutarı sıfır olduğu için yüzde hesaplanamaz. Önce cari yıl tutarını girin.')
      return
    }
    setMesaj(null)
    oranYaz(odenekId, donem, yuzdeDeger)
  }

  function sifirlaOranlar() {
    if (!mudurluk || !unvan) return
    const satirlar = { ...belge.satirlar }
    for (const o of odenekler) {
      const key = memurMaasSatirAnahtari(mudurluk, unvan, o.id)
      const once = satirlar[key]
      satirlar[key] = { taban: once?.taban ?? 0, oran: bosOran() }
    }
    setBelge({ ...belge, satirlar })
    setMesaj('Seçili unvan için artış oranları sıfırlandı.')
  }

  function kaydet() {
    startTransition(async () => {
      const sonuc = await memurMaasKaydet(belge)
      if (sonuc.hata === 'tablo-yok') {
        setMesaj('Kayıt tablosu yok. Supabase’te migration’ı çalıştırın.')
        return
      }
      if (sonuc.hata) {
        setMesaj(sonuc.hata)
        return
      }
      setMesaj('Senaryo kaydedildi.')
    })
  }

  const toplamCari = useMemo(() => {
    if (!mudurluk || !unvan) return 0
    return odenekler.reduce((t, o) => t + memurMaasSatirAl(belge, mudurluk, unvan, o.id).taban, 0)
  }, [belge, mudurluk, unvan, odenekler])

  const toplamYil = useMemo(() => {
    if (!mudurluk || !unvan) return { yil1: 0, yil2: 0, yil3: 0 }
    let yil1 = 0
    let yil2 = 0
    let yil3 = 0
    for (const o of odenekler) {
      const s = memurMaasSatirAl(belge, mudurluk, unvan, o.id)
      yil1 += memurMaasEtkinTutar(s.taban, s.oran, 'yil1')
      yil2 += memurMaasEtkinTutar(s.taban, s.oran, 'yil2')
      yil3 += memurMaasEtkinTutar(s.taban, s.oran, 'yil3')
    }
    return { yil1, yil2, yil3 }
  }, [belge, mudurluk, unvan, odenekler])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-slate-800">Memur Maaş Hesaplama</h1>
          <p className="mt-1 text-sm text-slate-600">
            Performans programı bütçe kodlarında 1. düzeyi 01 ve 02 olan ödenekler. Müdürlük ve unvan seçerek
            cari yıl tutarını girin; sonraki yıllarda yüzde veya tutar ile zincirleme artışı görün.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={sifirlaOranlar}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Oranları sıfırla
          </button>
          <button
            type="button"
            onClick={kaydet}
            disabled={pending}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {mesaj ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{mesaj}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Müdürlük</span>
          <select
            value={mudurluk}
            onChange={e => mudurlukSec(e.target.value)}
            className="min-w-[18rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {mudurlukler.length === 0 ? <option value="">Müdürlük yok</option> : null}
            {mudurlukler.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-slate-500 pb-2">
          Cari yıl: <span className="font-medium text-slate-800">{yillar.cari}</span>
          {' · '}
          Ödenek: {odenekler.length}
        </p>
      </div>

      {!mudurluk ? (
        <p className="text-sm text-slate-400">Müdürlük seçin.</p>
      ) : unvanlar.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white border border-slate-200 rounded-xl px-4 py-8 text-center">
          Bu müdürlükte memur kadro unvanı bulunamadı.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
            {unvanlar.map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUnvan(u)}
                className={`rounded-t-lg px-3 py-2 text-sm ${
                  u === unvan
                    ? 'bg-white border border-b-white border-slate-200 font-semibold text-slate-800 -mb-px'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OzetKart baslik={`${yillar.cari} (cari)`} tutar={temizTutar(toplamCari)} />
            <OzetKart baslik={yillar.yil1} tutar={temizTutar(toplamYil.yil1)} vurgu />
            <OzetKart baslik={yillar.yil2} tutar={temizTutar(toplamYil.yil2)} />
            <OzetKart baslik={yillar.yil3} tutar={temizTutar(toplamYil.yil3)} />
          </section>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 min-w-[14rem]">Ödenek</th>
                  <th className="px-3 py-2">{yillar.cari}</th>
                  <th className="px-3 py-2">{yillar.yil1}</th>
                  <th className="px-3 py-2">{yillar.yil2}</th>
                  <th className="px-3 py-2">{yillar.yil3}</th>
                </tr>
              </thead>
              <tbody>
                {odenekler.map(o => {
                  const s = memurMaasSatirAl(belge, mudurluk, unvan, o.id)
                  return (
                    <tr key={o.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{o.hesap_adi}</div>
                        <div className="text-xs tabular-nums text-slate-500">{o.ekonomik_kod}</div>
                      </td>
                      <td className="px-3 py-3">
                        <MiktarAlani
                          deger={s.taban}
                          onCommit={n => {
                            setMesaj(null)
                            satirYaz(o.id, { taban: n })
                          }}
                          sonEk="TL"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <OranAdimi deger={s.oran.yil1} onChange={n => oranYaz(o.id, 'yil1', n)} />
                          <MiktarAlani
                            deger={memurMaasEtkinTutar(s.taban, s.oran, 'yil1')}
                            onCommit={n => miktarYaz(o.id, 'yil1', n)}
                            sonEk="TL"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <OranAdimi deger={s.oran.yil2} onChange={n => oranYaz(o.id, 'yil2', n)} />
                          <MiktarAlani
                            deger={memurMaasEtkinTutar(s.taban, s.oran, 'yil2')}
                            onCommit={n => miktarYaz(o.id, 'yil2', n)}
                            sonEk="TL"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <OranAdimi deger={s.oran.yil3} onChange={n => oranYaz(o.id, 'yil3', n)} />
                          <MiktarAlani
                            deger={memurMaasEtkinTutar(s.taban, s.oran, 'yil3')}
                            onCommit={n => miktarYaz(o.id, 'yil3', n)}
                            sonEk="TL"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {odenekler.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                      1. düzeyi 01 veya 02 olan ödenek bulunamadı.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function OzetKart({ baslik, tutar, vurgu }: { baslik: string; tutar: string; vurgu?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${vurgu ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{baslik}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{tutar} TL</p>
    </div>
  )
}
