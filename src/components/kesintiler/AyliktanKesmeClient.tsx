'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AYLIKTAN_KESME_PAYDALARI,
  ayliktanKesmeHesapla,
  ayliktanKesmePaydaMi,
  ayliktanKesmeDayanakMetni,
  ayliktanKesmeGenelToplam,
  paraTr,
  sayiOku,
  type AyliktanKesmeKaynak,
  type AyliktanKesmePayda,
} from '@/lib/ayliktan-kesme-hesap'
import type { AyliktanKesmeAday } from '@/lib/ayliktan-kesme-yukle'
import { AYLIKTAN_KESME_KATSAYI } from '@/lib/ayliktan-kesme-katsayi'
import type { AyliktanKesmeKaydetGirdi } from '@/app/(dashboard)/kesintiler/ayliktan-kesme/actions'

type Props = {
  adaylar: AyliktanKesmeAday[]
  personelGetir: (sicilNo: string) => Promise<{ kaynak?: AyliktanKesmeKaynak; hata?: string }>
  kaydet: (girdi: AyliktanKesmeKaydetGirdi) => Promise<{ ok?: boolean; id?: number; hata?: string }>
  kayitId?: number
  kilitliSicil?: string
  baslangicKaynak?: AyliktanKesmeKaynak | null
  baslangic?: {
    maas: string
    taban: string
    yan: string
    payda: AyliktanKesmePayda | ''
  }
}

