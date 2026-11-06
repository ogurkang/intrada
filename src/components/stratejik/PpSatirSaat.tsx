'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { ppSatirLogListele, type PpSatirLog } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/satir-log-actions'

export default function PpSatirSaat({ tablo, kayitId }: { tablo: string; kayitId: number }) {
  const [acik, setAcik] = useState(false)
  const [satirlar, setSatirlar] = useState<PpSatirLog[]>([])
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()

  function ac() {
    setHata(null)
    setAcik(true)
    start(async () => {
      const s = await ppSatirLogListele(tablo, kayitId)
      setSatirlar(s.satirlar)
      setHata(s.hata ?? null)
    })
  }

  return (
    <>
      <SaatGecmisDugmesi onClick={ac} title="İşlem geçmişi" />
      <Modal open={acik} onClose={() => setAcik(false)} title="İşlem geçmişi" size="lg">
        {bekliyor ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
        {hata ? <p className="text-sm text-amber-800">{hata}</p> : null}
        {!bekliyor && !hata && satirlar.length === 0 ? <p className="text-sm text-slate-500">Kayıt yok.</p> : null}
        {satirlar.length > 0 ? (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left">Tarih/Saat</th>
                  <th className="px-3 py-2 text-left">İşlem</th>
                  <th className="px-3 py-2 text-left">Özet</th>
                  <th className="px-3 py-2 text-left">İşlemi yapan</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map(s => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{s.zaman}</td>
                    <td className="px-3 py-2 text-slate-800">{s.islem}</td>
                    <td className="px-3 py-2 text-slate-600">{s.ozet || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{s.kullanici}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
