'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Tables } from '@/types/database'
import { kadroAuditDegerGoster, kadroAuditDiffSatirlari } from '@/lib/kadro-audit'

type AuditLog = Tables<'personel_audit_log'>

interface Props {
  acik: boolean
  onKapat: () => void
  auditLoglar: AuditLog[]
  adMap: Record<string, string>
}

function islemBadgeClass(islem: string): string {
  const i = islem.toLocaleLowerCase('tr-TR')
  if (i.includes('boşalt')) return 'bg-rose-100 text-rose-700'
  if (i.includes('ekle')) return 'bg-emerald-100 text-emerald-700'
  if (i.includes('güncelle')) return 'bg-indigo-100 text-indigo-700'
  return 'bg-slate-100 text-slate-700'
}

export default function KadroGecmisPanel({ acik, onKapat, auditLoglar, adMap }: Props) {
  const [acikSatirId, setAcikSatirId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!acik) {
      setAcikSatirId(null)
      setSearch('')
    }
  }, [acik])

  const filtreli = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    if (!q) return auditLoglar
    return auditLoglar.filter(log => {
      const actor = String(log.actor_email ?? '').toLocaleLowerCase('tr-TR')
      const ozet = String(log.ozet ?? '').toLocaleLowerCase('tr-TR')
      const islem = String(log.islem ?? '').toLocaleLowerCase('tr-TR')
      return actor.includes(q) || ozet.includes(q) || islem.includes(q)
    })
  }, [auditLoglar, search])

  if (!acik) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Kapat"
        onClick={onKapat}
      />
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Kadro Değişiklik Geçmişi</h2>
            <p className="text-xs text-slate-500 mt-1">
              Bu kadro kaydındaki tüm işlemler. Satıra tıklayarak alan bazlı eski/yeni değerleri görebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={onKapat}
            className="shrink-0 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Kapat
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Özet veya kullanıcı ara…"
            className="min-w-[220px] flex-1 max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <span className="text-xs text-slate-500 ml-auto">
            {filtreli.length} / {auditLoglar.length} kayıt
          </span>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Tarih/Saat</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">İşlem</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Özet</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">İşlemi Yapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    {auditLoglar.length === 0
                      ? 'Bu kadro için henüz kayıtlı değişiklik yok.'
                      : 'Filtreye uyan kayıt bulunamadı.'}
                  </td>
                </tr>
              ) : (
                filtreli.map(log => {
                  const satirAcik = acikSatirId === log.id
                  const diffSatirlari = kadroAuditDiffSatirlari(log.onceki, log.sonraki)
                  return (
                    <Fragment key={log.id}>
                      <tr
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setAcikSatirId(satirAcik ? null : log.id)}
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${islemBadgeClass(log.islem)}`}>
                            {log.islem}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{log.ozet}</td>
                        <td className="px-4 py-3 text-slate-500">{log.actor_email ?? 'Sistem'}</td>
                      </tr>
                      {satirAcik && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={4} className="px-4 py-4">
                            {diffSatirlari.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">Alan bazlı değişiklik detayı yok.</p>
                            ) : (
                              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200">
                                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Alan</th>
                                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Eski</th>
                                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Yeni</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {diffSatirlari.map(d => (
                                      <tr key={d.alan}>
                                        <td className="px-3 py-2 text-slate-700 font-medium">{d.etiket}</td>
                                        <td className="px-3 py-2 text-slate-600">
                                          {kadroAuditDegerGoster(d.alan, d.onceki, adMap)}
                                        </td>
                                        <td className="px-3 py-2 text-slate-800">
                                          {kadroAuditDegerGoster(d.alan, d.sonraki, adMap)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
