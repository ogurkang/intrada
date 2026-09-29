'use client'

import { useState } from 'react'
import { kullaniciAdiDuyurusunuKapat } from '@/app/(dashboard)/hesap/actions'
import type { KullaniciAdiGirisDuyurusu } from '@/lib/kullanici-adi'

export function KullaniciAdiGirisDuyuru({
  tur,
  kullaniciAdi,
}: {
  tur: KullaniciAdiGirisDuyurusu
  kullaniciAdi: string
}) {
  const [acik, setAcik] = useState(true)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  if (!acik) return null

  const metin =
    tur === 'degisti'
      ? `Kullanıcı adınız ${kullaniciAdi} olarak değiştirilmiştir. Artık kullanıcı adınız ile de giriş yapabilirsiniz.`
      : `Girişlerinizi ${kullaniciAdi} kullanıcı adını kullanarak da yapabilirsiniz.`

  async function kapat() {
    if (bekliyor) return
    setBekliyor(true)
    setHata(null)
    const r = await kullaniciAdiDuyurusunuKapat()
    setBekliyor(false)
    if (r.hata) {
      setHata(r.hata)
      return
    }
    setAcik(false)
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kullanici-adi-duyuru-baslik"
    >
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="kullanici-adi-duyuru-baslik" className="sr-only">
          Kullanıcı adı bildirimi
        </h2>
        <p className="text-sm leading-relaxed text-slate-800">{metin}</p>
        {hata ? <p className="mt-3 text-sm text-red-600">{hata}</p> : null}
        <button
          type="button"
          onClick={kapat}
          disabled={bekliyor}
          autoFocus
          className="mt-5 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {bekliyor ? 'Kapatılıyor…' : 'Tamam'}
        </button>
      </div>
    </div>
  )
}
