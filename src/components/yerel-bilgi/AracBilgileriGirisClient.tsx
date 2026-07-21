'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  aracBilgisiToggleAktif,
} from '@/app/(dashboard)/yerel-bilgi/islemler/arac-bilgileri/actions'

export type TanimSecenek = { id: number; tanim_adi: string }
export type AltTurSecenek = { id: number; arac_turu_id: number; tanim_adi: string }
export type MudurlukSecenek = { id: number; mudurluk_adi: string }

export type AracBilgiListeSatir = {
  id: number
  sira_no: number
  sahiplik_adi: string
  durum_adi: string
  tur_adi: string
  alt_tur_adi: string
  plaka_etiket: 'Var' | 'Yok'
  sasi_goster: string
  mudurluk_adi: string
  aktif: boolean
  created_at: string
}

const EKLE_PATH = '/yerel-bilgi/islemler/arac-bilgileri/ekle'

type Props = {
  isAdmin: boolean
  kullaniciMudurlukId: number | null
  kullaniciMudurlukAdi: string | null
  initialListe: AracBilgiListeSatir[]
}

export default function AracBilgileriGirisClient({
  isAdmin,
  kullaniciMudurlukId,
  kullaniciMudurlukAdi,
  initialListe,
}: Props) {
  const router = useRouter()
  const [liste, setListe] = useState(initialListe)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setListe(initialListe)
  }, [initialListe])

  function aracEkleYeniSekme() {
    if (typeof window === 'undefined') return
    window.open(`${window.location.origin}${EKLE_PATH}`, '_blank')
  }

  function duzenle(id: number) {
    window.open(`${window.location.origin}/yerel-bilgi/islemler/arac-bilgileri/${id}/duzenle`, '_blank')
  }

  function toggleAktif(id: number, mevcut: boolean) {
    startTransition(async () => {
      const res = await aracBilgisiToggleAktif(id, mevcut)
      if (res.hata) {
        alert(res.hata)
        return
      }
      router.refresh()
    })
  }

  const geriBtn =
    'inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Araç Bilgileri Girişi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sıra numarası küçükten büyüğe listelenir. «Araç Ekle» yeni sekmede formu açar.
          </p>
        </div>
        <Link href="/yerel-bilgi/islemler" className={`${geriBtn} shrink-0 self-start sm:self-center`}>
          ← Yerel Bilgi — İşlemler
        </Link>
      </div>

      {!isAdmin && kullaniciMudurlukId == null && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
          Kadro kayıtlarınızda dolu görev veya müdürlük eşlemesi bulunamadı. Kayıt yapılamaz; yönetici ile iletişime
          geçin.
        </div>
      )}
      {!isAdmin && kullaniciMudurlukId != null && kullaniciMudurlukAdi && (
        <div className="mb-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-3 text-sm">
          Kayıtlarınız <strong>{kullaniciMudurlukAdi}</strong> müdürlüğüne yazılacaktır.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          type="button"
          onClick={aracEkleYeniSekme}
          disabled={!isAdmin && kullaniciMudurlukId == null}
          className="inline-flex items-center rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          Araç Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-3 font-semibold text-slate-600 w-16 tabular-nums">Sıra</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Sahiplik</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Araç durumu</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Tür</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Alt tür</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24">Plaka</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Şasi</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Müdürlük</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 w-28">Durum</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 min-w-[9rem]">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liste.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    Henüz kayıt yok.
                  </td>
                </tr>
              ) : (
                liste.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-800 font-medium tabular-nums">{r.sira_no}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.sahiplik_adi}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.durum_adi}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.tur_adi}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.alt_tur_adi}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={
                          r.plaka_etiket === 'Var'
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-500'
                        }
                      >
                        {r.plaka_etiket}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{r.sasi_goster || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-700">{r.mudurluk_adi}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => toggleAktif(r.id, r.aktif)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                          r.aktif
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${r.aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {r.aktif ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => duzenle(r.id)}
                        className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100"
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
