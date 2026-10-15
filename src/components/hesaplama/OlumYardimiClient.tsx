'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { olumKaydet, olumKisiGetir, type OlumKaydetGirdi } from '@/app/(dashboard)/hesaplama/olum-yardimi/actions'
import type { HesaplamaAday } from '@/lib/hesaplama-personel'
import { AYLIKTAN_KESME_KATSAYI } from '@/lib/ayliktan-kesme-katsayi'
import { katsayiTr, paraTr } from '@/lib/ayliktan-kesme-hesap'
import {
  OLUM_YARDIMI_DAYANAK,
  OLUM_YARDIMI_GOSTERGE,
  OLUM_YARDIMI_KAT,
  ibanUyari,
  ibanYaz,
  olumYardimiHesapla,
} from '@/lib/olum-yardimi-hesap'

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500'

type Varis = { tckn: string; adSoyad: string; iban: string }

function bosVaris(): Varis {
  return { tckn: '', adSoyad: '', iban: '' }
}

function sayiEsnek(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return null
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function gostergeOku(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '')
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n > 0 ? n : null
}

export type OlumFormBaslangic = {
  id?: number
  sicil: string
  ad: string
  tckn: string
  unvan: string
  gosterge: string
  maasKatsayi: string
  varisler: Varis[]
}

