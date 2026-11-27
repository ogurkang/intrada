'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Modal genişliği: 'sm' … 'xl' sabit; 'fit' içerik kadar (yatay taşmayı önlemek için max viewport). */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fit'
  /** false ise dikey kaydırma çubuğu yok; panel içeriğe göre büyür (varsayılan true). */
  scrollable?: boolean
}

const boyutlar = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  fit: 'max-w-[min(96vw,72rem)] w-max',
}

export default function Modal({ open, onClose, title, children, size = 'md', scrollable = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // ESC tuşuyla kapatma
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Açıkken scroll kilitle
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Arka plan overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal paneli */}
      <div
        ref={panelRef}
        className={`relative bg-white rounded-2xl shadow-2xl ${size === 'fit' ? '' : 'w-full'} ${boyutlar[size]} flex flex-col ${
          scrollable ? 'max-h-[90vh]' : 'max-h-none'
        }`}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 id="modal-title" className="text-base font-semibold text-slate-800">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                       hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Kapat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`flex-1 px-6 py-4 ${scrollable ? 'overflow-y-auto' : 'overflow-visible'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
