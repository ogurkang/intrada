'use client'

import { useMemo, useState } from 'react'
import SmsMesajGonderKutusu from './SmsMesajGonderKutusu'
import SmsSecimListesi from './SmsSecimListesi'
import { smsGonderAction } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import type { SmsBebekSatir, SmsSablonSecenek } from '@/lib/sms-islemleri-tipleri'

const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

interface Props {
  bebekler: SmsBebekSatir[]
  sablonlar: SmsSablonSecenek[]
  originatorlar: string[]
  gonderimAcik: boolean
}

function ayNo(tarih: string | null | undefined): number | null {
  if (!tarih) return null
  const n = parseInt(String(tarih).slice(5, 7), 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null
}

function gunFarki(tarih: string): number {
  const d = new Date(tarih)
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

export default function SmsBebekClient({ bebekler, sablonlar, originatorlar, gonderimAcik }: Props) {
  const [mod, setMod] = useState<'ay' | 'gun'>('ay')
  const [ay, setAy] = useState(new Date().getMonth() + 1)
  const [gun, setGun] = useState(30)
  const [secili, setSecili] = useState<Set<string>>(new Set())

  const liste = useMemo(() => {
    const f =
      mod === 'ay'
        ? bebekler.filter(b => ayNo(b.cocuk_dogum) === ay)
        : bebekler.filter(b => {
            const d = gunFarki(b.cocuk_dogum)
            return d >= 0 && d <= gun
          })
    return f.sort((a, b) => b.cocuk_dogum.localeCompare(a.cocuk_dogum))
  }, [bebekler, mod, ay, gun])

  const secilebilir = useMemo(() => liste.filter(b => b.telefon_gecerli), [liste])
  const seciliRows = liste.filter(b => b.telefon_gecerli && secili.has(b.key))
  const gonderilecekSicil = [...new Set(seciliRows.map(b => b.sicil_no))]
  const cocukAdiBySicil: Record<string, string> = {}
  for (const r of seciliRows) cocukAdiBySicil[r.sicil_no] = r.cocuk_adi

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={mod}
              onChange={e => {
                setMod(e.target.value as 'ay' | 'gun')
                setSecili(new Set())
              }}
              className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="ay">Aya göre</option>
              <option value="gun">Son güne göre</option>
            </select>
            {mod === 'gun' && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                Son
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={gun}
                  onChange={e => {
                    setGun(Math.max(1, Number(e.target.value) || 1))
                    setSecili(new Set())
                  }}
                  className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-sm"
                />
                gün
              </div>
            )}
            <span className="text-xs text-slate-400 ml-auto">{liste.length} kayıt</span>
          </div>
          {mod === 'ay' && (
            <div className="flex flex-wrap gap-1.5">
              {AYLAR_KISA.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  title={AYLAR[i]}
                  onClick={() => {
                    setAy(i + 1)
                    setSecili(new Set())
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    ay === i + 1
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
        <SmsSecimListesi
          satirlar={liste.map(b => ({
            key: b.key,
            ad: b.ad_soyad,
            altMetin: `Bebek: ${b.cocuk_adi || '—'} · ${b.cocuk_dogum}`,
            telefon: b.telefon,
            telefonGecerli: b.telefon_gecerli,
          }))}
          secili={secili}
          setSecili={setSecili}
          secilebilirKeyler={secilebilir.map(b => b.key)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 self-start">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Hoş geldin bebek mesajı</h3>
        <SmsMesajGonderKutusu
          sablonlar={sablonlar}
          izinliTurler={['hosgeldin_bebek', 'genel']}
          originatorlar={originatorlar}
          baglam="hosgeldin_bebek"
          sicilNolar={gonderilecekSicil}
          cocukAdiBySicil={cocukAdiBySicil}
          gonderimAcik={gonderimAcik}
          bilgiMetni="Mesajın başına otomatik 'Sayın {ad_soyad}' eklenir. {cocuk_adi} yer tutucusu bebeğin adıyla doldurulur."
          onGonder={smsGonderAction}
          onBasarili={() => setSecili(new Set())}
        />
      </div>
    </div>
  )
}
