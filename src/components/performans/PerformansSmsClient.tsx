'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { performansSmsAyarKaydet } from '@/app/(dashboard)/performans/actions'

export default function PerformansSmsClient({
  smsMetin,
  isAdmin,
}: {
  smsMetin: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [metin, setMetin] = useState(smsMetin)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/performans/tanimlar"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Tanımlar
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">SMS Şablonu</h1>
        <p className="text-sm text-slate-600 mt-1">
          2. amire gönderilen performans bildirim SMS metni.
        </p>
      </div>

      {(hata || mesaj) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            hata
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {hata ?? mesaj}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">2. amir bildirim metni</h2>
        <p className="text-xs text-slate-500">
          Değişkenler: {'{ad_soyad}'}, {'{ad}'}, {'{yil}'}
        </p>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[120px]"
          value={metin}
          disabled={!isAdmin}
          onChange={e => setMetin(e.target.value)}
        />
        {isAdmin && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setHata(null)
              setMesaj(null)
              start(async () => {
                const r = await performansSmsAyarKaydet(metin)
                if (r.hata) setHata(r.hata)
                else {
                  setMesaj('SMS şablonu kaydedildi.')
                  router.refresh()
                }
              })
            }}
            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            Kaydet
          </button>
        )}
      </section>
    </div>
  )
}
