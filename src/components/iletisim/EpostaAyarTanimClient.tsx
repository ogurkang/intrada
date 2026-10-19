'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface EpostaAyarGorunum {
  adres: string
  gorunen_ad: string
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
  imza_metin: string
  aktif: boolean
  sifre_var: boolean
}

interface Props {
  ayar: EpostaAyarGorunum
  onKaydet: (fd: FormData) => Promise<{ hata?: string; ok?: boolean }>
}

export default function EpostaAyarTanimClient({ ayar, onKaydet }: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    setBasari(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onKaydet(fd)
      if (res.hata) setHata(res.hata)
      else {
        setBasari('E-posta ayarları kaydedildi.')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">E-posta kutusu</h2>
        <p className="text-xs text-slate-500 mt-1">
          Gelen kutu IMAP, giden kutu SMTP. İkisi de SSL. Şifre boş bırakılırsa mevcut şifre korunur.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta adresi</label>
          <input name="adres" defaultValue={ayar.adres} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Görünen ad</label>
          <input name="gorunen_ad" defaultValue={ayar.gorunen_ad} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Gelen sunucu (IMAP)</label>
          <input name="imap_host" defaultValue={ayar.imap_host} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Gelen port</label>
          <input name="imap_port" defaultValue={ayar.imap_port} inputMode="numeric" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Giden sunucu (SMTP)</label>
          <input name="smtp_host" defaultValue={ayar.smtp_host} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Giden port</label>
          <input name="smtp_port" defaultValue={ayar.smtp_port} inputMode="numeric" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Şifre {ayar.sifre_var && <span className="text-xs text-slate-400">(tanımlı)</span>}
        </label>
        <input
          name="sifre"
          type="password"
          autoComplete="new-password"
          placeholder={ayar.sifre_var ? '•••••• (değiştirmek için yazın)' : 'Kutu şifresi'}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta imzası</label>
        <p className="text-xs text-slate-500 mb-2">
          Gönderen personelin ad soyadı, müdürlüğü ve görev unvanı mektubun altına kendiliğinden yazılır. Buraya adres ve
          telefon gibi sabit metni yazın; o bilgiler unvanın altında durur.
        </p>
        <textarea
          name="imza_metin"
          defaultValue={ayar.imza_metin}
          rows={5}
          placeholder={'Adapazarı Belediyesi\nİnsan Kaynakları ve Eğitim Müdürlüğü\nTelefon: …'}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="aktif" defaultChecked={ayar.aktif} />
        E-posta kutusu açık
      </label>

      {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{hata}</p>}
      {basari && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{basari}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  )
}
