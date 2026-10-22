'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { epostaListeAction } from '@/app/(dashboard)/iletisim-yonetimi/e-posta-islemleri/actions'

const ANAHTAR = 'eposta-gorulen-uid'

function oku(): Set<string> {
  try {
    const ham = sessionStorage.getItem(ANAHTAR)
    const liste = ham ? (JSON.parse(ham) as string[]) : []
    return new Set(liste)
  } catch {
    return new Set()
  }
}

function yaz(kume: Set<string>) {
  sessionStorage.setItem(ANAHTAR, JSON.stringify([...kume].slice(-400)))
}

export default function EpostaGelenBildirim() {
  const [metin, setMetin] = useState<string | null>(null)

  useEffect(() => {
    let suruyor = false
    let ilk = true
    const denetle = () => {
      if (suruyor || document.visibilityState === 'hidden') return
      suruyor = true
      void epostaListeAction('gelen')
        .then(res => {
          if (res.hata || !res.satirlar) return
          const gorulen = oku()
          const okunmamis = res.satirlar.filter(s => s.okunmadi)
          const yeni = okunmamis.filter(s => !gorulen.has(s.uid))
          for (const s of res.satirlar) gorulen.add(s.uid)
          yaz(gorulen)
          if (ilk) {
            ilk = false
            if (okunmamis.length) {
              setMetin(okunmamis.length === 1 ? `Okunmamış mektup: ${okunmamis[0].kim}` : `${okunmamis.length} okunmamış mektup var.`)
            }
            return
          }
          if (!yeni.length) return
          const ilkYeni = yeni[0]
          setMetin(yeni.length === 1 ? `Yeni mektup: ${ilkYeni.kim} — ${ilkYeni.konu}` : `${yeni.length} yeni mektup geldi.`)
        })
        .finally(() => {
          suruyor = false
        })
    }
    denetle()
    const zaman = setInterval(denetle, 120_000)
    return () => clearInterval(zaman)
  }, [])

  if (!metin) return null
  return (
    <div className="fixed bottom-24 right-4 z-[70] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-sky-200 bg-white shadow-lg print:hidden">
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-slate-800">Gelen kutu</p>
        <p className="mt-1 text-sm text-slate-600">{metin}</p>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href="/iletisim-yonetimi/e-posta-islemleri" className="font-medium text-sky-800 underline" onClick={() => setMetin(null)}>
            Aç
          </Link>
          <button type="button" className="text-slate-500" onClick={() => setMetin(null)}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
