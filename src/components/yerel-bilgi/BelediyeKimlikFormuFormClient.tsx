'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  belediyeKimlikFormEkle,
  belediyeKimlikFormGuncelle,
  type BelediyeKimlikFormInput,
} from '@/app/(dashboard)/yerel-bilgi/islemler/belediye-kimlik-formu/actions'

type Props = {
  mode: 'ekle' | 'detay'
  id?: number
  baslik: string
  geriHref: string
  readonlyAd: string
  readonlySoyad: string
  readonlyTelefon: string
  baslangic: BelediyeKimlikFormInput
}

const donemSecenekleri = ['I. Dönem', 'II. Dönem', 'III. Dönem', 'IV. Dönem', 'V. Dönem']
const cinsiyetSecenekleri = ['Kadın', 'Erkek']

export default function BelediyeKimlikFormuFormClient({
  mode,
  id,
  baslik,
  geriHref,
  readonlyAd,
  readonlySoyad,
  readonlyTelefon,
  baslangic,
}: Props) {
  const [f, setF] = useState<BelediyeKimlikFormInput>(baslangic)
  const [duzenlemeAcik, setDuzenlemeAcik] = useState(mode === 'ekle')
  const [sunucuHata, setSunucuHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function kaydet() {
    if (!duzenlemeAcik) return
    setSunucuHata(null)
    startTransition(async () => {
      const res =
        mode === 'ekle'
          ? await belediyeKimlikFormEkle(f)
          : await belediyeKimlikFormGuncelle(Number(id), f)
      if (res.hata) {
        setSunucuHata(res.hata)
        return
      }
      if (mode === 'ekle') {
        try {
          if (window.opener && !window.opener.closed) window.opener.location.reload()
        } catch {
          /* ignore */
        }
        window.close()
        return
      }
      setDuzenlemeAcik(false)
      window.location.reload()
    })
  }

  const dis = !duzenlemeAcik || isPending
  const btn = 'intrada-btn intrada-btn-kaydet'

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Link href={geriHref} className={btn}>
          ← Belediye Kimlik Formu listesi
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          {mode === 'detay' && (
            <button
              type="button"
              onClick={() => setDuzenlemeAcik(true)}
              disabled={duzenlemeAcik}
              className="intrada-btn intrada-btn-duzenle disabled:opacity-50"
            >
              Düzenle
            </button>
          )}
        </div>

        {sunucuHata && <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunucuHata}</div>}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm text-slate-600">Belediye Kuruluş Yılı
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="yyyy"
              disabled={dis}
              value={f.belediye_kurulus_yili}
              onChange={e => setF(p => ({ ...p, belediye_kurulus_yili: e.target.value.replace(/[^\d]/g, '').slice(0, 4) }))}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
            />
          </label>
          <div />
          <label className="text-sm text-slate-600">Belediye Başkanı Adı
            <input readOnly value={readonlyAd} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Başkanı Soyadı
            <input readOnly value={readonlySoyad} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Başkanı Cinsiyeti
            <select disabled={dis} value={f.baskan_cinsiyeti} onChange={e => setF(p => ({ ...p, baskan_cinsiyeti: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100">
              <option value="">—</option>
              {cinsiyetSecenekleri.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">Belediye Başkanı Seçime Girdiği Parti
            <input disabled={dis} value={f.baskan_secime_girdigi_parti} onChange={e => setF(p => ({ ...p, baskan_secime_girdigi_parti: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Başkanı Mevcut Parti
            <input disabled={dis} value={f.baskan_mevcut_parti} onChange={e => setF(p => ({ ...p, baskan_mevcut_parti: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Başkanı Bu Belediyede Kaçıncı Dönem
            <select disabled={dis} value={f.baskan_donem} onChange={e => setF(p => ({ ...p, baskan_donem: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100">
              <option value="">—</option>
              {donemSecenekleri.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">Belediye Başkanı Cep Telefonu
            <input readOnly value={readonlyTelefon} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Elektronik Ağ Adresi (WEB Adresi)
            <input disabled={dis} value={f.belediye_web_adresi} onChange={e => setF(p => ({ ...p, belediye_web_adresi: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye E-Posta
            <input disabled={dis} value={f.belediye_e_posta} onChange={e => setF(p => ({ ...p, belediye_e_posta: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Telefon Numarası
            <input disabled={dis} value={f.belediye_telefon_numarasi} onChange={e => setF(p => ({ ...p, belediye_telefon_numarasi: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Faks Numarası
            <input disabled={dis} value={f.belediye_faks_numarasi} onChange={e => setF(p => ({ ...p, belediye_faks_numarasi: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Çağrı Merkezi (Varsa)
            <input disabled={dis} value={f.belediye_cagri_merkezi} onChange={e => setF(p => ({ ...p, belediye_cagri_merkezi: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Belediye Onaylı (Mavi Tikli) Sosyal Medya Hesabı
            <input disabled={dis} value={f.belediye_onayli_sosyal_medya_hesabi} onChange={e => setF(p => ({ ...p, belediye_onayli_sosyal_medya_hesabi: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">Belediye Açık Adresi
            <textarea disabled={dis} value={f.belediye_acik_adresi} onChange={e => setF(p => ({ ...p, belediye_acik_adresi: e.target.value }))} rows={3} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
          <label className="text-sm text-slate-600">Mahalle Sayısı
            <input disabled={dis} value={f.mahalle_sayisi} onChange={e => setF(p => ({ ...p, mahalle_sayisi: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100" />
          </label>
        </div>

        <div className="flex justify-end px-4 pb-4 pt-3 mt-auto border-t border-slate-100 bg-slate-50/80">
          <button type="button" onClick={kaydet} disabled={!duzenlemeAcik || isPending} className="intrada-btn intrada-btn-kaydet px-6 py-2.5 disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

