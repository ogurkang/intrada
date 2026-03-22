'use client'

import { useMemo, useState, useRef, useEffect } from 'react'

export type PersonelAramaOge = {
  sicil_no: string
  ad_soyad: string
  /** İkinci satır (örn. görev ünvanı) */
  alt?: string
}

interface Props {
  personeller: PersonelAramaOge[]
  value: string
  onChange: (sicil_no: string) => void
  placeholder?: string
  required?: boolean
}

export default function PersonelAramaSecim({
  personeller,
  value,
  onChange,
  placeholder = 'Sicil veya ad soyad ile ara…',
  required,
}: Props) {
  const [acik, setAcik] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === value) ?? null,
    [personeller, value],
  )

  const filtre = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return personeller.slice(0, 80)
    return personeller
      .filter(
        p =>
          p.sicil_no.toLowerCase().includes(t) ||
          (p.ad_soyad ?? '').toLowerCase().includes(t),
      )
      .slice(0, 80)
  }, [personeller, q])

  useEffect(() => {
    function d(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setAcik(false)
    }
    document.addEventListener('mousedown', d)
    return () => document.removeEventListener('mousedown', d)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={acik ? q : secili ? `${secili.ad_soyad} (${secili.sicil_no})` : q}
        onChange={e => {
          setQ(e.target.value)
          setAcik(true)
          if (!e.target.value) onChange('')
        }}
        onFocus={() => {
          setAcik(true)
          setQ('')
        }}
        placeholder={placeholder}
        required={required && !value}
        className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        autoComplete="off"
      />
      {acik && filtre.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
          {filtre.map(p => (
            <li key={p.sicil_no}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                onClick={() => {
                  onChange(p.sicil_no)
                  setQ('')
                  setAcik(false)
                }}
              >
                <span className="font-medium text-slate-800">{p.ad_soyad}</span>
                <span className="text-slate-500 font-mono text-xs ml-2">{p.sicil_no}</span>
                {p.alt ? <div className="text-xs text-slate-400 truncate">{p.alt}</div> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