export default function AyliktanKesmeClient({
  adaylar,
  personelGetir,
  kaydet,
  kayitId,
  kilitliSicil,
  baslangicKaynak,
  baslangic,
}: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [acik, setAcik] = useState(false)
  const [kaynak, setKaynak] = useState<AyliktanKesmeKaynak | null>(baslangicKaynak ?? null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [maas, setMaas] = useState(baslangic?.maas ?? AYLIKTAN_KESME_KATSAYI.maas)
  const [taban, setTaban] = useState(baslangic?.taban ?? AYLIKTAN_KESME_KATSAYI.tabanAylik)
  const [yan, setYan] = useState(baslangic?.yan ?? AYLIKTAN_KESME_KATSAYI.yanOdeme)
  const [payda, setPayda] = useState<AyliktanKesmePayda | ''>(baslangic?.payda ?? '')
  const [hata, setHata] = useState<string | null>(null)
  const [olusturuluyor, setOlusturuluyor] = useState(false)

  const filtre = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (q.length < 2) return []
    return adaylar
      .filter(a =>
        a.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        a.sicil_no.toLocaleLowerCase('tr-TR').includes(q),
      )
      .slice(0, 12)
  }, [adaylar, arama])

  const hesap = useMemo(() => {
    if (!kaynak || !payda) return null
    const maasSayi = sayiOku(maas)
    const tabanSayi = sayiOku(taban)
    const yanSayi = sayiOku(yan)
    if (maasSayi == null || tabanSayi == null || yanSayi == null) return null
    return ayliktanKesmeHesapla(kaynak, {
      maas: maasSayi,
      tabanAylik: tabanSayi,
      yanOdeme: yanSayi,
      payda,
    })
  }, [kaynak, maas, taban, yan, payda])

  const bordro = hesap && 'satirlar' in hesap ? hesap : null
  const hesapHata = hesap && 'hata' in hesap ? hesap.hata : null

  async function sec(aday: AyliktanKesmeAday) {
    setAcik(false)
    setArama('')
    setHata(null)
    setKaynak(null)
    setYukleniyor(true)
    const r = await personelGetir(aday.sicil_no)
    setYukleniyor(false)
    if (r.hata || !r.kaynak) {
      setHata(r.hata ?? 'Personel bilgisi alınamadı.')
      return
    }
    setKaynak(r.kaynak)
  }

  async function olustur() {
    if (!kaynak || !bordro || !payda) return
    setOlusturuluyor(true)
    setHata(null)
    const r = await kaydet({
      id: kayitId,
      sicil_no: kaynak.sicil_no,
      maas: bordro.katsayi.maas,
      tabanAylik: bordro.katsayi.tabanAylik,
      yanOdeme: bordro.katsayi.yanOdeme,
      payda,
    })
    setOlusturuluyor(false)
    if (r.hata || !r.id) {
      setHata(r.hata ?? 'Kayıt alınamadı.')
      return
    }
    router.push('/kesintiler/ayliktan-kesme')
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
          {kaynak ? (
            <div className="flex items-center justify-between p-2.5 border border-green-300 bg-green-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-800">{kaynak.ad_soyad}</span>
                <span className="text-xs text-slate-500 ml-2">{kaynak.sicil_no}</span>
              </div>
              {kilitliSicil ? null : (
                <button
                  type="button"
                  onClick={() => setKaynak(null)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              {acik && filtre.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filtre.map(a => (
                    <li key={a.sicil_no}>
                      <button
                        type="button"
                        onMouseDown={() => void sec(a)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                      >
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
          {yukleniyor ? <p className="mt-2 text-xs text-slate-500">Asıl terfi kaydı okunuyor…</p> : null}
        </div>

        {kaynak ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
            <Alan etiket="T.C. Kimlik No" deger={kaynak.tckn || '—'} />
            <Alan etiket="Ünvan" deger={kaynak.unvan || '—'} />
            <Alan etiket="KHA derece / kademe" deger={`${kaynak.derece} / ${kaynak.kademe}`} />
            <Alan etiket="Ek gösterge" deger={String(kaynak.ek_gosterge)} />
            <Alan etiket="ÖHT oranı" deger={String(kaynak.oht_orani)} />
            <Alan etiket="Ek ödeme oranı" deger={String(kaynak.ek_odeme_orani ?? 0)} />
            <Alan etiket="Yan ödeme" deger={String(kaynak.yan_odeme_gostergesi)} />
            <Alan etiket="SDS puanı" deger={String(kaynak.sds_puan ?? 0)} />
            <Alan etiket="Kıdem yılı" deger={String(kaynak.kidem_yili)} />
          </dl>
        ) : null}

        {kaynak?.yarim_zamanli_not ? (
          <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{kaynak.yarim_zamanli_not}</p>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p>
            Katsayılar {AYLIKTAN_KESME_KATSAYI.donem} dönemi için{' '}
            <a
              href={AYLIKTAN_KESME_KATSAYI.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              bakanlık genelgesinden
            </a>{' '}
            dolduruldu. Bordrodan önce değiştirebilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => {
              setMaas(AYLIKTAN_KESME_KATSAYI.maas)
              setTaban(AYLIKTAN_KESME_KATSAYI.tabanAylik)
              setYan(AYLIKTAN_KESME_KATSAYI.yanOdeme)
            }}
            className="mt-1 text-slate-700 underline underline-offset-2"
          >
            Genelgedeki katsayılara dön
          </button>
        </div>
        <Katsayi alan="Maaş Katsayısı" value={maas} onChange={setMaas} />
        <Katsayi alan="Taban Aylık Katsayısı" value={taban} onChange={setTaban} />
        <Katsayi alan="Yan Ödeme Katsayısı" value={yan} onChange={setYan} />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Kesilecek ceza oranı</label>
          <select
            value={payda}
            onChange={e => {
              const n = Number(e.target.value)
              setPayda(ayliktanKesmePaydaMi(n) ? n : '')
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">— Seçin —</option>
            {AYLIKTAN_KESME_PAYDALARI.map(p => (
              <option key={p} value={p}>{`1/${p}`}</option>
            ))}
          </select>
        </div>

        {hata || hesapHata ? (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata || hesapHata}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void olustur()}
          disabled={!bordro || olusturuluyor}
          className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {olusturuluyor ? 'Kaydediliyor…' : kayitId ? 'Kaydet' : 'Oluştur'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Bordro önizleme</h2>
        {bordro ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 font-medium">Maaş unsuru</th>
                <th className="py-2 font-medium text-right">Tutar</th>
                <th className="py-2 font-medium text-right">Kesinti</th>
              </tr>
            </thead>
            <tbody>
              {bordro.satirlar.map(s => (
                <tr key={s.ad} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{s.ad}</td>
                  <td className="py-2 text-right tabular-nums">{paraTr(s.tutar)}</td>
                  <td className="py-2 text-right tabular-nums">{paraTr(s.kesinti)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="pt-3 font-semibold text-slate-800" colSpan={2}>Aylıktan ceza kesintisi</td>
                <td className="pt-3 text-right font-semibold tabular-nums text-slate-800">{paraTr(bordro.toplam)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-700">Sosyal Denge Tazminatı</td>
                <td className="py-2 text-right tabular-nums">{paraTr(bordro.sosyal_denge?.aylik ?? 0)}</td>
                <td className="py-2 text-right tabular-nums">{paraTr(bordro.sosyal_denge?.aylik ?? 0)}</td>
              </tr>
              <tr>
                <td className="pt-3 font-semibold text-slate-800" colSpan={2}>Toplam aylıktan kesinti</td>
                <td className="pt-3 text-right font-semibold tabular-nums text-slate-800">{paraTr(ayliktanKesmeGenelToplam(bordro))}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-sm text-slate-500">
            Personel ve ceza oranı tamamlanınca tutarlar burada görünür. Katsayılar genelgeden gelir; gerekirse alanlardan değiştirilir.
          </p>
        )}
        {bordro ? (
          <p className="mt-4 text-sm text-slate-700 whitespace-pre-line">{ayliktanKesmeDayanakMetni(bordro.yarim_zamanli)}</p>
        ) : null}
      </div>
    </div>
  )
}

function Alan({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{etiket}</dt>
      <dd className="text-slate-800">{deger}</dd>
    </div>
  )
}

function Katsayi({
  alan,
  value,
  onChange,
}: {
  alan: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{alan}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
      />
    </div>
  )
}
