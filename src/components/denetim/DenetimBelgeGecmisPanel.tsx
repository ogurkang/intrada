'use client'

import { Fragment, useState } from 'react'
import type { Tables } from '@/types/database'
import type { DenetimGoruntulemeGrubu } from '@/lib/denetim-goruntuleme'

type AuditLog = Tables<'personel_audit_log'>

interface Props {
  acik: boolean
  onKapat: () => void
  auditLoglar: AuditLog[]
  goruntulemeler: DenetimGoruntulemeGrubu[]
  baslik?: string
  diffSatirlari: (
    onceki: unknown,
    sonraki: unknown,
  ) => { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[]
  degerGoster: (alan: string, deger: unknown) => string
}

export default function DenetimBelgeGecmisPanel({
  acik,
  onKapat,
  auditLoglar,
  goruntulemeler,
  baslik = 'Belge Geçmişi',
  diffSatirlari,
  degerGoster,
}: Props) {
  const [acikLog, setAcikLog] = useState<number | null>(null)
  const [acikKullanici, setAcikKullanici] = useState<string | null>(null)

  if (!acik) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Kapat" onClick={onKapat} />
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{baslik}</h2>
            <p className="mt-1 text-xs text-slate-500">Yükleme işlemleri ve belgeyi görüntüleyen kullanıcılar.</p>
          </div>
          <button type="button" onClick={onKapat} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            Kapat
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Görüntüleyenler ({goruntulemeler.length} kullanıcı)
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {goruntulemeler.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">Henüz görüntüleme kaydı yok.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {goruntulemeler.map(g => {
                    const key = g.kullaniciId ?? g.email
                    const satirAcik = acikKullanici === key
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => setAcikKullanici(satirAcik ? null : key)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {g.email.slice(0, 1).toLocaleUpperCase('tr-TR')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-700">{g.email}</span>
                            <span className="text-xs text-slate-500">
                              Son görüntüleme: {new Date(g.sonGoruntuleme).toLocaleString('tr-TR')}
                            </span>
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            {g.tarihler.length} kez
                          </span>
                          <svg className={`h-4 w-4 text-slate-400 transition-transform ${satirAcik ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {satirAcik ? (
                          <div className="border-t border-slate-100 bg-slate-50 px-16 py-3">
                            <ul className="space-y-1.5">
                              {g.tarihler.map((tarih, i) => (
                                <li key={`${tarih}-${i}`} className="flex items-center gap-2 text-xs text-slate-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                  {new Date(tarih).toLocaleString('tr-TR')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">İşlem Geçmişi ({auditLoglar.length} kayıt)</h3>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {auditLoglar.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">Henüz işlem kaydı yok.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {auditLoglar.map(log => {
                      const satirAcik = acikLog === log.id
                      const diff = diffSatirlari(log.onceki, log.sonraki)
                      return (
                        <Fragment key={log.id}>
                          <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setAcikLog(satirAcik ? null : log.id)}>
                            <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString('tr-TR')}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">{log.islem}</td>
                            <td className="px-4 py-3 text-slate-600">{log.ozet}</td>
                            <td className="px-4 py-3 text-slate-500">{log.actor_email ?? 'Sistem'}</td>
                          </tr>
                          {satirAcik ? (
                            <tr className="bg-slate-50">
                              <td colSpan={4} className="px-4 py-3">
                                {diff.length ? (
                                  <div className="space-y-1 text-xs">
                                    {diff.map(d => (
                                      <p key={d.alan}>
                                        <strong>{d.etiket}:</strong> {degerGoster(d.alan, d.onceki)} →{' '}
                                        {degerGoster(d.alan, d.sonraki)}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">Alan bazlı değişiklik detayı yok.</p>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
