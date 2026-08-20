'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import PersonelTekAlanTopluClient from '@/components/personel/PersonelTekAlanTopluClient'
import { TASINIR_GOREVI_OPTIONS } from '@/lib/tasinir-gorevi'
import { tasinirGorevlendirmeTamamlandi } from '@/app/(dashboard)/personel/tasinir-gorevlendirme/actions'

interface Satir {
  sicil_no: string
  public_id: string
  ad_soyad: string
  tckn: string | null
  deger: string | null
}

interface Props {
  data: Satir[]
  onSatirKaydet: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  onTopluKaydet: (satirlar: { sicil_no: string; deger: string | null }[]) => Promise<{ hata?: string; kaydedilen?: number }>
}

export default function TasinirGorevlendirmeClient({ data, onSatirKaydet, onTopluKaydet }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tamamHata, setTamamHata] = useState<string | null>(null)

  function handleTamamlandi() {
    if (!confirm('Taşınır görevlendirme tamamlandı olarak işaretlenecek ve sol menüden kaldırılacak. Devam edilsin mi?')) {
      return
    }
    setTamamHata(null)
    startTransition(async () => {
      const res = await tasinirGorevlendirmeTamamlandi()
      if (res.hata) {
        setTamamHata(res.hata)
        return
      }
      router.push('/personel')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 max-w-2xl">
          Geçici toplu görevlendirme ekranı. İşlem bitince{' '}
          <strong>Görevlendirme Tamamlandı</strong> ile menüden kaldırabilirsiniz. Kayıtlar personel
          kartı → Görevlendirme Bilgileri → Taşınır Görevi bölümünde görünür.
        </div>
        <button
          type="button"
          onClick={handleTamamlandi}
          disabled={isPending}
          className="shrink-0 px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? 'Kaldırılıyor…' : 'Görevlendirme Tamamlandı'}
        </button>
      </div>
      {tamamHata && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{tamamHata}</p>
      )}
      <PersonelTekAlanTopluClient
        baslik="Taşınır Görevlendirme (geçici)"
        alanEtiketi="Taşınır Görevi"
        data={data}
        inputType="select"
        secenekler={[...TASINIR_GOREVI_OPTIONS]}
        bosSecenekEtiketi="Seçiniz"
        sortBy="ad_soyad"
        onSatirKaydet={onSatirKaydet}
        onTopluKaydet={onTopluKaydet}
      />
    </div>
  )
}
