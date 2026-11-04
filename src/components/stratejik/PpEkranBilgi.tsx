'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'

export type PpBilgiMadde = { baslik: string; metin: string }

export default function PpEkranBilgi({ maddeler }: { maddeler: PpBilgiMadde[] }) {
  const [acik, setAcik] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        title="Bu ekran"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        i
      </button>
      <Modal open={acik} onClose={() => setAcik(false)} title="Bu ekranda" size="lg">
        <ul className="space-y-3">
          {maddeler.map(m => (
            <li key={m.baslik}>
              <p className="text-sm font-semibold text-slate-800">{m.baslik}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{m.metin}</p>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
