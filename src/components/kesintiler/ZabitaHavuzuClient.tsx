'use client'

import { useState, useTransition } from 'react'
import type { ZabitaHavuzSatir } from '@/lib/ayy-zabita-havuz'
import { ayyZabitaHavuzuTopluKaydet } from '@/app/(dashboard)/kesintiler/zabita-havuz-actions'

interface Props {
  satirlar: ZabitaHavuzSatir[]
  closeAfterSave?: boolean
}

export default function ZabitaHavuzuClient({ satirlar: baslangic, closeAfterSave = false }: Props) {
  const [satirlar, setSatirlar] = useState(baslangic)
  const [kaydedildi, setKaydedildi] = useState(false)
  const [isPending, startTransition] = useTransition()

  function guncelle(sicil_no: string, zabitaKesintiAktif: boolean) {
    setKaydedildi(false)
    setSatirlar(prev => prev.map(r => (r.sicil_no === sicil_no ? { ...r, zabitaKesintiAktif } : r)))
  }

  function toggle(r: ZabitaHavuzSatir) {
    guncelle(r.sicil_no, !r.zabitaKesintiAktif)
  }

  function kaydet() {
    const normalSiciller = satirlar
      .filter(r => !r.zabitaKesintiAktif)
      .map(r => r.sicil_no)
    startTransition(async () => {
      const res = await ayyZabitaHavuzuTopluKaydet(normalSiciller)
      if (res.hata) {
        alert(res.hata)
        return
      }
      setKaydedildi(true)
      if (closeAfterSave) {
        window.close()
      }
    })
  }

  if (satirlar.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4">
        Aktif kadroda Zabıta Müdürlüğü / zabıta unvanı eşleşen personel bulunamadı.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-200 bg-amber-50">
        <h2 className="font-semibold text-slate-800">Zabıta Havuzu (AYY)</h2>
        <p className="text-xs text-slate-600 mt-1">
          Varsayılan: zabıta kesinti kuralları (takvim günü, 30 gün tabanı). Havuzdan çıkardığınız siciller
          diğer memurlar gibi <strong>normal kesinti</strong> (çalışma günü, dönem YG−IZ) ile hesaplanır.
        </p>
      </div>
      <div className="overflow-x-auto max-h-[min(420px,50vh)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/80 border-b border-amber-100 text-left">
              <th className="px-4 py-2.5 font-semibold text-slate-600">Sicil</th>
              <th className="px-4 py-2.5 font-semibold text-slate-600">Ad Soyad</th>
              <th className="px-4 py-2.5 font-semibold text-slate-600 text-center">Kural</th>
              <th className="px-4 py-2.5 font-semibold text-slate-600 w-40">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 bg-white">
            {satirlar.map(r => (
              <tr key={r.sicil_no} className="hover:bg-amber-50/60">
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{r.sicil_no}</td>
                <td className="px-4 py-2 text-slate-800">{r.ad_soyad}</td>
                <td className="px-4 py-2 text-center">
                  {r.zabitaKesintiAktif ? (
                    <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded">Zabıta</span>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Normal</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => toggle(r)}
                    className="text-xs font-medium text-amber-900 underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {r.zabitaKesintiAktif ? 'Havuzdan çıkar (normal kesinti)' : 'Zabıta kesintisine geri al'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-amber-200 bg-white flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Değişiklikleri uygulamak için kaydedin.
          {kaydedildi ? <span className="ml-2 text-emerald-700 font-medium">Kaydedildi.</span> : null}
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={kaydet}
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
        >
          {isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
