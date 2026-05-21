'use client'

import { useEffect, useRef, useState } from 'react'
import type { AppAccess } from '@/lib/app-access'

type Mesaj = { role: 'user' | 'assistant'; content: string }

interface Props {
  access: AppAccess
}

export default function IntradaAsistanWidget({ access }: Props) {
  const [acik, setAcik] = useState(false)
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([
    {
      role: 'assistant',
      content:
        'Merhaba, ben INTRADA Asistan. Modül kullanımı ve (yetkiniz varsa) izin hakkı sorabilirsiniz — tam ad gerekmez; örn. "Gürkan kaç gün izni var".',
    },
  ])
  const [girdi, setGirdi] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const altRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (acik && altRef.current) {
      altRef.current.scrollTop = altRef.current.scrollHeight
    }
  }, [mesajlar, acik, yukleniyor])

  async function gonder() {
    const metin = girdi.trim()
    if (!metin || yukleniyor) return
    setHata(null)
    setGirdi('')
    const yeniKullanici: Mesaj = { role: 'user', content: metin }
    setMesajlar(prev => [...prev, yeniKullanici])
    setYukleniyor(true)

    try {
      const res = await fetch('/api/asistan/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesaj: metin,
          gecmis: mesajlar.slice(-8),
        }),
      })
      const data = (await res.json()) as { cevap?: string; hata?: string; veriKullanildi?: boolean }
      if (!res.ok) throw new Error(data.hata ?? 'İstek başarısız')
      setMesajlar(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.cevap ?? 'Yanıt alınamadı.',
        },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bağlantı hatası'
      setHata(msg)
      setMesajlar(prev => [
        ...prev,
        { role: 'assistant', content: `Üzgünüm, şu an yanıt veremiyorum: ${msg}` },
      ])
    } finally {
      setYukleniyor(false)
    }
  }

  if (access.mode === 'blocked') return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 print:hidden">
      {acik && (
        <div className="w-[min(100vw-2rem,380px)] h-[min(70vh,520px)] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
            <div>
              <p className="text-sm font-semibold">INTRADA Asistan</p>
              <p className="text-[10px] text-slate-300">Kullanım rehberi · izin sorgusu</p>
            </div>
            <button
              type="button"
              onClick={() => setAcik(false)}
              className="p-1 rounded hover:bg-slate-700"
              aria-label="Kapat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={altRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
            {mesajlar.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {yukleniyor && (
              <p className="text-xs text-slate-500 animate-pulse px-1">Yanıt hazırlanıyor…</p>
            )}
          </div>

          {hata && <p className="px-3 text-xs text-red-600 bg-red-50 border-t border-red-100">{hata}</p>}

          <div className="border-t border-slate-200 p-2 flex gap-2 bg-white">
            <input
              type="text"
              value={girdi}
              onChange={e => setGirdi(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  gonder()
                }
              }}
              placeholder="Sorunuzu yazın…"
              className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              disabled={yukleniyor}
            />
            <button
              type="button"
              onClick={gonder}
              disabled={yukleniyor || !girdi.trim()}
              className="shrink-0 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-40"
            >
              Gönder
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAcik(a => !a)}
        className="flex items-center gap-2 rounded-full bg-slate-800 text-white px-4 py-3 shadow-lg hover:bg-slate-700 transition-colors"
        aria-expanded={acik}
        aria-label="INTRADA Asistan"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"
          />
        </svg>
        <span className="text-sm font-medium hidden sm:inline">Asistan</span>
      </button>
    </div>
  )
}
