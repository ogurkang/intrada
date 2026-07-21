'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface SmsAyarGorunum {
  api_base_url: string
  kullanici_adi: string
  originator: string
  originator2: string
  originator3: string
  turkce_karakter: boolean
  aktif: boolean
  sifre_var: boolean
}

interface Props {
  ayar: SmsAyarGorunum
  onKaydet: (fd: FormData) => Promise<{ hata?: string; ok?: boolean }>
  onKrediSorgula: () => Promise<{ kredi?: string; hata?: string }>
}

export default function SmsAyarTanimClient({ ayar, onKaydet, onKrediSorgula }: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [kredi, setKredi] = useState<string | null>(null)
  const [krediHata, setKrediHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [krediPending, startKredi] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    setBasari(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onKaydet(fd)
      if (res.hata) setHata(res.hata)
      else {
        setBasari('SMS ayarları kaydedildi.')
        router.refresh()
      }
    })
  }

  function krediSorgula() {
    setKredi(null)
    setKrediHata(null)
    startKredi(async () => {
      const res = await onKrediSorgula()
      if (res.hata) setKrediHata(res.hata)
      else setKredi(res.kredi ?? '—')
    })
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">SMS Sağlayıcı (mesajpaketi.com)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kullanıcı adı genellikle hesabınıza tanımlı GSM numarasıdır. Şifre alanı boş bırakılırsa mevcut şifre korunur.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">API Adresi</label>
          <input
            name="api_base_url"
            defaultValue={ayar.api_base_url}
            placeholder="https://www.mesajpaketi.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kullanıcı Adı (GSM)</label>
            <input
              name="kullanici_adi"
              defaultValue={ayar.kullanici_adi}
              autoComplete="off"
              placeholder="5XXXXXXXXX"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Şifre {ayar.sifre_var && <span className="text-xs text-slate-400">(tanımlı)</span>}
            </label>
            <input
              name="sifre"
              type="password"
              autoComplete="new-password"
              placeholder={ayar.sifre_var ? '•••••• (değiştirmek için yazın)' : 'Şifre'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Gönderici Başlıkları (Originator)</label>
          <p className="text-xs text-slate-500 mb-2">
            En fazla 3 onaylı başlık tanımlayın. Gönderim ekranında hangisini kullanacağınızı seçebilirsiniz. İlk başlık
            varsayılandır.
          </p>
          <div className="space-y-2">
            <input
              name="originator"
              defaultValue={ayar.originator}
              placeholder="1. Başlık (varsayılan)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            <input
              name="originator2"
              defaultValue={ayar.originator2}
              placeholder="2. Başlık (opsiyonel)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            <input
              name="originator3"
              defaultValue={ayar.originator3}
              placeholder="3. Başlık (opsiyonel)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="turkce_karakter" defaultChecked={ayar.turkce_karakter} />
            Türkçe karakter desteği
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="aktif" defaultChecked={ayar.aktif} />
            SMS gönderimi aktif
          </label>
        </div>

        {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{hata}</p>}
        {basari && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{basari}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="intrada-btn intrada-btn-kaydet"
          >
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={krediSorgula}
            disabled={krediPending}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {krediPending ? 'Sorgulanıyor…' : 'Kredi Sorgula'}
          </button>
          {kredi != null && (
            <span className="text-sm text-emerald-700">Kalan kredi: <strong>{kredi}</strong></span>
          )}
          {krediHata && <span className="text-sm text-red-600">{krediHata}</span>}
        </div>
      </form>
    </div>
  )
}
