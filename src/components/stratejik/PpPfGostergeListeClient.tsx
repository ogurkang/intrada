'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ppPfGostergeSil } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/pf/gosterge-actions'
import { CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'
import PpSatirSaat from '@/components/stratejik/PpSatirSaat'
import Modal from '@/components/ui/Modal'
import { ppParaYaz } from '@/lib/pp-iliski'

export type PpMaliyetToplam = {
  t1Butce: number
  t1Haziran: number
  t1YilSonu: number
  tButce: number
  t1Tahmin: number
  t2Tahmin: number
}

export type PpGostergeOdenekOzet = {
  ekonomik_kod: string
  hesap_adi: string
  t1Butce: number | null
  t1Haziran: number | null
  t1YilSonu: number | null
  tButce: number | null
  t1Tahmin: number | null
  t2Tahmin: number | null
}

export type PpPfGostergeListeSatir = {
  id: number
  sira: number
  kod: string
  ad: string
  maliyet: PpMaliyetToplam
  odenekler: PpGostergeOdenekOzet[]
}

const MALIYET = [
  ['t1Butce', 'bg-slate-500 text-white', -1, 'Bütçe'],
  ['t1Haziran', 'bg-slate-400 text-slate-900', -1, 'Haziran Sonu Harcama'],
  ['t1YilSonu', 'bg-slate-200 text-slate-800', -1, 'Yıl Sonu Tahmini Harcama'],
  ['tButce', 'bg-emerald-100 text-slate-800', 0, 'Bütçe'],
  ['t1Tahmin', 'bg-orange-100 text-slate-800', 1, 'Tahmin'],
  ['t2Tahmin', 'bg-sky-100 text-slate-800', 2, 'Tahmin'],
] as const

const ODENEK_SUTUN = [
  ['t1Butce', 'bg-slate-500 text-white', -1, 'Bütçe'],
  ['t1Haziran', 'bg-slate-400 text-slate-900', -1, 'Haziran Sonu Harcama'],
  ['t1YilSonu', 'bg-slate-200 text-slate-800', -1, 'Yıl Sonu Tahmini Harcama'],
  ['tButce', 'bg-emerald-100 text-slate-800', 0, 'Bütçe'],
  ['t1Tahmin', 'bg-orange-100 text-slate-800', 1, 'Tahmin'],
  ['t2Tahmin', 'bg-sky-100 text-slate-800', 2, 'Tahmin'],
] as const

export default function PpPfGostergeListeClient({
  yil,
  faaliyetId,
  baslik,
  satirlar,
}: {
  yil: number
  faaliyetId: number
  baslik: string
  satirlar: PpPfGostergeListeSatir[]
}) {
  const router = useRouter()
  const [bekliyor, start] = useTransition()
  const [gorunen, setGorunen] = useState<PpPfGostergeListeSatir | null>(null)

  function sil(s: PpPfGostergeListeSatir) {
    const tutarVar = Object.values(s.maliyet).some(n => n > 0)
    if (tutarVar) {
      alert('Silmek istediğiniz başlığa bağlı ödenek teklifi bulunmaktadır.')
      return
    }
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return
    start(async () => {
      const sonuc = await ppPfGostergeSil(s.id, faaliyetId)
      if (sonuc.hata) alert(sonuc.hata)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <button
          type="button"
          onClick={() =>
            window.open(`/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gosterge/yeni`, '_blank')
          }
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Gösterge Ekle
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th rowSpan={2} className="w-16 px-3 py-2 text-center">
                Sıra No
              </th>
              <th rowSpan={2} className="w-28 px-3 py-2 text-left">
                Kodu
              </th>
              <th rowSpan={2} className="px-3 py-2 text-left">
                Gösterge
              </th>
              <th colSpan={6} className="px-3 py-2 text-center font-semibold text-slate-700">
                Ödenek Teklifi
              </th>
              <th rowSpan={2} className="w-40 px-3 py-2 text-center">
                İşlemler
              </th>
            </tr>
            <tr className="border-b border-slate-200">
              {MALIYET.map(([anahtar, renk, kayma, ad]) => (
                <th key={anahtar} className={`px-2 py-2 text-right text-xs font-medium ${renk}`}>
                  {yil + kayma} {ad}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  Henüz gösterge yok.
                </td>
              </tr>
            ) : (
              satirlar.map(s => (
                <tr key={s.id}>
                  <td className="px-3 py-3 text-center text-slate-600">{s.sira}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{s.kod}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{s.ad}</td>
                  {MALIYET.map(([anahtar, renk]) => (
                    <td key={anahtar} className={`px-2 py-3 text-right text-xs tabular-nums ${renk}`}>
                      {ppParaYaz(s.maliyet[anahtar]) || '—'}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <PpSatirSaat tablo="performans_gosterge" kayitId={s.id} />
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gosterge/${s.id}`,
                            '_blank',
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Düzenle / ödenek"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGorunen(s)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                        title="Ödenekleri görüntüle"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <CopKutusuSilDugmesi onClick={() => sil(s)} disabled={bekliyor} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={gorunen != null}
        onClose={() => setGorunen(null)}
        title={gorunen ? `${gorunen.kod} · Ödenek Teklifi` : 'Ödenek Teklifi'}
        size="xl"
      >
        {gorunen ? (
          gorunen.odenekler.length === 0 ? (
            <p className="text-sm text-slate-500">Bu gösterge için ödenek teklifi yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 text-left">Ekonomik kod</th>
                    <th className="px-2 py-2 text-left">Hesap adı</th>
                    {ODENEK_SUTUN.map(([alan, renk, kayma, ad]) => (
                      <th key={alan} className={`px-2 py-2 text-right text-xs font-medium ${renk}`}>
                        {yil + kayma} {ad}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gorunen.odenekler.map(o => (
                    <tr key={o.ekonomik_kod}>
                      <td className="px-2 py-2 font-mono text-xs">{o.ekonomik_kod}</td>
                      <td className="px-2 py-2">{o.hesap_adi}</td>
                      {ODENEK_SUTUN.map(([alan, renk]) => (
                        <td key={alan} className={`px-2 py-2 text-right tabular-nums text-xs ${renk}`}>
                          {ppParaYaz(o[alan]) || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </Modal>
    </div>
  )
}
