'use client'

import { useEffect, useRef } from 'react'

export default function PpZenginMetin({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const alan = useRef<HTMLDivElement>(null)
  const kuruldu = useRef(false)

  useEffect(() => {
    if (kuruldu.current || !alan.current) return
    alan.current.innerHTML = value
    kuruldu.current = true
  }, [value])

  function komut(ad: string, arg?: string) {
    alan.current?.focus()
    document.execCommand(ad, false, arg)
    onChange(alan.current?.innerHTML ?? '')
  }

  return (
    <div className="mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => komut('bold')} className="rounded px-2 py-1 text-sm font-bold text-slate-800 hover:bg-slate-200" title="Koyu">K</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => komut('italic')} className="rounded px-2 py-1 text-sm italic text-slate-800 hover:bg-slate-200" title="İtalik">İ</button>
        <label className="ml-1 text-xs text-slate-600">Punto
          <select onChange={e => komut('fontSize', e.target.value)} defaultValue="3" className="ml-1 rounded border border-slate-300 bg-white px-1 py-1 text-xs">
            <option value="2">12</option>
            <option value="3">14</option>
            <option value="4">16</option>
            <option value="5">18</option>
            <option value="6">20</option>
          </select>
        </label>
      </div>
      <div
        ref={alan}
        contentEditable
        onInput={() => onChange(alan.current?.innerHTML ?? '')}
        className="min-h-40 px-3 py-2 text-sm text-slate-800 outline-none"
      />
    </div>
  )
}
