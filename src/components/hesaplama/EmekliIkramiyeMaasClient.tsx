'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  emekliIkramiyeKaydet,
  emekliIkramiyeKisiGetir,
  type EmekliIkramiyeKaydetGirdi,
} from '@/app/(dashboard)/hesaplama/emekli-ikramiye-maas/actions'
import type { HesaplamaAday } from '@/lib/hesaplama-personel'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import {
  EMEKLI_IKRAMIYE_UYARI,
  EMEKLI_KATSAYI_DONEMLERI,
  emekliIkramiyeMaasHesapla,
  type EmekliKanun,
} from '@/lib/emekli-ikramiye-maas-hesap'

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500'

function sayiEsnek(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return null
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export type EmekliIkramiyeFormBaslangic = {
  id?: number
  sicil: string
  ad: string
  tckn: string
  unvan: string
  kanun: EmekliKanun
  derece: string
  kademe: string
  ekGosterge: string
  kadTazEkGosterge: string
  kidemYili: string
  hizmetYil: string
  hizmetAy: string
  hizmetGun: string
  ikramiyeYili: string
  makamTemsilGorevGosterge: string
  donemId: string
  pay: string
  payda: string
}

export default function EmekliIkramiyeMaasClient({
  adaylar,
  baslangic,
}: {
  adaylar: HesaplamaAday[]
  baslangic?: EmekliIkramiyeFormBaslangic
}) {
  const router = useRouter()
  const varsayilanDonem = EMEKLI_KATSAYI_DONEMLERI[0]?.id ?? '2026-07-01'
  const [arama, setArama] = useState('')
  const [acik, setAcik] = useState(false)
  const [ad, setAd] = useState(baslangic?.ad ?? '')
  const [sicil, setSicil] = useState(baslangic?.sicil ?? '')
  const [tckn, setTckn] = useState(baslangic?.tckn ?? '')
  const [unvan, setUnvan] = useState(baslangic?.unvan ?? '')
  const [kanun, setKanun] = useState<EmekliKanun>(baslangic?.kanun ?? '5434')
  const [derece, setDerece] = useState(baslangic?.derece ?? '1')
  const [kademe, setKademe] = useState(baslangic?.kademe ?? '4')
  const [ekGosterge, setEkGosterge] = useState(baslangic?.ekGosterge ?? '0')
  const [kadTaz, setKadTaz] = useState(baslangic?.kadTazEkGosterge ?? '0')
  const [kidemYili, setKidemYili] = useState(baslangic?.kidemYili ?? '1')
  const [hizmetYil, setHizmetYil] = useState(baslangic?.hizmetYil ?? '25')
  const [hizmetAy, setHizmetAy] = useState(baslangic?.hizmetAy ?? '0')
  const [hizmetGun, setHizmetGun] = useState(baslangic?.hizmetGun ?? '0')
  const [ikramiyeYili, setIkramiyeYili] = useState(baslangic?.ikramiyeYili ?? '25')
  const [makam, setMakam] = useState(baslangic?.makamTemsilGorevGosterge ?? '0')
  const [donemId, setDonemId] = useState(baslangic?.donemId ?? varsayilanDonem)
  const [pay, setPay] = useState(baslangic?.pay ?? '1')
  const [payda, setPayda] = useState(baslangic?.payda ?? '1')
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [kisiUyari, setKisiUyari] = useState<string | null>(null)

  const filtre = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (q.length < 2) return []
    return adaylar
      .filter(
        a =>
          a.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
          a.sicil_no.toLocaleLowerCase('tr-TR').includes(q),
      )
      .slice(0, 12)
  }, [adaylar, arama])

  const onizleme = useMemo(() => {
    const d = Number(derece)
    const k = Number(kademe)
    const eg = sayiEsnek(ekGosterge)
    const kt = sayiEsnek(kadTaz)
    const ky = sayiEsnek(kidemYili)
    const hy = sayiEsnek(hizmetYil)
    const ha = sayiEsnek(hizmetAy)
    const hg = sayiEsnek(hizmetGun)
    const iy = sayiEsnek(ikramiyeYili)
    const mg = sayiEsnek(makam)
    const p = sayiEsnek(pay)
    const pd = sayiEsnek(payda)
    if (
      eg == null ||
      kt == null ||
      ky == null ||
      hy == null ||
      ha == null ||
      hg == null ||
      iy == null ||
      mg == null ||
      p == null ||
      pd == null
    ) {
      return null
    }
    const s = emekliIkramiyeMaasHesapla({
      kanun,
      derece: d,
      kademe: k,
      ekGosterge: eg,
      kadTazEkGosterge: kt,
      kidemYili: ky,
      hizmetYil: hy,
      hizmetAy: ha,
      hizmetGun: hg,
      ikramiyeYili: iy,
      makamTemsilGorevGosterge: mg,
      donemId,
      pay: p,
      payda: pd,
    })
    return 'hata' in s ? { hata: s.hata } : { sonuc: s }
  }, [
    kanun,
    derece,
    kademe,
    ekGosterge,
    kadTaz,
    kidemYili,
    hizmetYil,
    hizmetAy,
    hizmetGun,
    ikramiyeYili,
    makam,
    donemId,
    pay,
    payda,
  ])

  async function sec(aday: HesaplamaAday) {
    setAcik(false)
    setArama('')
    setHata(null)
    setYukleniyor(true)
    const sonuc = await emekliIkramiyeKisiGetir(aday.sicil_no)
    setYukleniyor(false)
    if (sonuc.hata || !sonuc.kisi) {
      setHata(sonuc.hata ?? 'Personel okunamadı.')
      return
    }
    const k = sonuc.kisi
    setAd(k.ad_soyad)
    setSicil(k.sicil_no)
    setTckn(k.tckn)
    setUnvan(k.unvan || aday.unvan)
    setDerece(String(k.derece))
    setKademe(String(k.kademe))
    setEkGosterge(String(k.ekGosterge))
    setKadTaz('0')
    setKidemYili(String(k.kidemYili))
    setHizmetYil(String(k.hizmetYil))
    setHizmetAy(String(k.hizmetAy))
    setHizmetGun(String(k.hizmetGun))
    setIkramiyeYili(String(k.hizmetYil))
    setKisiUyari(k.uyari)
  }

  async function kaydet() {
    setHata(null)
    if (!sicil || !ad) {
      setHata('Personel seçin.')
      return
    }
    const girdi: EmekliIkramiyeKaydetGirdi = {
      id: baslangic?.id,
      sicil_no: sicil,
      ad_soyad: ad,
      tckn,
      unvan,
      kanun,
      derece: Number(derece),
      kademe: Number(kademe),
      ekGosterge: sayiEsnek(ekGosterge) ?? -1,
      kadTazEkGosterge: sayiEsnek(kadTaz) ?? -1,
      kidemYili: sayiEsnek(kidemYili) ?? -1,
      hizmetYil: sayiEsnek(hizmetYil) ?? -1,
      hizmetAy: sayiEsnek(hizmetAy) ?? -1,
      hizmetGun: sayiEsnek(hizmetGun) ?? -1,
      ikramiyeYili: sayiEsnek(ikramiyeYili) ?? -1,
      makamTemsilGorevGosterge: sayiEsnek(makam) ?? -1,
      donemId,
      pay: sayiEsnek(pay) ?? 1,
      payda: sayiEsnek(payda) ?? 1,
    }
    setKaydediliyor(true)
    const res = await emekliIkramiyeKaydet(girdi)
    setKaydediliyor(false)
    if (res.hata) {
      setHata(res.hata)
      return
    }
    router.push(`/hesaplama/emekli-ikramiye-maas/${res.id}`)
    router.refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="relative">
          <label className="block text-xs font-medium text-slate-600 mb-1">Personel ara</label>
          <input
            className={inputSinif}
            value={arama}
            onChange={e => {
              setArama(e.target.value)
              setAcik(true)
            }}
            onFocus={() => setAcik(true)}
            placeholder="Ad veya sicil…"
            disabled={yukleniyor}
          />
          {acik && filtre.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {filtre.map(a => (
                <li key={a.anahtar}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => sec(a)}
                  >
                    <span className="font-medium text-slate-800">{a.ad_soyad}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{a.sicil_no}</span>
                    {a.unvan ? <span className="ml-2 text-xs text-slate-400">{a.unvan}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kanun</label>
            <select className={inputSinif} value={kanun} onChange={e => setKanun(e.target.value as EmekliKanun)}>
              <option value="5434">5434</option>
              <option value="5510">5510 (4/c)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Aylık tarihi</label>
            <select className={inputSinif} value={donemId} onChange={e => setDonemId(e.target.value)}>
              {EMEKLI_KATSAYI_DONEMLERI.map(d => (
                <option key={d.id} value={d.id}>
                  {d.etiket}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Derece</label>
            <select className={inputSinif} value={derece} onChange={e => setDerece(e.target.value)}>
              {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {String(n).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kademe</label>
            <select className={inputSinif} value={kademe} onChange={e => setKademe(e.target.value)}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ek gösterge</label>
            <input className={inputSinif} value={ekGosterge} onChange={e => setEkGosterge(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kad. taz. ek gösterge</label>
            <input className={inputSinif} value={kadTaz} onChange={e => setKadTaz(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kıdem yılı</label>
            <select className={inputSinif} value={kidemYili} onChange={e => setKidemYili(e.target.value)}>
              {Array.from({ length: 25 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {String(n).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">İkramiye yılı</label>
            <select className={inputSinif} value={ikramiyeYili} onChange={e => setIkramiyeYili(e.target.value)}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {String(n).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hizmet yılı</label>
            <select className={inputSinif} value={hizmetYil} onChange={e => setHizmetYil(e.target.value)}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {String(n).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hizmet ayı</label>
            <select className={inputSinif} value={hizmetAy} onChange={e => setHizmetAy(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i).map(n => (
                <option key={n} value={n}>
                  {String(n).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hizmet günü</label>
            <input className={inputSinif} value={hizmetGun} onChange={e => setHizmetGun(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Makam+temsil+görev göst.</label>
            <input className={inputSinif} value={makam} onChange={e => setMakam(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pay</label>
            <input className={inputSinif} value={pay} onChange={e => setPay(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Payda</label>
            <input className={inputSinif} value={payda} onChange={e => setPayda(e.target.value)} />
          </div>
        </div>

        {sicil ? (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{ad}</span>
            <span className="ml-2 font-mono text-xs">{sicil}</span>
            {unvan ? <span className="ml-2 text-xs text-slate-500">{unvan}</span> : null}
          </p>
        ) : null}
        {kisiUyari ? <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{kisiUyari}</p> : null}
        {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}

        <button
          type="button"
          onClick={kaydet}
          disabled={kaydediliyor || yukleniyor}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {kaydediliyor ? 'Kaydediliyor…' : baslangic?.id ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">Önizleme</h2>
        {!onizleme || 'hata' in onizleme ? (
          <p className="text-sm text-slate-500">{onizleme && 'hata' in onizleme ? onizleme.hata : 'Alanları doldurun.'}</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1.5 text-left font-medium">Kalem</th>
                  <th className="py-1.5 text-right font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {onizleme.sonuc.matrahKalemler.map(k => (
                  <tr key={k.ad} className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-700">
                      {k.ad}
                      <span className="block text-[11px] text-slate-400">{k.aciklama}</span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{paraTr(k.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-2 font-semibold">Matrah</td>
                  <td className="pt-2 text-right font-semibold tabular-nums">{paraTr(onizleme.sonuc.matrah)}</td>
                </tr>
                <tr>
                  <td className="pt-1">İkramiye ({onizleme.sonuc.ikramiyeYili} yıl)</td>
                  <td className="pt-1 text-right tabular-nums font-medium text-emerald-800">
                    {paraTr(onizleme.sonuc.ikramiye)}
                  </td>
                </tr>
                <tr>
                  <td className="pt-1">
                    5434 usulü aylık
                    <span className="block text-[11px] text-slate-400">
                      Bağlama %{onizleme.sonuc.baglamaOrani}
                      {kanun === '5510' ? ' · 5510 aylığı değildir' : ''}
                    </span>
                  </td>
                  <td className="pt-1 text-right tabular-nums">
                    {onizleme.sonuc.maas5434 != null ? paraTr(onizleme.sonuc.maas5434) : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="pt-1">
                    Ek ödeme
                    <span className="block text-[11px] text-slate-400">
                      5454 md. 1 · vergi iadesi yerine · %
                      {onizleme.sonuc.ekOdemeOrani ?? '—'}
                    </span>
                  </td>
                  <td className="pt-1 text-right tabular-nums">
                    {onizleme.sonuc.ekOdeme != null ? paraTr(onizleme.sonuc.ekOdeme) : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="pt-1">
                    İlave ödeme
                    <span className="block text-[11px] text-slate-400">
                      5434 ek md. 86 / 7456 md. 2 · %{onizleme.sonuc.ilaveOdemeOrani}
                    </span>
                  </td>
                  <td className="pt-1 text-right tabular-nums">
                    {onizleme.sonuc.ilaveOdeme != null ? paraTr(onizleme.sonuc.ilaveOdeme) : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="pt-2 font-semibold text-slate-800">Toplam ödenecek aylık</td>
                  <td className="pt-2 text-right font-semibold tabular-nums text-emerald-800">
                    {onizleme.sonuc.maasToplam != null ? paraTr(onizleme.sonuc.maasToplam) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
            {onizleme.sonuc.maasUyari ? (
              <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-3 py-2">{onizleme.sonuc.maasUyari}</p>
            ) : null}
            <p className="text-xs text-slate-500">{EMEKLI_IKRAMIYE_UYARI}</p>
          </>
        )}
      </div>
    </div>
  )
}
