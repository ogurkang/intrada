'use client'

/**
 * Next.js App Router — beklenmeyen hatalar için kök sınır.
 * Geliştirme ortamında boundary-components ile ilgili uyarıları azaltmaya yardımcı olabilir.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-slate-800">
        <h1 className="text-xl font-semibold">Bir hata oluştu</h1>
        <p className="text-sm text-slate-600 text-center max-w-md">
          {process.env.NODE_ENV === 'development' ? error.message : 'Sayfa yüklenirken beklenmeyen bir sorun oluştu.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          Yeniden dene
        </button>
      </body>
    </html>
  )
}