export default function OlumYardimiClient({
  adaylar,
  baslangic,
}: {
  adaylar: HesaplamaAday[]
  baslangic?: OlumFormBaslangic
}) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [acik, setAcik] = useState(false)
  const [ad, setAd] = useState(baslangic?.ad ?? '')
  const [sicil, setSicil] = useState(baslangic?.sicil ?? '')
  const [tckn, setTckn] = useState(baslangic?.tckn ?? '')
  const [unvan, setUnvan] = useState(baslangic?.unvan ?? '')
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [gosterge, setGosterge] = useState(baslangic?.gosterge ?? String(OLUM_YARDIMI_GOSTERGE))
  const [maasKatsayi, setMaasKatsayi] = useState<string>(baslangic?.maasKatsayi ?? AYLIKTAN_KESME_KATSAYI.maas)
  const [varisler, setVarisler] = useState<Varis[]>(
    baslangic?.varisler?.length
      ? baslangic.varisler.map(v => ({ ...v, iban: ibanYaz(v.iban) }))
      : [bosVaris()],
  )

  const filtre = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (q.length < 2) return []
    return adaylar.filter(a =>
      a.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
      a.sicil_no.toLocaleLowerCase('tr-TR').includes(q),
    ).slice(0, 12)
  }, [adaylar, arama])

  async function sec(aday: HesaplamaAday) {
    setAcik(false)
    setArama('')
    setHata(null)
    setYukleniyor(true)
    const sonuc = await olumKisiGetir(aday.sicil_no)
    setYukleniyor(false)
    if (sonuc.hata || !sonuc.kisi) {
      setHata(sonuc.hata ?? 'Personel okunamadı.')
      return
    }
    setAd(sonuc.kisi.ad_soyad)
    setSicil(sonuc.kisi.sicil_no)
    setTckn(sonuc.kisi.tckn)
    setUnvan(sonuc.kisi.unvan || aday.unvan)
    setMaasKatsayi(katsayiTr(sonuc.kisi.maasKatsayi))
    setGosterge(String(OLUM_YARDIMI_GOSTERGE))
  }

  function varisGuncelle(i: number, alan: keyof Varis, deger: string) {
    setVarisler(liste => liste.map((v, idx) => (idx === i ? { ...v, [alan]: deger } : v)))
  }

  const gecerli = varisler.filter(v => v.tckn.trim() || v.adSoyad.trim() || v.iban.trim())
  const hesap = useMemo(
    () => olumYardimiHesapla({
      gosterge: gostergeOku(gosterge) ?? 0,
      maasKatsayi: sayiEsnek(maasKatsayi) ?? 0,
      varisSayisi: Math.max(gecerli.length, 0),
    }),
    [gosterge, maasKatsayi, gecerli.length],
  )
  const sonuc = 'hata' in hesap ? null : hesap

  async function olustur() {
    if (!sonuc || !sicil || kaydediliyor) return
    setKaydediliyor(true)
    setHata(null)
    const girdi: OlumKaydetGirdi = {
      id: baslangic?.id,
      sicil_no: sicil,
      ad_soyad: ad,
      tckn,
      unvan,
      gosterge: sonuc.gosterge,
      maasKatsayi: sayiEsnek(maasKatsayi) ?? 0,
      varisler: gecerli,
    }
    const r = await olumKaydet(girdi)
    setKaydediliyor(false)
    if (r.hata || !r.id) {
      setHata(r.hata ?? 'Kayıt alınamadı.')
      return
    }
    router.push('/hesaplama/olum-yardimi')
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Memur</label>
          {sicil ? (
            <div className="flex items-center justify-between p-2.5 border border-green-300 bg-green-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-800">{ad}</span>
                <span className="text-xs text-slate-500 ml-2">{sicil}</span>
              </div>
              {baslangic?.id ? null : (
                <button type="button" onClick={() => { setSicil(''); setAd('') }} className="text-xs text-slate-500 hover:text-slate-700">
                  Değiştir
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                value={arama}
                onChange={e => { setArama(e.target.value); setAcik(true) }}
                onFocus={() => setAcik(true)}
                onBlur={() => setTimeout(() => setAcik(false), 200)}
                placeholder="İsim veya sicil ara…"
                className={inputSinif}
              />
              {acik && filtre.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filtre.map(a => (
                    <li key={a.anahtar}>
                      <button type="button" onMouseDown={() => void sec(a)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">
                        <span className="font-medium text-slate-800">{a.ad_soyad}</span>
                        <span className="text-slate-400 text-xs ml-2">{a.sicil_no}</span>
                        {a.unvan ? <span className="block text-xs text-slate-500">{a.unvan}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {yukleniyor ? <p className="mt-2 text-xs text-slate-500">Hesaplama yapılıyor…</p> : null}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">En yüksek devlet memuru göstergesi</span>
          <input value={gosterge} onChange={e => setGosterge(e.target.value)} className={`${inputSinif} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Memur aylık katsayısı</span>
          <input value={maasKatsayi} onChange={e => setMaasKatsayi(e.target.value)} className={`${inputSinif} mt-1`} />
        </label>
        <p className="text-sm text-slate-600">Memurun ölümü: kat {OLUM_YARDIMI_KAT}</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Varisler</h2>
            <button type="button" onClick={() => setVarisler(v => [...v, bosVaris()])} className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
              Varis ekle
            </button>
          </div>
          {varisler.map((v, i) => (
            <div key={i} className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-2">
                <input value={v.tckn} onChange={e => varisGuncelle(i, 'tckn', e.target.value)} placeholder="TCKN" className={inputSinif} />
                <input value={v.adSoyad} onChange={e => varisGuncelle(i, 'adSoyad', e.target.value)} placeholder="Ad soyad" className={inputSinif} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    value={v.iban}
                    onChange={e => varisGuncelle(i, 'iban', ibanYaz(e.target.value))}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    className={inputSinif}
                    spellCheck={false}
                  />
                  {ibanUyari(v.iban) ? <p className="mt-1 text-xs text-red-700">{ibanUyari(v.iban)}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => setVarisler(liste => liste.length === 1 ? [bosVaris()] : liste.filter((_, idx) => idx !== i))}
                  className="rounded-lg border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Çıkar
                </button>
              </div>
            </div>
          ))}
        </div>

        {hata ? <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p> : null}
        {sicil && !sonuc && 'hata' in hesap ? <p className="text-sm text-red-600">{hesap.hata}</p> : null}
        <button
          type="button"
          onClick={() => void olustur()}
          disabled={!sonuc || !sicil || kaydediliyor}
          className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {kaydediliyor ? 'Kaydediliyor…' : baslangic?.id ? 'Kaydet' : 'Oluştur'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Hesap önizleme</h2>
        {sonuc && sicil ? (
          <>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Personel</td><td className="py-2">{ad} ({sicil})</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Ünvan</td><td className="py-2">{unvan || '—'}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Gösterge</td><td className="py-2">{sonuc.gosterge}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Kat</td><td className="py-2">{sonuc.kat}</td></tr>
              </tbody>
            </table>
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-medium">Kalem</th>
                  <th className="py-2 font-medium text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2">En yüksek devlet memuru aylığı</td>
                  <td className="py-2 text-right tabular-nums">{paraTr(sonuc.aylik)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 font-medium">Ölüm yardımı</td>
                  <td className="py-2 text-right tabular-nums font-medium">{paraTr(sonuc.toplam)}</td>
                </tr>
                {gecerli.map((v, i) => (
                  <tr key={`${v.tckn}-${i}`} className="border-b border-slate-100">
                    <td className="py-2">{v.adSoyad.trim() || `Varis ${i + 1}`}</td>
                    <td className="py-2 text-right tabular-nums">{paraTr(sonuc.paylar[i] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 font-semibold">Varis payları toplamı</td>
                  <td className="pt-3 text-right font-semibold tabular-nums">
                    {paraTr(sonuc.paylar.reduce((a, b) => a + b, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-4 text-sm text-slate-700">{OLUM_YARDIMI_DAYANAK}</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">Memur ve varisler tamamlanınca tutarlar burada görünür.</p>
        )}
      </div>
    </div>
  )
}
