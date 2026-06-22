'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SmsGonderInput, SmsGonderActionSonuc } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import { sablonTurEtiket } from '@/lib/sms-sablon'

export interface SablonSecenek {
  id: number
  tur: string
  baslik: string
  metin: string
}

interface Props {
  sablonlar: SablonSecenek[]
  izinliTurler: string[]
  originatorlar: string[]
  baglam: string
  sicilNolar: string[]
  manuelNumaralar?: string
  cocukAdiBySicil?: Record<string, string>
  manuelAdet?: number
  gonderimAcik: boolean
  bilgiMetni?: string
  onGonder: (input: SmsGonderInput) => Promise<SmsGonderActionSonuc>
  onBasarili?: () => void
}

function smsAdedi(uzunluk: number): number {
  if (uzunluk === 0) return 0
  if (uzunluk <= 160) return 1
  return Math.ceil(uzunluk / 153)
}

export default function SmsMesajGonderKutusu({
  sablonlar,
  izinliTurler,
  originatorlar,
  baglam,
  sicilNolar,
  manuelNumaralar = '',
  cocukAdiBySicil,
  manuelAdet = 0,
  gonderimAcik,
  bilgiMetni,
  onGonder,
  onBasarili,
}: Props) {
  const router = useRouter()
  const [mesaj, setMesaj] = useState('')
  const [originator, setOriginator] = useState(originatorlar[0] ?? '')
  const [sonuc, setSonuc] = useState<SmsGonderActionSonuc | null>(null)
  const [isPending, startTransition] = useTransition()

  const kullanilabilirSablonlar = useMemo(
    () => sablonlar.filter(s => izinliTurler.includes(s.tur)),
    [sablonlar, izinliTurler],
  )

  const toplamAlici = sicilNolar.length + manuelAdet

  function sablonSec(id: string) {
    const s = kullanilabilirSablonlar.find(x => String(x.id) === id)
    if (s) setMesaj(s.metin)
  }

  function gonder() {
    setSonuc(null)
    if (!mesaj.trim()) {
      setSonuc({ hata: 'Mesaj boş olamaz.' })
      return
    }
    if (toplamAlici === 0) {
      setSonuc({ hata: 'En az bir alıcı seçin.' })
      return
    }
    startTransition(async () => {
      const res = await onGonder({
        metin: mesaj.trim(),
        originator,
        sicilNolar,
        manuelNumaralar,
        cocukAdiBySicil,
        baglam,
      })
      setSonuc(res)
      if (res.ok) {
        setMesaj('')
        onBasarili?.()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kullanilabilirSablonlar.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Şablon seç</label>
            <select
              defaultValue=""
              onChange={e => sablonSec(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">— Şablon —</option>
              {kullanilabilirSablonlar.map(s => (
                <option key={s.id} value={s.id}>
                  [{sablonTurEtiket(s.tur)}] {s.baslik}
                </option>
              ))}
            </select>
          </div>
        )}
        {originatorlar.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Gönderici başlığı</label>
            <select
              value={originator}
              onChange={e => setOriginator(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {originatorlar.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {bilgiMetni && (
        <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">{bilgiMetni}</p>
      )}

      <div>
        <textarea
          value={mesaj}
          onChange={e => setMesaj(e.target.value)}
          rows={5}
          maxLength={900}
          placeholder="Mesaj metni… ({ad_soyad}, {ad}, {cocuk_adi} otomatik doldurulur)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">
          {mesaj.length} karakter · {smsAdedi(mesaj.length)} SMS · Toplam alıcı: <strong>{toplamAlici}</strong>
        </p>
      </div>

      <button
        type="button"
        onClick={gonder}
        disabled={isPending || !gonderimAcik || toplamAlici === 0}
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? 'Gönderiliyor…' : `SMS Gönder (${toplamAlici})`}
      </button>

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
    </div>
  )
}
