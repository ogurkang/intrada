'use client'

import { useState, type ReactNode } from 'react'

function sayiOku(raw: string): number {
  let s = String(raw).trim().replace(/[\s\u00a0]/g, '')
  if (!s || s === '-' || s === '+') return 0
  const negatif = s.startsWith('-')
  if (negatif || s.startsWith('+')) s = s.slice(1)
  let norm: string
  if (s.includes(',')) {
    norm = s.replace(/\./g, '').replace(',', '.')
  } else {
    const nokta = s.match(/\./g)?.length ?? 0
    if (nokta > 1 || (nokta === 1 && /^\d{1,3}(\.\d{3})+$/.test(s))) norm = s.replace(/\./g, '')
    else norm = s
  }
  const n = Number(norm)
  if (!Number.isFinite(n)) return 0
  return negatif ? -n : n
}

function trYazi(n: number, kesir: number, grupla: boolean): string {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: kesir,
    maximumFractionDigits: kesir,
    useGrouping: grupla,
  })
}

function temizYuzde(n: number): string {
  const yakin = Math.round(n * 100) / 100
  const deger = Math.abs(n - yakin) < 1e-6 ? yakin : Math.round(n * 10000) / 10000
  const kesir = Math.abs(deger - Math.round(deger)) < 1e-8 ? 0 : 2
  return trYazi(deger, kesir, Math.abs(deger) >= 1000)
}

export function temizTutar(n: number): string {
  return trYazi(Math.round(n * 100) / 100, 2, true)
}

function AdimKutusu({
  children,
  eksilt,
  artir,
  eksiltEtiket,
  artirEtiket,
  sonEk,
}: {
  children: ReactNode
  eksilt: () => void
  artir: () => void
  eksiltEtiket: string
  artirEtiket: string
  sonEk?: string
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        aria-label={eksiltEtiket}
        className="px-2.5 py-1.5 text-base leading-none text-slate-700 hover:bg-slate-100"
        onClick={eksilt}
      >
        −
      </button>
      {children}
      <button
        type="button"
        aria-label={artirEtiket}
        className="px-2.5 py-1.5 text-base leading-none text-slate-700 hover:bg-slate-100"
        onClick={artir}
      >
        +
      </button>
      {sonEk ? <span className="pr-2 text-xs text-slate-500">{sonEk}</span> : null}
    </div>
  )
}

export default function OranAdimi({
  deger,
  onChange,
}: {
  deger: number
  onChange: (n: number) => void
}) {
  const [metin, setMetin] = useState<string | null>(null)
  function yaz(n: number) {
    setMetin(null)
    onChange(Math.round(n * 100) / 100)
  }
  return (
    <AdimKutusu
      eksilt={() => yaz(deger - 1)}
      artir={() => yaz(deger + 1)}
      eksiltEtiket="Bir puan düşür"
      artirEtiket="Bir puan yükselt"
      sonEk="%"
    >
      <input
        value={metin ?? temizYuzde(deger)}
        onFocus={() => setMetin(temizYuzde(deger))}
        onChange={e => setMetin(e.target.value)}
        onBlur={() => {
          const n = sayiOku(metin ?? temizYuzde(deger))
          setMetin(null)
          if (Math.abs(n - deger) > 1e-9) onChange(n)
        }}
        className="w-16 border-x border-slate-300 py-1.5 text-center text-sm tabular-nums outline-none"
      />
    </AdimKutusu>
  )
}

export function MiktarAlani({
  deger,
  onCommit,
  sonEk,
}: {
  deger: number
  onCommit: (n: number) => void
  sonEk?: string
}) {
  const [metin, setMetin] = useState<string | null>(null)
  function yaz(n: number) {
    setMetin(null)
    onCommit(Math.round(n * 100) / 100)
  }
  return (
    <AdimKutusu
      eksilt={() => yaz(deger - 1)}
      artir={() => yaz(deger + 1)}
      eksiltEtiket="Bir birim düşür"
      artirEtiket="Bir birim yükselt"
      sonEk={sonEk}
    >
      <input
        value={metin ?? temizTutar(deger)}
        onFocus={() => setMetin(temizTutar(deger))}
        onChange={e => setMetin(e.target.value)}
        onBlur={() => {
          const n = sayiOku(metin ?? temizTutar(deger))
          setMetin(null)
          if (Math.abs(n - deger) > 0.001) onCommit(n)
        }}
        className="w-32 border-x border-slate-300 px-2 py-1.5 text-right text-sm tabular-nums outline-none"
      />
    </AdimKutusu>
  )
}
