'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import {
  performansImzaAuditDiffSatirlari,
  performansImzaAuditDegerGoster,
} from '@/lib/performans-imza-audit'
import { performansAmirImzaYukle } from '@/app/(dashboard)/performans/actions'

export type PerformansAmirImzaSatir = {
  sicil_no: string
  ad_soyad: string
  unvan: string | null
  roller: ('1. amir' | '2. amir')[]
  imza_url: string | null
  dosya_adi: string | null
  updated_at: string | null
}

export default function PerformansImzalarClient({
  amirler,
  isAdmin,
  auditLoglarBySicil,
}: {
  amirler: PerformansAmirImzaSatir[]
  isAdmin: boolean
  auditLoglarBySicil: Record<string, Tables<'personel_audit_log'>[]>
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [gecmisSicil, setGecmisSicil] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function yukle(sicil: string) {
    const input = fileRefs.current[sicil]
    const file = input?.files?.[0]
    if (!file) {
      setHata('Lütfen bir görsel dosyası seçin (PNG, JPEG veya WebP).')
      return
    }
    setHata(null)
    setMesaj(null)
    const fd = new FormData()
    fd.set('sicil_no', sicil)
    fd.set('file', file)
    start(async () => {
      const r = await performansAmirImzaYukle(fd)
      if (r.hata) setHata(r.hata)
      else {
        setMesaj(`${sicil} imzası kaydedildi.`)
        if (input) input.value = ''
        router.refresh()
      }
    })
  }

  const gecmisAmir = gecmisSicil ? amirler.find(a => a.sicil_no === gecmisSicil) : null

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/performans/tanimlar"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Tanımlar
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Amir İmzaları</h1>
        <p className="text-sm text-slate-600 mt-1">
          1. ve 2. amir personellerin Ek-5 formlarında kullanılacak imza görselleri. Yükleme ve
          değiştirme işlemleri log kaydına alınır.
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Sicil</th>
              <th className="px-4 py-3">Ad Soyad</th>
              <th className="px-4 py-3">Ünvan</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">İmza</th>
              {isAdmin && <th className="px-4 py-3">Yükle / Değiştir</th>}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {amirler.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                  Henüz değerlendirme kaydında amir atanmamış.
                </td>
              </tr>
            ) : (
              amirler.map(a => (
                <tr key={a.sicil_no} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{a.sicil_no}</td>
                  <td className="px-4 py-3">{a.ad_soyad}</td>
                  <td className="px-4 py-3 text-slate-600">{a.unvan ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.roller.map(r => (
                        <span
                          key={r}
                          className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {a.imza_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.imza_url}
                        alt={`${a.ad_soyad} imzası`}
                        className="h-10 max-w-[120px] object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">Yüklenmedi</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          ref={el => {
                            fileRefs.current[a.sicil_no] = el
                          }}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="text-xs max-w-[160px]"
                          disabled={pending}
                        />
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => yukle(a.sicil_no)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50"
                        >
                          {a.imza_url ? 'Değiştir' : 'Yükle'}
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    {(auditLoglarBySicil[a.sicil_no]?.length ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setGecmisSicil(a.sicil_no)}
                        className="text-xs text-sky-700 hover:underline"
                        title="İmza geçmişi"
                      >
                        Geçmiş ({auditLoglarBySicil[a.sicil_no]?.length})
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AuditGecmisPanel
        acik={gecmisSicil != null}
        onKapat={() => setGecmisSicil(null)}
        baslik={`İmza Geçmişi — ${gecmisAmir?.ad_soyad ?? gecmisSicil ?? ''}`}
        aciklama="İmza yükleme ve değiştirme kayıtları."
        auditLoglar={gecmisSicil ? auditLoglarBySicil[gecmisSicil] ?? [] : []}
        diffSatirlari={performansImzaAuditDiffSatirlari}
        degerGoster={performansImzaAuditDegerGoster}
      />
    </div>
  )
}
