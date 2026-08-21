'use client'

import type { InputHTMLAttributes } from 'react'
import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { KalemDuzenleDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { disDenetciGuncelle, disDenetciOlustur } from './actions'
import { DIS_DENETCI_SIFRE_MAX, DIS_DENETCI_SIFRE_MIN, disDenetciSifreHataMetni } from '@/lib/dis-denetci-sifre'

type Denetci = {
  id: string
  kullanici_adi: string | null
  ad_soyad: string | null
  kurum_adi: string | null
  e_posta: string | null
  hesap_aktif: boolean
  updated_at: string
}

export default function DisDenetcilerClient({ denetciler }: { denetciler: Denetci[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [ekleAcik, setEkleAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState<Denetci | null>(null)
  const [hata, setHata] = useState<string | null>(null)

  function gonder(form: HTMLFormElement, islem: (fd: FormData) => Promise<{ hata?: string }>, basarili: () => void) {
    setHata(null)
    startTransition(async () => {
      const sonuc = await islem(new FormData(form))
      if (sonuc.hata) return setHata(sonuc.hata)
      basarili()
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/yetkilendirme" className="text-sm text-slate-500 hover:text-slate-700">← Çalışan Yetkilendirme</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">Dış Denetçiler</h1>
          <p className="mt-1 text-sm text-slate-500">Yalnızca Denetim Yönetimi’ni görüntüleyen kurum dışı hesaplar.</p>
        </div>
        <button onClick={() => { setHata(null); setEkleAcik(true) }} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
          Dış Denetçi Ekle
        </button>
      </div>

      {hata && !ekleAcik && !duzenlenen && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{hata}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Kullanıcı Adı</th><th className="px-4 py-3">Ad Soyad</th>
              <th className="px-4 py-3">Kurum</th><th className="px-4 py-3">E-posta</th>
              <th className="px-4 py-3">Durum</th><th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {denetciler.map(d => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-800">{d.kullanici_adi}</td>
                <td className="px-4 py-3">{d.ad_soyad}</td><td className="px-4 py-3">{d.kurum_adi}</td>
                <td className="px-4 py-3">{d.e_posta ?? '—'}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${d.hesap_aktif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{d.hesap_aktif ? 'Aktif' : 'Pasif'}</span></td>
                <td className="px-4 py-3 text-right"><KalemDuzenleDugmesi onClick={() => { setHata(null); setDuzenlenen(d) }} /></td>
              </tr>
            ))}
            {!denetciler.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Henüz dış denetçi eklenmedi.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={ekleAcik} onClose={() => setEkleAcik(false)} title="Dış Denetçi Ekle">
        <form ref={formRef} className="space-y-4" onSubmit={e => { e.preventDefault(); gonder(e.currentTarget, disDenetciOlustur, () => { setEkleAcik(false); formRef.current?.reset() }) }}>
          <Alan name="kullanici_adi" label="Kullanıcı Adı" required placeholder="MISAFIR2" />
          <Alan name="ad_soyad" label="Ad Soyad" required />
          <Alan name="kurum_adi" label="Kurum Adı" required placeholder="Sayıştay" />
          <Alan name="e_posta" label="E-posta (opsiyonel)" type="email" />
          <Alan name="sifre" label="İlk Şifre" type="password" required minLength={DIS_DENETCI_SIFRE_MIN} maxLength={DIS_DENETCI_SIFRE_MAX} />
          <p className="text-xs text-slate-500">{disDenetciSifreHataMetni()}</p>
          {hata && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{hata}</p>}
          <Kaydet disabled={isPending} />
        </form>
      </Modal>

      <Modal open={Boolean(duzenlenen)} onClose={() => setDuzenlenen(null)} title="Dış Denetçiyi Düzenle">
        {duzenlenen && (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); gonder(e.currentTarget, disDenetciGuncelle, () => setDuzenlenen(null)) }}>
            <input type="hidden" name="id" value={duzenlenen.id} />
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-500">Kullanıcı adı:</span> <strong>{duzenlenen.kullanici_adi}</strong></div>
            <Alan name="ad_soyad" label="Ad Soyad" required defaultValue={duzenlenen.ad_soyad ?? ''} />
            <Alan name="kurum_adi" label="Kurum Adı" required defaultValue={duzenlenen.kurum_adi ?? ''} />
            <Alan name="e_posta" label="E-posta (opsiyonel)" type="email" defaultValue={duzenlenen.e_posta ?? ''} />
            <Alan name="yeni_sifre" label="Yeni Şifre (değişmeyecekse boş)" type="password" minLength={DIS_DENETCI_SIFRE_MIN} maxLength={DIS_DENETCI_SIFRE_MAX} />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="hesap_aktif" defaultChecked={duzenlenen.hesap_aktif} /> Hesap aktif</label>
            {hata && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{hata}</p>}
            <Kaydet disabled={isPending} />
          </form>
        )}
      </Modal>
    </div>
  )
}

function Alan(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props
  return <label className="block text-sm font-medium text-slate-700">{label}<input {...inputProps} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
}

function Kaydet({ disabled }: { disabled: boolean }) {
  return <button disabled={disabled} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{disabled ? 'Kaydediliyor…' : 'Kaydet'}</button>
}
