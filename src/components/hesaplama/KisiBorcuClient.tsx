'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { kisiBorcuKaydet, kisiBorcuKisiGetir, type KisiBorcuKaydetGirdi } from '@/app/(dashboard)/hesaplama/kisi-borcu/actions'
import type { HesaplamaAday } from '@/lib/hesaplama-personel'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import { faizTuruEtiket, type FaizTuru, type TcmbFaizSatir } from '@/lib/kanuni-faiz'
import { kisiBorcuHesapla } from '@/lib/kisi-borcu'
import KisiBorcuPlan from '@/components/hesaplama/KisiBorcuPlan'

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

export type KisiBorcuFormBaslangic = {
  id?: number
  sicil: string
  ad: string
  tckn: string
  unvan: string
  statu: 'Memur' | 'İşçi' | ''
  ana: string
  taksit: string
  odemeGunu: string
  baslangic: string
  faizTuru: FaizTuru
}

export default function KisiBorcuClient({
  adaylar,
  tcmb,
  kaynak,
  baslangic,
}: {
  adaylar: HesaplamaAday[]
  tcmb: TcmbFaizSatir[]
  kaynak: 'tcmb' | 'yedek'
  baslangic?: KisiBorcuFormBaslangic
}) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [acik, setAcik] = useState(false)
  const [statu, setStatu] = useState<'Memur' | 'İşçi' | ''>(baslangic?.statu ?? '')
  const [ad, setAd] = useState(baslangic?.ad ?? '')
  const [sicil, setSicil] = useState(baslangic?.sicil ?? '')
  const [tckn, setTckn] = useState(baslangic?.tckn ?? '')
  const [unvan, setUnvan] = useState(baslangic?.unvan ?? '')
  const [ana, setAna] = useState(baslangic?.ana ?? '')
  const [taksit, setTaksit] = useState(baslangic?.taksit ?? '')
  const [odemeGunu, setOdemeGunu] = useState(baslangic?.odemeGunu ?? '1')
  const [baslangicTarih, setBaslangicTarih] = useState(baslangic?.baslangic ?? '')
  const [faizTuru, setFaizTuru] = useState<FaizTuru>(baslangic?.faizTuru ?? 'kanuni')
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)

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
    const sonuc = await kisiBorcuKisiGetir(aday.sicil_no, aday.statu)
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
  }

  const hesap = useMemo(() => {
    if (!sicil || !baslangicTarih) return null
    const anaTutar = sayiEsnek(ana)
    const taksitTutari = sayiEsnek(taksit)
    if (anaTutar == null || taksitTutari == null) return null
    return kisiBorcuHesapla({
      anaTutar,
      taksitTutari,
      odemeGunu: Number(odemeGunu),
      faizBaslangic: baslangicTarih,
      faizTuru,
      kaynak,
      tcmb,
      kisi: { sicil_no: sicil, ad_soyad: ad, tckn, unvan, statu },
    })
  }, [sicil, ad, tckn, unvan, statu, ana, taksit, odemeGunu, baslangicTarih, faizTuru, kaynak, tcmb])

  const sonuc = hesap && !('hata' in hesap) ? hesap : null
  const hesapHatasi = hesap && 'hata' in hesap ? hesap.hata : null

  async function kaydet() {
    if (!sonuc || kaydediliyor) return
    setKaydediliyor(true)
    setHata(null)
    const girdi: KisiBorcuKaydetGirdi = {
      id: baslangic?.id,
      sicil_no: sicil,
      ad_soyad: ad,
      tckn,
      unvan,
      statu,
      ana_tutar: sonuc.belge.ana_tutar,
      taksit_tutari: sonuc.belge.taksit_tutari,
      odeme_gunu: sonuc.belge.odeme_gunu,
      faiz_baslangic: sonuc.belge.faiz_baslangic,
      faiz_turu: faizTuru,
    }
    const r = await kisiBorcuKaydet(girdi)
    setKaydediliyor(false)
    if (r.hata || !r.id) {
      setHata(r.hata ?? 'Kayıt alınamadı.')
      return
    }
    router.push(`/hesaplama/kisi-borcu/${r.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Personel</label>
            {sicil ? (
              <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-2.5">
                <div>
                  <span className="text-sm font-medium text-slate-800">{ad}</span>
                  <span className="ml-2 text-xs text-slate-500">{sicil}</span>
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
                  placeholder="Ad veya sicil yazın"
                  className={inputSinif}
                />
                {acik && filtre.length > 0 ? (
                  <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filtre.map(a => (
                      <li key={a.anahtar}>
                        <button type="button" onClick={() => sec(a)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                          <span className="font-medium text-slate-800">{a.ad_soyad}</span>
                          <span className="ml-2 text-xs text-slate-500">{a.sicil_no}</span>
                          <span className="ml-2 text-xs text-slate-500">{a.statu}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            {yukleniyor ? <p className="mt-1 text-xs text-slate-500">Personel okunuyor…</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Ana tutar</label>
              <input value={ana} onChange={e => setAna(e.target.value)} inputMode="decimal" className={inputSinif} placeholder="0,00" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Taksit tutarı</label>
              <input value={taksit} onChange={e => setTaksit(e.target.value)} inputMode="decimal" className={inputSinif} placeholder="0,00" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Ödeme günü</label>
              <select value={odemeGunu} onChange={e => setOdemeGunu(e.target.value)} className={inputSinif}>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Faiz başlangıcı</label>
              <input type="date" value={baslangicTarih} onChange={e => setBaslangicTarih(e.target.value)} className={inputSinif} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Faiz türü</label>
            <select value={faizTuru} onChange={e => setFaizTuru(e.target.value as FaizTuru)} className={inputSinif}>
              <option value="kanuni">Kanuni faiz</option>
              <option value="temerrut">Temerrüt faizi</option>
            </select>
          </div>

          <p className="text-sm text-slate-600">
            Taksit tutarı anaparadan düşülür. Dönem faizi bu tutara eklenir. İlk vade, faiz başlangıcından sonraki ilk ödeme günüdür.
          </p>

          {kaynak === 'yedek' ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              TCMB sayfasına şu an ulaşılamadı. Hesap, kayıtlı reeskont tablosuyla yapılıyor.
            </p>
          ) : (
            <p className="text-sm text-slate-500">Reeskont oranları TCMB sayfasından alındı.</p>
          )}

          <button
            type="button"
            onClick={kaydet}
            disabled={!sonuc || kaydediliyor}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
          {hesapHatasi ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hesapHatasi}</p> : null}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-800">Ödeme planı</h2>
          {sonuc ? (
            <>
              <p className="text-sm text-slate-700">
                {faizTuruEtiket(faizTuru)} · {sonuc.plan.taksitSayisi} taksit · faiz {paraTr(sonuc.plan.toplamFaiz)} · toplam {paraTr(sonuc.plan.toplamOdeme)}
              </p>
              <p className="text-sm leading-relaxed text-slate-600">{sonuc.belge.dayanak}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Personel, tutarlar ve faiz başlangıcı girilince plan burada görünür.</p>
          )}
        </div>
      </div>
      {sonuc ? <KisiBorcuPlan satirlar={sonuc.plan.satirlar} /> : null}
    </div>
  )
}
