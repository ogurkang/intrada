'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import RaporGecmisPanel from '@/components/rapor/RaporGecmisPanel'
import type { RaporYonetimSatir } from '@/lib/rapor-yonetim-load'

type AuditLog = Tables<'personel_audit_log'>

interface Props {
  raporlar: RaporYonetimSatir[]
  auditLoglarByKod: Record<string, AuditLog[]>
  kullaniciModu: boolean
}

function tarihGoster(v: string | null | undefined): string {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10)
  return d.toLocaleDateString('tr-TR')
}

function tarihSaatGoster(v: string | null | undefined): string {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR')
}

export default function RaporYonetimClient({ raporlar, auditLoglarByKod, kullaniciModu }: Props) {
  const [gecmisKod, setGecmisKod] = useState<string | null>(null)
  const gecmisRapor = gecmisKod ? raporlar.find(r => r.kod === gecmisKod) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rapor Yönetimi</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Aşağıdaki raporlar yıllık ve aylık dönem sekmeleriyle sunulur; her raporda genel özet ve dönem bazlı detay
          bulunur. Kartlarda rapor oluşturulma tarihi ve kapsam değişikliği kayıtları gösterilir.
        </p>
        {kullaniciModu && (
          <p className="mt-3 text-xs text-slate-500">
            Erişim, yetkilendirme ekranındaki «Rapor Yönetimi» modül iznine bağlıdır.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {raporlar.map(r => (
          <article
            key={r.kod}
            className={`rounded-xl border p-5 flex flex-col ${r.renk}`}>
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-widest opacity-60">{r.kod}</span>
                <h2 className="font-semibold text-slate-800 mt-0.5 leading-snug">{r.baslik}</h2>
              </div>
              {(auditLoglarByKod[r.kod]?.length ?? 0) > 0 && (
                <button
                  type="button"
                  title="Kapsam geçmişi"
                  onClick={() => setGecmisKod(r.kod)}
                  className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50/80 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75"
                    />
                  </svg>
                </button>
              )}
            </div>

            <p className="text-xs opacity-80 mb-4 leading-relaxed flex-1">{r.aciklama}</p>

            <div className="mt-auto space-y-2 pt-2 border-t border-black/5">
              <Link
                href={r.href}
                className="inline-flex items-center justify-center w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white/70 hover:bg-white border border-black/10 text-slate-800 transition-colors">
                Raporu Aç →
              </Link>

              <div className="text-[11px] leading-relaxed opacity-90 space-y-1 px-0.5">
                <p>
                  <span className="font-medium text-slate-700">Oluşturulma Tarihi:</span>{' '}
                  {tarihGoster(r.olusturulma_tarihi)}
                </p>
                {r.sonKapsam ? (
                  <div>
                    <p className="font-medium text-slate-700">Son kapsam kaydı:</p>
                    <p className="opacity-85">{r.sonKapsam.ozet}</p>
                    <p className="opacity-75 tabular-nums">
                      {tarihSaatGoster(r.sonKapsam.tarih)}
                      {r.sonKapsam.actor_email ? ` · ${r.sonKapsam.actor_email}` : ''}
                      {r.sonKapsam.kaynak === 'supabase' && !auditLoglarByKod[r.kod]?.length
                        ? ' · (mevcut Supabase kaydı)'
                        : ''}
                    </p>
                  </div>
                ) : (
                  <p className="opacity-75 italic">Henüz kapsam değişikliği kaydı yok.</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <RaporGecmisPanel
        acik={gecmisKod != null}
        onKapat={() => setGecmisKod(null)}
        auditLoglar={gecmisKod ? (auditLoglarByKod[gecmisKod] ?? []) : []}
        baslik={gecmisRapor ? `Kapsam Geçmişi — ${gecmisRapor.baslik}` : undefined}
      />
    </div>
  )
}
