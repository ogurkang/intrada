'use client'

interface Props {
  belgeUrl: string
  dosyaAdi: string
  mimeType: string | null
}

export default function DenetimOnizlemeClient({ belgeUrl, dosyaAdi, mimeType }: Props) {
  const pdf = mimeType === 'application/pdf' || dosyaAdi.toLocaleLowerCase('tr-TR').endsWith('.pdf')
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
          <iframe
            src={`${belgeUrl}#toolbar=0&navpanes=0`}
            title={dosyaAdi}
            className="absolute inset-0 h-full min-h-[720px] w-full border-0 bg-white"
          />
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
