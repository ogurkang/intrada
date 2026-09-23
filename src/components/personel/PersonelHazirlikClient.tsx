'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { personelHazirlikKaydet } from '@/app/(dashboard)/personel/[sicil_no]/hazirlik/actions'

type Props = {
  personel: {
    sicil_no: string
    public_id: string
    ad_soyad: string
    bilgisayar_kullaniyor: boolean | null
    th_hizmet_baslangic: string | null
    yuruttugu_unvan_id: number | null
  }
  unvanlar: { id: number; unvan_adi: string }[]
  ogrenimTamam: boolean
  ogrenimAciklama: string
}

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'

export default function PersonelHazirlikClient({
  personel,
  unvanlar,
  ogrenimTamam,
  ogrenimAciklama,
}: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const ogrenimHref =
    `/bildirim/ogrenim/yeni?sicil=${encodeURIComponent(personel.sicil_no)}&onboarding=1`

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ogrenimTamam) {
      setHata('Önce kazanca esas varsayılan öğrenim kaydını tamamlayın.')
      return
    }
    const formData = new FormData(event.currentTarget)
    setHata(null)
    startTransition(async () => {
      const sonuc = await personelHazirlikKaydet(personel.sicil_no, formData)
      if (sonuc.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push(
        `/personel-hareketleri/ekle?hareket_tipi=IlkAtanma&sicil=${encodeURIComponent(personel.sicil_no)}&onboarding=1`,
      )
    })
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-500">Yeni personel kaydı · 3/4</p>
        <h1 className="text-2xl font-bold text-slate-800">Personel hareketine hazırlık</h1>
        <p className="mt-1 text-sm text-slate-600">
          {personel.ad_soyad} <span className="font-mono text-slate-400">({personel.sicil_no})</span>
        </p>
      </div>

      <div className={`rounded-xl border p-4 ${ogrenimTamam ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-800">
              {ogrenimTamam ? '✓ Öğrenim bilgisi hazır' : 'Eksik: Öğrenim bilgisi'}
            </p>
            <p className="mt-1 text-sm text-slate-600">{ogrenimAciklama}</p>
          </div>
          {!ogrenimTamam && (
            <Link href={ogrenimHref} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">
              Öğrenimi tamamla
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-semibold text-slate-800">Kazancı etkileyen bilgiler</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bu bilgiler yalnızca personelin ana kaydında tutulur; hareket ve terfi kayıtlarına kopyalanmaz.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Bilgisayar kullanıyor mu? <span className="text-red-500">*</span>
            <select
              name="bilgisayar_kullaniyor"
              required
              defaultValue={
                personel.bilgisayar_kullaniyor == null
                  ? ''
                  : personel.bilgisayar_kullaniyor
                    ? 'evet'
                    : 'hayir'
              }
              className={`mt-1 ${inputCls}`}
            >
              <option value="">— Seçin —</option>
              <option value="evet">Evet</option>
              <option value="hayir">Hayır</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-400">
              V.H.K.İ. ve Bilgisayar İşletmeni yan ödemesinde kullanılır.
            </span>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Teknik hizmet başlangıç tarihi
            <input
              name="th_hizmet_baslangic"
              type="date"
              defaultValue={personel.th_hizmet_baslangic?.slice(0, 10) ?? ''}
              className={`mt-1 ${inputCls}`}
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">
              Yalnız TH sınıfında uygulanır; değilse boş bırakın.
            </span>
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Yürüttüğü unvan
            <select
              name="yuruttugu_unvan_id"
              defaultValue={personel.yuruttugu_unvan_id ?? ''}
              className={`mt-1 ${inputCls}`}
            >
              <option value="">— Uygulanmaz —</option>
              {unvanlar.map(unvan => (
                <option key={unvan.id} value={unvan.id}>{unvan.unvan_adi}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-400">
              Seçilirse SDS hesabı bu unvanın kazanç kuralından alınır.
            </span>
          </label>
        </div>

        {hata && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{hata}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Link href={`/link/${personel.public_id}`} className="text-sm text-slate-500 hover:text-slate-800">
            Daha sonra tamamla
          </Link>
          <button
            type="submit"
            disabled={isPending || !ogrenimTamam}
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor…' : 'Kaydet ve personel hareketine geç'}
          </button>
        </div>
      </form>
    </div>
  )
}
