'use client'

import { useState, useTransition } from 'react'
import { ppGostergeMetinKaydet } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/[alt_program_id]/actions'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'

export type PpGostergeForm = {
  id: number
  ad: string
  birim: string
  gerceklesme: number | null
  planlanan: number | null
  yilSonu: number | null
  hedef: number | null
  tahmin1: number | null
  tahmin2: number | null
  aciklama: string
  hesaplama: string
}

const BIRIM: Record<string, string> = {
  Yuzde: 'Yüzde (%)',
  Adet: 'Adet',
  Kisi: 'Kişi',
  Gun: 'Gün',
  Hektar: 'Hektar',
  Ton: 'Ton',
  Metre: 'Metre',
  Metrekare: 'Metrekare',
  Saat: 'Saat',
}

function metin(v: number | null): string {
  if (v == null || Number.isNaN(v)) return ''
  return String(v)
}

function sayi(v: string): number | null {
  const t = v.trim().replace(/\./g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

type Alan = 'gerceklesme' | 'planlanan' | 'yilSonu' | 'hedef' | 'tahmin1' | 'tahmin2' | 'aciklama' | 'hesaplama'

export default function PpFaaliyetGostergeClient({
  yil,
  altProgramId,
  programId,
  faaliyetId,
  faaliyetAdi,
  satirlar,
}: {
  yil: number
  altProgramId: number
  programId: number
  faaliyetId: number
  faaliyetAdi: string
  satirlar: PpGostergeForm[]
}) {
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()
  const [degerler, setDegerler] = useState<Record<number, Record<Alan, string>>>(() => {
    const m: Record<number, Record<Alan, string>> = {}
    for (const s of satirlar) {
      m[s.id] = {
        gerceklesme: metin(s.gerceklesme),
        planlanan: metin(s.planlanan),
        yilSonu: metin(s.yilSonu),
        hedef: metin(s.hedef),
        tahmin1: metin(s.tahmin1),
        tahmin2: metin(s.tahmin2),
        aciklama: s.aciklama,
        hesaplama: s.hesaplama,
      }
    }
    return m
  })
  const basliklar = [
    { alan: 'gerceklesme' as const, ad: `${yil - 2} Gerçekleşme` },
    { alan: 'planlanan' as const, ad: `${yil - 1} Planlanan` },
    { alan: 'yilSonu' as const, ad: `${yil - 1} Yıl Sonu Gerçekleşme Tahmini` },
    { alan: 'hedef' as const, ad: `${yil} Hedef` },
    { alan: 'tahmin1' as const, ad: `${yil + 1} Tahmin` },
    { alan: 'tahmin2' as const, ad: `${yil + 2} Tahmin` },
  ]

  function kaydet() {
    setHata(null)
    start(async () => {
      const s = await ppGostergeMetinKaydet(altProgramId, yil, programId, faaliyetId, satirlar.map(g => {
        const v = degerler[g.id]
        return {
          gosterge_id: g.id,
          gerceklesme: sayi(v?.gerceklesme ?? ''),
          planlanan: sayi(v?.planlanan ?? ''),
          yilSonu: sayi(v?.yilSonu ?? ''),
          hedef: sayi(v?.hedef ?? ''),
          tahmin1: sayi(v?.tahmin1 ?? ''),
          tahmin2: sayi(v?.tahmin2 ?? ''),
          aciklama: v?.aciklama ?? '',
          hesaplama: v?.hesaplama ?? '',
        }
      }))
      if (s.hata) setHata(s.hata)
      else window.close()
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800">{faaliyetAdi}</h1>
          <PpEkranBilgi maddeler={[
            { baslik: 'Yıl kutuları', metin: 't−2, t−1 ve t hedefi ile sonraki tahminler stratejik plandaki gösterge yıllarından gelir. Burada yazılan değer o yılın performans programı raporuna gider.' },
            { baslik: 'Açıklama ve hesaplama', metin: 'Excel’deki gösterge açıklaması ve hesaplama yöntemi alanlarını doldurur. Sorumlu idareye müdürlük adı yazılır.' },
            { baslik: 'Kaydet', metin: 'Bu faaliyetin gösterge metinlerini ve yıl değerlerini kaydeder, sekmeyi kapatır. Göstergenin kendisini silmez.' },
          ]} />
        </div>
        <p className="text-sm font-normal text-slate-500 mt-1">Performans göstergeleri</p>
      </div>
      {hata && <p className="text-sm text-red-700">{hata}</p>}
      {satirlar.length === 0 ? (
        <p className="text-sm text-slate-500">Bu faaliyete bağlı performans göstergesi yok.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-auto max-h-[75vh]">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-left w-48">Performans Göstergesi</th>
                  <th className="sticky top-0 z-10 bg-slate-100 px-2 py-2 text-left w-24">Ölçü Birimi</th>
                  {basliklar.map(b => <th key={b.alan} className="sticky top-0 z-10 bg-slate-100 px-1 py-2 text-center w-20">{b.ad}</th>)}
                  <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-left">Göstergeye İlişkin Açıklama</th>
                  <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-left">Hesaplama Yöntemi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {satirlar.map(g => {
                  const v = degerler[g.id]
                  return (
                    <tr key={g.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">{g.ad}</td>
                      <td className="px-3 py-2 text-slate-600">{BIRIM[g.birim] ?? g.birim}</td>
                      {basliklar.map(b => (
                        <td key={b.alan} className="px-1 py-2 w-20">
                          <input
                            value={v?.[b.alan] ?? ''}
                            onChange={e => setDegerler(prev => ({ ...prev, [g.id]: { ...v, [b.alan]: e.target.value } }))}
                            className="w-full px-1 py-1 border border-slate-300 rounded text-center"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <textarea value={v?.aciklama ?? ''} onChange={e => setDegerler(prev => ({ ...prev, [g.id]: { ...v, aciklama: e.target.value } }))} rows={2} className="w-full px-2 py-1 border border-slate-300 rounded" />
                      </td>
                      <td className="px-3 py-2">
                        <textarea value={v?.hesaplama ?? ''} onChange={e => setDegerler(prev => ({ ...prev, [g.id]: { ...v, hesaplama: e.target.value } }))} rows={2} className="w-full px-2 py-1 border border-slate-300 rounded" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" disabled={bekliyor || satirlar.length === 0} onClick={kaydet} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50">
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
