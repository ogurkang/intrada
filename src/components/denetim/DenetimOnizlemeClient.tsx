'use client'

import { useEffect, useState } from 'react'

interface Props {
  belgeUrl: string
  dosyaAdi: string
  mimeType: string | null
}

export default function DenetimOnizlemeClient({ belgeUrl, dosyaAdi, mimeType }: Props) {
  const pdf = mimeType === 'application/pdf' || dosyaAdi.toLocaleLowerCase('tr-TR').endsWith('.pdf')
  const [src, setSrc] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(pdf)

  useEffect(() => {
    if (!pdf) return
    let iptal = false
    let objectUrl: string | null = null

    async function yukle() {
      setYukleniyor(true)
      setHata(null)
      try {
        const metaRes = await fetch(belgeUrl, { credentials: 'same-origin', cache: 'no-store' })
        const contentType = metaRes.headers.get('content-type') ?? ''
        if (!metaRes.ok) {
          throw new Error('Belge alınamadı.')
        }

        let pdfBlob: Blob
        if (contentType.includes('application/json')) {
          const meta = (await metaRes.json()) as { url?: string; hata?: string; bucket?: string; path?: string }
          if (!meta.url) throw new Error(meta.hata ?? 'Belge adresi oluşturulamadı.')
          let buf: ArrayBuffer
          try {
            const fileRes = await fetch(meta.url)
            if (!fileRes.ok) throw new Error('Belge indirilemedi.')
            buf = await fileRes.arrayBuffer()
          } catch {
            if (!meta.bucket || !meta.path) throw new Error('Belge indirilemedi.')
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { data, error } = await supabase.storage.from(meta.bucket).download(meta.path)
            if (error || !data) throw new Error('Belge indirilemedi.')
            buf = await data.arrayBuffer()
          }
          pdfBlob = new Blob([buf], { type: 'application/pdf' })
        } else {
          const buf = await metaRes.arrayBuffer()
          pdfBlob = new Blob([buf], { type: 'application/pdf' })
        }

        objectUrl = URL.createObjectURL(pdfBlob)
        if (iptal) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        setSrc(`${objectUrl}#toolbar=0&navpanes=0`)
      } catch {
        if (!iptal) setHata('PDF görüntülenemedi. Sayfayı yenileyip tekrar deneyin.')
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }

    void yukle()
    return () => {
      iptal = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [belgeUrl, pdf])

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
      <div className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-800 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{dosyaAdi}</p>
          <p className="text-xs text-slate-400">Salt görüntüleme · indirme bağlantısı sunulmaz</p>
        </div>
        <button type="button" onClick={() => window.close()} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-700">
          Kapat
        </button>
      </div>
      <div className="relative flex-1 bg-slate-700" onContextMenu={e => e.preventDefault()}>
        {pdf ? (
          <>
            {yukleniyor ? (
              <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-200">
                Belge yükleniyor…
              </div>
            ) : null}
            {hata ? (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8">
                <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{hata}</p>
              </div>
            ) : null}
            {src ? (
              <embed
                src={src}
                type="application/pdf"
                title={dosyaAdi}
                className="absolute inset-0 h-full min-h-[720px] w-full border-0 bg-white"
              />
            ) : null}
          </>
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center p-8">
            <div className="max-w-md rounded-xl border border-slate-600 bg-slate-800 p-6 text-center text-slate-200">
              <p className="text-sm font-medium">Bu belge tarayıcıda görüntülenemiyor.</p>
              <p className="mt-2 text-xs text-slate-400">
                Word ve Excel dosyaları yalnızca indirilerek açılabildiğinden, salt görüntüleme kuralı gereği
                burada gösterilmez. Belgenin görüntülenebilmesi için PDF biçiminde yüklenmesi gerekir.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
