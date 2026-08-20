'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { kysBaslikEkle, kysBelgeKaydet, kysBelgeYuklemeHazirla } from '@/app/(dashboard)/kys/actions'
import { kysBelgeStorageYukle } from '@/lib/kys-belge-yukle'
import { KYS_BELGE_MAX_BOYUT } from '@/lib/kys'
import SorumluBirimCokluSecim, { birimListToString } from '@/components/kys/SorumluBirimCokluSecim'
import type { KysMudurlukSecenek } from '@/components/kys/KysBaslikListeClient'

type YeniBaslikSatiri = {
  kod: string
  baslik: string
  aciklama: string
  birimler: string[]
  dosyalar: File[]
}

interface Props {
  menuId: number
  menuLabel: string
  mudurlukler: KysMudurlukSecenek[]
}

function bosSatir(): YeniBaslikSatiri {
  return { kod: '', baslik: '', aciklama: '', birimler: [], dosyalar: [] }
}

export default function KysBaslikEkleYeniSekmeClient({ menuId, menuLabel, mudurlukler }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [yeniSatirlar, setYeniSatirlar] = useState<YeniBaslikSatiri[]>([bosSatir()])

  function pencereyiKapatVeYenile() {
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.location.reload()
      } catch {
        // noop
      }
      window.close()
      return
    }
    router.replace(`/kys/m/${menuId}`)
  }

  function kaydet() {
    setHata(null)
    startTransition(async () => {
      for (const satir of yeniSatirlar) {
        if (satir.baslik.trim().length < 2) continue
        if (satir.dosyalar.some(file => file.size > KYS_BELGE_MAX_BOYUT)) {
          setHata('Dosya en fazla 50 MB olabilir.')
          return
        }
        const fd = new FormData()
        fd.set('menu_id', String(menuId))
        fd.set('baslik', satir.baslik)
        fd.set('kod', satir.kod)
        fd.set('aciklama', satir.aciklama)
        fd.set('sorumlu_birim', birimListToString(satir.birimler))
        const res = await kysBaslikEkle(fd)
        if (res.hata || !res.id) {
          setHata(res.hata ?? 'Başlık eklenemedi.')
          return
        }
        for (const file of satir.dosyalar) {
          const hazirlikFd = new FormData()
          hazirlikFd.set('baslik_id', String(res.id))
          hazirlikFd.set('dosya_adi', file.name)
          hazirlikFd.set('boyut', String(file.size))
          const hazirlik = await kysBelgeYuklemeHazirla(hazirlikFd)
          if (hazirlik.hata || !hazirlik.path || !hazirlik.token) {
            setHata(hazirlik.hata ?? 'Yükleme başlatılamadı.')
            return
          }
          const yuklemeHatasi = await kysBelgeStorageYukle(hazirlik.path, hazirlik.token, file)
          if (yuklemeHatasi) {
            setHata(`Dosya yüklenemedi: ${yuklemeHatasi}`)
            return
          }
          const kayitFd = new FormData()
          kayitFd.set('baslik_id', String(res.id))
          kayitFd.set('sorumlu_birim', birimListToString(satir.birimler))
          kayitFd.set('storage_path', hazirlik.path)
          kayitFd.set('dosya_adi', file.name)
          kayitFd.set('boyut', String(file.size))
          const kayit = await kysBelgeKaydet(kayitFd)
          if (kayit.hata) {
            setHata(kayit.hata)
            return
          }
        }
      }
      pencereyiKapatVeYenile()
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{menuLabel} — Başlık Ekle</h1>
          <p className="text-sm text-slate-500">Kaydet sonrası sekme kapanır ve önceki sayfa yenilenir.</p>
        </div>
        <Link href={`/kys/m/${menuId}`} className="text-sm text-slate-500 hover:text-slate-700">
          Sayfaya dön
        </Link>
      </div>

      {yeniSatirlar.map((satir, idx) => (
        <div key={idx} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Başlık Satırı #{idx + 1}</span>
            {yeniSatirlar.length > 1 ? (
              <button
                type="button"
                onClick={() => setYeniSatirlar(yeniSatirlar.filter((_, i) => i !== idx))}
                className="text-xs text-red-600"
              >
                Satırı Sil
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Kod</label>
              <input
                value={satir.kod}
                onChange={e => setYeniSatirlar(yeniSatirlar.map((s, i) => (i === idx ? { ...s, kod: e.target.value } : s)))}
                maxLength={40}
                placeholder="KYS-01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
              <input
                value={satir.baslik}
                onChange={e => setYeniSatirlar(yeniSatirlar.map((s, i) => (i === idx ? { ...s, baslik: e.target.value } : s)))}
                maxLength={120}
                placeholder="Prosedür Adı"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim</label>
              <SorumluBirimCokluSecim
                value={satir.birimler}
                onChange={next => setYeniSatirlar(yeniSatirlar.map((s, i) => (i === idx ? { ...s, birimler: next } : s)))}
                mudurlukler={mudurlukler}
              />
            </div>
            <div className="lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Dosyalar</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,application/pdf"
                onChange={e =>
                  setYeniSatirlar(
                    yeniSatirlar.map((s, i) => (i === idx ? { ...s, dosyalar: Array.from(e.target.files ?? []) } : s)),
                  )
                }
                className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1.5 file:text-xs file:font-medium"
              />
            </div>
          </div>
        </div>
      ))}

      {hata ? <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{hata}</p> : null}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYeniSatirlar([...yeniSatirlar, bosSatir()])}
          className="rounded-lg border border-dashed border-slate-400 px-3 py-2 text-xs font-medium text-slate-700"
        >
          + Satır Ekle
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pencereyiKapatVeYenile}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={kaydet}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
