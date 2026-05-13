'use client'

import { useState } from 'react'
import DonemListClient, { type Donem, type IzinSatir } from '@/components/kesintiler/DonemListClient'

type ModulSekme = 'rmy' | 'ivy' | 'izy'

interface ModulVeri {
  donemler: Donem[]
  kuralMetni: string
  detayBase: string
  onEkle:        (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle:    (id: number, fd: FormData) => Promise<{ hata?: string }>
  onKapat:       (id: number) => Promise<{ hata?: string }>
  onAc:          (id: number) => Promise<{ hata?: string }>
  onSecimGetir:  (donem_id: number) => Promise<{ izinler: IzinSatir[]; secimler: { izin_sira_no: string; dahil: boolean }[] }>
  onSecimKaydet: (donem_id: number, secimler: { izin_sira_no: string; dahil: boolean }[]) => Promise<{ hata?: string }>
}

interface Props {
  rmy: ModulVeri
  ivy: ModulVeri
  izy: ModulVeri
}

const SEKME_TANIMLAR: { key: ModulSekme; baslik: string; kod: string; renk: string }[] = [
  { key: 'rmy', baslik: 'Raporlu Memurlar',  kod: 'RMY', renk: 'orange' },
  { key: 'ivy', baslik: 'İzinli Vekiller',   kod: 'İVY', renk: 'blue'   },
  { key: 'izy', baslik: 'İzinli Zabıtalar',  kod: 'İZY', renk: 'purple' },
]

const SEKME_RENK: Record<string, string> = {
  orange: 'border-orange-500 text-orange-700',
  blue:   'border-blue-500 text-blue-700',
  purple: 'border-purple-500 text-purple-700',
}

export default function SosyalHakKesintileriClient({ rmy, ivy, izy }: Props) {
  const [aktifSekme, setAktifSekme] = useState<ModulSekme>('rmy')

  const modulVeri: Record<ModulSekme, ModulVeri> = { rmy, ivy, izy }
  const aktifVeri = modulVeri[aktifSekme]
  const aktifTanim = SEKME_TANIMLAR.find(s => s.key === aktifSekme)!

  return (
    <div>
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sosyal Hak Kesintileri</h1>
        <p className="text-sm text-slate-500 mt-0.5">Raporlu Memurlar, İzinli Vekiller ve İzinli Zabıtalar birleşik yönetimi</p>
      </div>

      {/* Modül sekmeleri */}
      <div className="flex gap-0 mb-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm">
        {SEKME_TANIMLAR.map(s => {
          const veri = modulVeri[s.key]
          const acikSayi = veri.donemler.filter(d => d.durum === 'Açık').length
          const aktif = aktifSekme === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setAktifSekme(s.key)}
              className={`flex-1 flex flex-col items-center gap-1 px-4 py-4 text-sm font-medium transition-all border-b-4 ${
                aktif
                  ? `bg-white ${SEKME_RENK[s.renk]} shadow-sm`
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                aktif
                  ? s.renk === 'orange' ? 'bg-orange-100 text-orange-700'
                  : s.renk === 'blue'   ? 'bg-blue-100 text-blue-700'
                  :                        'bg-purple-100 text-purple-700'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {s.kod}
              </span>
              <span>{s.baslik}</span>
              {acikSayi > 0 && (
                <span className="text-xs text-amber-600 font-medium">{acikSayi} açık</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Aktif modül içeriği */}
      <DonemListClient
        key={aktifSekme}
        baslik={`${aktifTanim.baslik} (${aktifTanim.kod})`}
        kod={aktifTanim.kod}
        donemler={aktifVeri.donemler}
        kuralMetni={aktifVeri.kuralMetni}
        hideSecimColumn
        detayBase={aktifVeri.detayBase}
        onEkle={aktifVeri.onEkle}
        onGuncelle={aktifVeri.onGuncelle}
        onKapat={aktifVeri.onKapat}
        onAc={aktifVeri.onAc}
        onSecimGetir={aktifVeri.onSecimGetir}
        onSecimKaydet={aktifVeri.onSecimKaydet}
      />
    </div>
  )
}
