'use client'

import Link from 'next/link'

export default function MihenkTaslariError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-lg mx-auto mt-12 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <h1 className="text-lg font-bold text-red-900">Mihenk Taşları yüklenemedi</h1>
      <p className="mt-2 text-sm text-red-800/90">
        {error.message || 'Beklenmeyen bir hata oluştu.'}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="text-sm font-medium px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600"
        >
          Tekrar dene
        </button>
        <Link href="/" className="text-sm font-medium text-red-900 underline underline-offset-2">
          Genel Bakış
        </Link>
      </div>
    </div>
  )
}
