'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SmsGonderActionSonuc } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import { smsGonderAction } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import { sablonTurEtiket } from '@/lib/sms-sablon'
import type { SmsPersonelSatir, SmsSablonSecenek } from '@/lib/sms-islemleri-tipleri'
import SmsSecimListesi from './SmsSecimListesi'

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const IZINLI_TURLER = ['dogum_gunu', 'genel']

interface Props {
  personeller: SmsPersonelSatir[]
  sablonlar: SmsSablonSecenek[]
  originatorlar: string[]
  gonderimAcik: boolean
}

function ayNo(tarih: string | null | undefined): number | null {
  if (!tarih) return null
  const n = parseInt(String(tarih).slice(5, 7), 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null
}

function gunNo(tarih: string | null | undefined): number {
  const n = parseInt(String(tarih ?? '').slice(8, 10), 10)
  return Number.isFinite(n) ? n : 99
}

function trTarih(tarih: string | null | undefined): string {
  const s = String(tarih ?? '').slice(0, 10)
  const [y, m, d] = s.split('-')
  if (!y || !m || !d) return s
  return `${d}/${m}/${y}`
}

export default function SmsDogumGunuClient({ personeller, sablonlar, originatorlar, gonderimAcik }: Props) {
  const router = useRouter()
  const [ay, setAy] = useState(new Date().getMonth())
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [sablonId, setSablonId] = useState('')
  const [originator, setOriginator] = useState(originatorlar[0] ?? '')
  const [sonuc, setSonuc] = useState<SmsGonderActionSonuc | null>(null)
  const [isPending, startTransition] = useTransition()

  const kullanilabilirSablonlar = useMemo(
    () => sablonlar.filter(s => IZINLI_TURLER.includes(s.tur)),
    [sablonlar],
  )

  const liste = useMemo(
    () =>
      personeller
        .filter(p => ayNo(p.dogum_tarihi) === ay + 1)
        .sort((a, b) => gunNo(a.dogum_tarihi) - gunNo(b.dogum_tarihi) || a.ad_soyad.localeCompare(b.ad_soyad, 'tr')),
    [personeller, ay],
  )
  const secilebilir = useMemo(() => liste.filter(p => p.telefon_gecerli), [liste])
  const gonderilecek = liste.filter(p => p.telefon_gecerli && secili.has(p.sicil_no)).map(p => p.sicil_no)

  function gonder() {
    setSonuc(null)
    const sablon = kullanilabilirSablonlar.find(s => String(s.id) === sablonId)
    if (!sablon) {
      setSonuc({ hata: 'Önce bir doğum günü şablonu seçin. (Tanımlar → Mesaj Şablonları)' })
      return
    }
    if (!gonderilecek.length) {
      setSonuc({ hata: 'En az bir alıcı seçin.' })
      return
    }
    startTransition(async () => {
      const res = await smsGonderAction({
        metin: sablon.metin,
        originator,
        sicilNolar: gonderilecek,
        manuelNumaralar: '',
        baglam: 'dogum_gunu',
      })
      setSonuc(res)
      if (res.ok) {
        setSecili(new Set())
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" aria-label="Doğum ayı sekmeleri">
          {AYLAR.map((a, i) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAy(i)
                setSecili(new Set())
              }}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                ay === i
                  ? 'border-pink-600 text-pink-800 bg-pink-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {a}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-slate-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-800">
        <strong>{AYLAR[ay]}</strong> ayında doğan personel listeleniyor. Seçilenlere, <strong>Tanımlar</strong> ekranında
        ayarladığınız doğum günü şablonu <strong>kendi doğum günlerinde (09:00)</strong> iletilmek üzere planlanır.
        Mesajın başına otomatik «Sayın {'{ad_soyad}'}» eklenir; ayrı metin yazmanıza gerek yoktur.
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Doğum günü şablonu</label>
          <select
            value={sablonId}
            onChange={e => setSablonId(e.target.value)}
            className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">— Şablon seçin —</option>
            {kullanilabilirSablonlar.map(s => (
              <option key={s.id} value={s.id}>
                [{sablonTurEtiket(s.tur)}] {s.baslik}
              </option>
            ))}
          </select>
        </div>
        {originatorlar.length > 1 && (
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Gönderici başlığı</label>
            <select
              value={originator}
              onChange={e => setOriginator(e.target.value)}
              className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {originatorlar.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={gonder}
          disabled={isPending || !gonderimAcik || !gonderilecek.length}
          className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? 'Gönderiliyor…' : `SMS Gönder (${gonderilecek.length})`}
        </button>
      </div>

      {sonuc?.ok && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {(sonuc.gonderilen ?? 0) > 0 && <>{sonuc.gonderilen} alıcıya gönderildi. </>}
          {(sonuc.planlanan ?? 0) > 0 && <>{sonuc.planlanan} alıcıya doğum gününde iletilmek üzere planlandı. </>}
          {sonuc.mesajId ? `(ID: ${sonuc.mesajId})` : ''}
        </div>
      )}
      {sonuc?.hata && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{sonuc.hata}</div>
      )}
      {sonuc?.gecersiz && sonuc.gecersiz.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Atlanan ({sonuc.gecersiz.length}): {sonuc.gecersiz.join(', ')}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <SmsSecimListesi
          satirlar={liste.map(p => ({
            key: p.sicil_no,
            ad: `${p.sicil_no} · ${p.ad_soyad} · ${trTarih(p.dogum_tarihi)}`,
            altMetin: '',
            telefon: p.telefon,
            telefonGecerli: p.telefon_gecerli,
          }))}
          secili={secili}
          setSecili={setSecili}
          secilebilirKeyler={secilebilir.map(p => p.sicil_no)}
        />
      </div>
    </div>
  )
}
