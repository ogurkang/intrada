'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { grupOlustur } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/grup/actions'
import { smsGonderAction } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import SmsMesajGonderKutusu from './SmsMesajGonderKutusu'
import type { SmsGrup } from '@/lib/sms-grup'
import type { SmsPersonelSatir, SmsSablonSecenek } from '@/lib/sms-islemleri-tipleri'

interface Props {
  gruplar: SmsGrup[]
  personeller: SmsPersonelSatir[]
  sablonlar: SmsSablonSecenek[]
  originatorlar: string[]
  gonderimAcik: boolean
}

export default function SmsGrupListeClient({ gruplar, personeller, sablonlar, originatorlar, gonderimAcik }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [yeniAd, setYeniAd] = useState('')
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [seciliGrupId, setSeciliGrupId] = useState<number | null>(gruplar[0]?.id ?? null)

  const personelById = useMemo(() => new Map(personeller.map(p => [p.sicil_no, p])), [personeller])
  const seciliGrup = useMemo(() => gruplar.find(g => g.id === seciliGrupId) ?? null, [gruplar, seciliGrupId])

  const gecerliUyeler = useMemo(() => {
    if (!seciliGrup) return [] as string[]
    return seciliGrup.uyeler
      .map(s => personelById.get(s))
      .filter((p): p is SmsPersonelSatir => !!p && p.telefon_gecerli)
      .map(p => p.sicil_no)
  }, [seciliGrup, personelById])

  function olustur() {
    const ad = yeniAd.trim()
    if (!ad) return
    setMesaj(null)
    startTransition(async () => {
      const res = await grupOlustur(ad)
      if (res.hata) {
        setMesaj(res.hata)
        return
      }
      setYeniAd('')
      if (res.id) router.push(`/iletisim-yonetimi/sms-islemleri/grup/${res.id}`)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Yeni grup oluştur</h3>
        <div className="flex gap-2 max-w-md">
          <input
            value={yeniAd}
            onChange={e => setYeniAd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && olustur()}
            placeholder="Grup adı…"
            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={olustur}
            disabled={isPending || !yeniAd.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            Oluştur
          </button>
        </div>
        {mesaj && <p className="mt-2 text-sm text-red-600">{mesaj}</p>}
        <p className="mt-2 text-xs text-slate-400">Grup oluşturulunca detayına yönlendirilirsiniz; personeli orada eklersiniz.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Grup listesi */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-600">
            Gruplar ({gruplar.length})
          </div>
          {gruplar.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">Henüz grup yok. Yukarıdan yeni grup oluşturun.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {gruplar.map(g => (
                <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSeciliGrupId(g.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className={`font-medium ${g.id === seciliGrupId ? 'text-violet-700' : 'text-slate-800'}`}>{g.ad}</div>
                    <div className="text-xs text-slate-400">{g.uyeler.length} üye</div>
                  </button>
                  <Link
                    href={`/iletisim-yonetimi/sms-islemleri/grup/${g.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-50"
                  >
                    Detay
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mesaj gönder */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Gruba mesaj gönder</h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Grup seç</label>
            <select
              value={seciliGrupId ?? ''}
              onChange={e => setSeciliGrupId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">— Grup seçin —</option>
              {gruplar.map(g => (
                <option key={g.id} value={g.id}>
                  {g.ad} ({g.uyeler.length} üye)
                </option>
              ))}
            </select>
          </div>

          {!seciliGrup ? (
            <p className="text-sm text-slate-400 py-6 text-center">Mesaj göndermek için bir grup seçin.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                <strong>{seciliGrup.ad}</strong> · {seciliGrup.uyeler.length} üye · {gecerliUyeler.length} geçerli numara
              </p>
              <SmsMesajGonderKutusu
                key={seciliGrup.id}
                sablonlar={sablonlar}
                izinliTurler={['genel', 'dogum_gunu', 'hosgeldin_bebek', 'evlilik']}
                originatorlar={originatorlar}
                baglam="grup"
                sicilNolar={gecerliUyeler}
                gonderimAcik={gonderimAcik}
                onGonder={smsGonderAction}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
