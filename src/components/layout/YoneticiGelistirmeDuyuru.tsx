'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { yoneticiDuyurulari, type YoneticiDuyuru } from '@/data/yonetici-duyurulari'

function anahtar(kullaniciId: string) {
  return `intrada-yonetici-duyuru:${kullaniciId}`
}

function gorulenOku(kullaniciId: string): Set<string> {
  try {
    const raw = localStorage.getItem(anahtar(kullaniciId))
    const liste = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(liste) ? liste.filter(x => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export default function YoneticiGelistirmeDuyuru({
  adminMi,
  kullaniciId,
}: {
  adminMi: boolean
  kullaniciId: string
}) {
  const [acik, setAcik] = useState(false)
  const [kayitlar, setKayitlar] = useState<YoneticiDuyuru[]>([])

  useEffect(() => {
    if (!adminMi || !kullaniciId) return
    const gorulen = gorulenOku(kullaniciId)
    const yeni = yoneticiDuyurulari.filter(d => !gorulen.has(d.id))
    if (!yeni.length) return
    setKayitlar(yeni)
    setAcik(true)
  }, [adminMi, kullaniciId])

  function kapat() {
    const gorulen = gorulenOku(kullaniciId)
    for (const d of kayitlar) gorulen.add(d.id)
    localStorage.setItem(anahtar(kullaniciId), JSON.stringify([...gorulen]))
    setAcik(false)
  }

  return (
    <Modal open={acik} onClose={kapat} title="Son geliştirmeler" size="md">
      <div className="space-y-4">
        {kayitlar.map(d => (
          <div key={d.id}>
            <p className="text-sm font-medium text-slate-800">{d.baslik}</p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-700">
              {d.maddeler.map(m => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={kapat}
          className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg"
        >
          Tamam
        </button>
      </div>
    </Modal>
  )
}
