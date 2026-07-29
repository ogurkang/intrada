'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { CopKutusuSilDugmesi, KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useIntradaTabRefresh } from '@/lib/intrada-tab-sync'
import { sendikaAuditDegerGoster, sendikaAuditDiffSatirlari } from '@/lib/sendika-audit'
import { sortBildirimSendikaList } from '@/lib/sendika-sira'
import type { Tables } from '@/types/database'

type SendikaKayit = {
  id: number
  sicil_no: string
  sendika_id: number
  baslangic_tarihi: string
  aktif: boolean
  ad_soyad?: string | null
  kisa_ad?: string | null
}

interface Props {
  kayitlar: SendikaKayit[]
  sendikalar: { id: number; statu: string; kisa_ad: string; uzun_ad: string; aktif: boolean }[]
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil: (id: number) => Promise<{ hata?: string }>
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

function formatGGAAYYYY(val: string | null | undefined): string {
  if (!val) return '—'
  const d = val.includes('-') ? val : val.split('.').reverse().join('-')
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d)
  if (!m) return val
  const [, y, a, g] = m
  return `${g!.padStart(2, '0')}.${a!.padStart(2, '0')}.${y}`
}

export default function SendikaBildirimClient({
  kayitlar,
  sendikalar,
  onGuncelle,
  onSil,
  auditLoglarByRefId = {},
}: Props) {
  const router = useRouter()
  useIntradaTabRefresh('sendika', router)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const ok =
        e.data === 'refresh' ||
        (typeof e.data === 'object' &&
          e.data != null &&
          (e.data as { source?: string; type?: string }).source === 'intrada-sendika-yeni' &&
          (e.data as { type?: string }).type === 'refresh')
      if (ok) router.refresh()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [router])

  const [arama, setArama] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<SendikaKayit | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    const filtered = kayitlar.filter(
      k =>
        !q ||
        (k.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        k.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        (k.kisa_ad ?? '').toLocaleLowerCase('tr-TR').includes(q),
    )
    return sortBildirimSendikaList(filtered)
  }, [kayitlar, arama])

  function duzenleAc(k: SendikaKayit) {
    setSecili(k)
    setHata(null)
    setFormAcik(true)
  }

  function kapat() {
    setFormAcik(false)
    setSecili(null)
    setHata(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    if (!secili) return
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(secili.id, fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  function handleSil(id: number) {
    if (!confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const res = await onSil(id)
      if (res.hata) alert(res.hata)
    })
  }

  const k = secili

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sendika Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personel sendika üyelik kayıtları</p>
        </div>
        <button
          type="button"
          onClick={() => window.open('/bildirim/sendika/yeni', '_blank')}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Kayıt
        </button>
      </div>

      <div className="mb-4">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Ad, sicil veya sendika ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-48">Sendika Kısa Adı</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-14 text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {filtreli.map((row, idx) => {
              const refId = String(row.id)
              const auditLoglar = auditLoglarByRefId[refId] ?? []
              return (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sicil_no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.ad_soyad ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 bg-fuchsia-50 text-fuchsia-800 rounded text-xs font-medium">
                      {row.kisa_ad ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <SaatGecmisDugmesi
                        sayi={auditLoglar.length}
                        onClick={() => setGecmisRefId(refId)}
                        title="Sendika kaydı değişiklik geçmişi"
                      />
                      <KalemDuzenleDugmesi onClick={() => duzenleAc(row)} title="Düzenle" />
                      <CopKutusuSilDugmesi onClick={() => handleSil(row.id)} disabled={isPending} title="Sil" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={formAcik && !!k} onClose={kapat} title="Kayıt Düzenle" size="lg">
        {k && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {hata && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>
            )}
            <p className="text-sm text-slate-600">
              {k.ad_soyad} <span className="font-mono text-xs">({k.sicil_no})</span>
            </p>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Sendika</span>
              <select
                name="sendika_id"
                defaultValue={k.sendika_id}
                required
                className="border border-slate-300 rounded-lg px-3 py-2"
              >
                {sendikalar
                  .filter(s => s.aktif || s.id === k.sendika_id)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.statu}] {s.kisa_ad}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Başlangıç Tarihi</span>
              <input
                name="baslangic_tarihi"
                type="text"
                placeholder="GG.AA.YYYY"
                defaultValue={formatGGAAYYYY(k.baslangic_tarihi)}
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={kapat} className="px-4 py-2 text-sm text-slate-600">
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Sendika Kaydı Geçmişi"
        diffSatirlari={sendikaAuditDiffSatirlari}
        degerGoster={sendikaAuditDegerGoster}
      />
    </div>
  )
}
