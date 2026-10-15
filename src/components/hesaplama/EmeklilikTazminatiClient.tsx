'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { emeklilikKaydet, emeklilikKisiGetir, type EmeklilikKaydetGirdi } from '@/app/(dashboard)/hesaplama/emeklilik-tazminati/actions'
import type { HesaplamaAday } from '@/lib/hesaplama-personel'
import { AYLIKTAN_KESME_KATSAYI } from '@/lib/ayliktan-kesme-katsayi'
import { katsayiTr, paraTr } from '@/lib/ayliktan-kesme-hesap'
import {
  DAMGA_VERGISI_ORANI,
  emeklilikDayanak,
  emeklilikGosterge,
  emeklilikTazminatiHesapla,
  type EmeklilikStatu,
} from '@/lib/emeklilik-tazminati-hesap'

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

function gostergeOku(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '')
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n > 0 ? n : null
}

export type EmeklilikFormBaslangic = {
  id?: number
  sicil: string
  ad: string
  tckn: string
  unvan: string
  statu: EmeklilikStatu
  gosterge: string
  maasKatsayi: string
  damgaOrani: string
}

export default function EmeklilikTazminatiClient({
  adaylar,
  baslangic,
}: {
  adaylar: HesaplamaAday[]
  baslangic?: EmeklilikFormBaslangic
}) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [acik, setAcik] = useState(false)
  const [statu, setStatu] = useState<EmeklilikStatu | ''>(baslangic?.statu ?? '')
  const [ad, setAd] = useState(baslangic?.ad ?? '')
  const [sicil, setSicil] = useState(baslangic?.sicil ?? '')
  const [tckn, setTckn] = useState(baslangic?.tckn ?? '')
  const [unvan, setUnvan] = useState(baslangic?.unvan ?? '')
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [gosterge, setGosterge] = useState(baslangic?.gosterge ?? '')
  const [maasKatsayi, setMaasKatsayi] = useState<string>(baslangic?.maasKatsayi ?? AYLIKTAN_KESME_KATSAYI.maas)
  const [damgaOrani, setDamgaOrani] = useState(baslangic?.damgaOrani ?? katsayiTr(DAMGA_VERGISI_ORANI))

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
    const sonuc = await emeklilikKisiGetir(aday.sicil_no, aday.statu)
    setYukleniyor(false)
    if (sonuc.hata || !sonuc.kisi) {
      setHata(sonuc.hata ?? 'Personel okunamadı.')
      return
    }
    const k = sonuc.kisi
    setStatu(k.statu)
    setAd(k.ad_soyad)
    setSicil(k.sicil_no)
    setTckn(k.tckn)
    setUnvan(k.unvan || aday.unvan)
    setGosterge(String(emeklilikGosterge(k.statu)))
    setMaasKatsayi(katsayiTr(k.maasKatsayi))
    setDamgaOrani(katsayiTr(DAMGA_VERGISI_ORANI))
  }

  const hesap = useMemo(() => {
    if (statu !== 'Memur' && statu !== 'İşçi') return null
    return emeklilikTazminatiHesapla({
      statu,
      gosterge: gostergeOku(gosterge) ?? 0,
      maasKatsayi: sayiEsnek(maasKatsayi) ?? 0,
      damgaOrani: sayiEsnek(damgaOrani) ?? 0,
    })
  }, [statu, gosterge, maasKatsayi, damgaOrani])
  const sonuc = hesap && !('hata' in hesap) ? hesap : null
  const hesapHatasi = hesap && 'hata' in hesap ? hesap.hata : null

  async function olustur() {
    if (!sonuc || (statu !== 'Memur' && statu !== 'İşçi') || kaydediliyor) return
    setKaydediliyor(true)
    setHata(null)
    const girdi: EmeklilikKaydetGirdi = {
      id: baslangic?.id,
      sicil_no: sicil,
      ad_soyad: ad,
      tckn,
      unvan,
      statu,
      gosterge: sonuc.gosterge,
      maasKatsayi: sayiEsnek(maasKatsayi) ?? 0,
      damgaOrani: sayiEsnek(damgaOrani) ?? 0,
    }
    const r = await emeklilikKaydet(girdi)
    setKaydediliyor(false)
    if (r.hata || !r.id) {
      setHata(r.hata ?? 'Kayıt alınamadı.')
      return
    }
    router.push('/hesaplama/emeklilik-tazminati')
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
          {sicil ? (
            <div className="flex items-center justify-between p-2.5 border border-green-300 bg-green-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-800">{ad}</span>
                <span className="text-xs text-slate-500 ml-2">{sicil}</span>
                {statu ? <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-slate-700">{statu}</span> : null}
              </div>
              {baslangic?.id ? null : (
                <button type="button" onClick={() => { setSicil(''); setStatu(''); setAd('') }} className="text-xs text-slate-500 hover:text-slate-700">
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
                        <span className="block text-xs text-slate-500">{a.statu}{a.unvan ? ` · ${a.unvan}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {yukleniyor ? <p className="mt-2 text-xs text-slate-500">Hesaplama yapılıyor…</p> : null}
        </div>

        {statu ? (
          <>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Gösterge {statu === 'Memur' ? '(toplu sözleşme 13.558)' : '(kanun 12.105)'}
              </span>
              <input value={gosterge} onChange={e => setGosterge(e.target.value)} className={`${inputSinif} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Memur aylık katsayısı</span>
              <input value={maasKatsayi} onChange={e => setMaasKatsayi(e.target.value)} className={`${inputSinif} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Damga vergisi oranı</span>
              <input value={damgaOrani} onChange={e => setDamgaOrani(e.target.value)} className={`${inputSinif} mt-1`} />
            </label>
          </>
        ) : null}

        {hata || hesapHatasi ? <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata || hesapHatasi}</p> : null}
        <button
          type="button"
          onClick={() => void olustur()}
          disabled={!sonuc || kaydediliyor}
          className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {kaydediliyor ? 'Kaydediliyor…' : baslangic?.id ? 'Kaydet' : 'Oluştur'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Hesap önizleme</h2>
        {sonuc && statu ? (
          <>
            <table className="w-full text-sm">
              <tbody>
                <Satir etiket="Personel" deger={`${ad} (${sicil})`} />
                <Satir etiket="Statü" deger={statu} />
                <Satir etiket="Ünvan" deger={unvan || '—'} />
                <Satir etiket="Gösterge" deger={String(sonuc.gosterge)} />
                <Satir etiket="Memur aylık katsayısı" deger={maasKatsayi} />
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
                <tr className="border-b border-slate-100"><td className="py-2">Brüt tazminat</td><td className="py-2 text-right tabular-nums">{paraTr(sonuc.brut)}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2">Damga vergisi</td><td className="py-2 text-right tabular-nums">{paraTr(sonuc.damga)}</td></tr>
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 font-semibold text-slate-800">Ödenecek tutar</td>
                  <td className="pt-3 text-right font-semibold tabular-nums">{paraTr(sonuc.net)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-4 text-sm text-slate-700">{emeklilikDayanak(statu)}</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">Personel seçilince tutarlar burada görünür. Gösterge ve katsayı değiştirilebilir.</p>
        )}
      </div>
    </div>
  )
}

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 text-slate-500 w-48">{etiket}</td>
      <td className="py-2 text-slate-800">{deger}</td>
    </tr>
  )
}
