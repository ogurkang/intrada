'use client'

/** Yeni sekmede açılan sayfayı kapatır; opener yoksa geri dönülecek href kullanılır. */
export default function PpSekmeKapatDugmesi({
  geriHref,
  etiket = 'Kapat',
}: {
  geriHref?: string
  etiket?: string
}) {
  return (
    <button
      type="button"
      onClick={() => {
        try { window.close() } catch { /* tarayıcı engelleyebilir */ }
        if (!window.closed && geriHref) window.location.href = geriHref
      }}
      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {etiket}
    </button>
  )
}
