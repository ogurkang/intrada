'use client'

import { useMemo, useState } from 'react'
import SmsMesajGonderKutusu from './SmsMesajGonderKutusu'
import SmsSecimListesi from './SmsSecimListesi'
import { smsGonderAction } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import type { SmsPersonelSatir, SmsSablonSecenek } from '@/lib/sms-islemleri-tipleri'

interface Props {
  personeller: SmsPersonelSatir[]
  sablonlar: SmsSablonSecenek[]
  originatorlar: string[]
  gonderimAcik: boolean
}

function benzersizSirali(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
}

export default function SmsTekilClient({ personeller, sablonlar, originatorlar, gonderimAcik }: Props) {
  const [arama, setArama] = useState('')
  const [mudurluk, setMudurluk] = useState('')
  const [statu, setStatu] = useState('')
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [manuel, setManuel] = useState('')

  const mudurlukler = useMemo(() => benzersizSirali(personeller.map(p => p.mudurluk)), [personeller])
  const statuler = useMemo(() => benzersizSirali(personeller.map(p => p.statu)), [personeller])

  const liste = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    return personeller.filter(p => {
      if (mudurluk && p.mudurluk !== mudurluk) return false
      if (statu && p.statu !== statu) return false
      if (q && !p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) && !p.sicil_no.includes(q)) return false
      return true
    })
  }, [personeller, arama, mudurluk, statu])

  const secilebilir = useMemo(() => liste.filter(p => p.telefon_gecerli), [liste])
  const gonderilecek = liste.filter(p => p.telefon_gecerli && secili.has(p.sicil_no)).map(p => p.sicil_no)
  const manuelAdet = manuel.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <input
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Ad veya sicil ara…"
            className="flex-1 min-w-[140px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={mudurluk}
            onChange={e => setMudurluk(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white max-w-[170px]"
          >
            <option value="">Tüm müdürlükler</option>
            {mudurlukler.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={statu}
            onChange={e => setStatu(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white max-w-[150px]"
          >
            <option value="">Tüm statüler</option>
            {statuler.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <SmsSecimListesi
          satirlar={liste.map(p => ({
            key: p.sicil_no,
            ad: p.ad_soyad,
            altMetin: [p.sicil_no, p.mudurluk, p.statu].filter(Boolean).join(' · '),
            telefon: p.telefon,
            telefonGecerli: p.telefon_gecerli,
          }))}
          secili={secili}
          setSecili={setSecili}
          secilebilirKeyler={secilebilir.map(p => p.sicil_no)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 self-start space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ek numaralar (manuel)</label>
          <textarea
            value={manuel}
            onChange={e => setManuel(e.target.value)}
            rows={2}
            placeholder="Virgül/boşluk/satırla ayırın"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
          />
        </div>
        <SmsMesajGonderKutusu
          sablonlar={sablonlar}
          izinliTurler={['dogum_gunu', 'hosgeldin_bebek', 'evlilik', 'genel']}
          originatorlar={originatorlar}
          baglam="tekil"
          sicilNolar={gonderilecek}
          manuelNumaralar={manuel}
          manuelAdet={manuelAdet}
          gonderimAcik={gonderimAcik}
          onGonder={smsGonderAction}
          onBasarili={() => {
            setSecili(new Set())
            setManuel('')
          }}
        />
      </div>
    </div>
  )
}
