'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { CopKutusuSilDugmesi, KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useIntradaTabRefresh } from '@/lib/intrada-tab-sync'
import { ogrenimAuditDegerGoster, ogrenimAuditDiffSatirlari } from '@/lib/ogrenim-audit'
import { sortBildirimOgrenimList } from '@/lib/ogrenim-sira'
import type { Tables } from '@/types/database'

type Ogrenim = Tables<'calisan_ogrenim'> & { ad_soyad?: string | null; tckn?: string | null }

function formatGGAAYYYY(val: string | null | undefined): string {
  if (!val) return '—'
  const d = val.includes('-') ? val : val.split('.').reverse().join('-')
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d)
  if (!m) return val
  const [, y, a, g] = m
  return `${g!.padStart(2, '0')}.${a!.padStart(2, '0')}.${y}`
}

interface Props {
  kayitlar: Ogrenim[]
  ogrenimTurleri: { id: number; isim: string }[]
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil: (id: number) => Promise<{ hata?: string }>
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

export default function OgrenimClient({ kayitlar, ogrenimTurleri, onGuncelle, onSil, auditLoglarByRefId = {} }: Props) {
  const router = useRouter()
  useIntradaTabRefresh('ogrenim', router)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const ok =
        e.data === 'refresh' ||
        (typeof e.data === 'object' &&
          e.data != null &&
          (e.data as { source?: string; type?: string }).source === 'intrada-ogrenim-yeni' &&
          (e.data as { type?: string }).type === 'refresh')
      if (ok) router.refresh()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [router])

  const [arama, setArama] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<Ogrenim | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    const filtered = kayitlar.filter(
      (k) =>
        !q ||
        (k.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (k.tckn ?? '').includes(q) ||
        k.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        (k.ogrenim_turu ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (k.okul_adi ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (k.meslegi ?? '').toLocaleLowerCase('tr-TR').includes(q)
    )
    return sortBildirimOgrenimList(filtered)
  }, [kayitlar, arama])

  function duzenleAc(k: Ogrenim) {
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
          <h1 className="text-2xl font-bold text-slate-800">Öğrenim Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personel öğrenim ve diploma kayıtları</p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.open('/bildirim/ogrenim/yeni', '_blank')
          }}
          className="intrada-btn intrada-btn-ekle"
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
          onChange={(e) => setArama(e.target.value)}
          placeholder="Ad, TC, sicil, öğrenim türü, okul veya meslek ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-40">TC Kimlik No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">Öğrenim Türü</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[8rem]">Okul / Bölüm</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Mesleği</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Mezuniyet Tarihi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Varsayılan</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-14 text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {filtreli.map((row, idx) => {
              const vars = row.varsayilan ?? row.aktif
              const refId = String(row.id)
              const auditLoglar = auditLoglarByRefId[refId] ?? []
              return (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sicil_no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.ad_soyad ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.tckn ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {row.ogrenim_turu ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span>{row.okul_adi ?? '—'}</span>
                    {row.bolum && <span className="text-slate-400 text-xs ml-1">/ {row.bolum}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{row.meslegi ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-500 tabular-nums">
                    {row.mezuniyet_tarihi
                      ? formatGGAAYYYY(row.mezuniyet_tarihi)
                      : row.mezuniyet_yili
                        ? `01.01.${row.mezuniyet_yili}`
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        vars ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {vars ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <SaatGecmisDugmesi
                        sayi={auditLoglar.length}
                        onClick={() => setGecmisRefId(refId)}
                        title="Öğrenim kaydı değişiklik geçmişi"
                      />
                      <KalemDuzenleDugmesi onClick={() => duzenleAc(row)} title="Düzenle" />
                      <CopKutusuSilDugmesi
                        onClick={() => handleSil(row.id)}
                        disabled={isPending}
                        title="Sil"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={formAcik && !!k} onClose={kapat} title="Kayıt Düzenle" size="xl">
        {k && (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğrenim Türü</label>
                <select
                  name="ogrenim_turu"
                  defaultValue={k.ogrenim_turu ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  required
                >
                  <option value="">— Seçiniz —</option>
                  {ogrenimTurleri.map((t) => (
                    <option key={t.id} value={t.isim}>
                      {t.isim}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Okul Adı</label>
                <input
                  name="okul_adi"
                  defaultValue={k.okul_adi ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölüm</label>
                <input
                  name="bolum"
                  defaultValue={k.bolum ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mesleği</label>
                <input
                  name="meslegi"
                  defaultValue={k.meslegi ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mezuniyet Tarihi (gg.aa.yyyy)</label>
                <input
                  name="mezuniyet_tarihi"
                  type="text"
                  placeholder="gg.aa.yyyy"
                  defaultValue={k.mezuniyet_tarihi ? formatGGAAYYYY(k.mezuniyet_tarihi) : ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                name="varsayilan"
                type="checkbox"
                id="varsayilan_cb"
                defaultChecked={k.varsayilan ?? k.aktif}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="varsayilan_cb" className="text-sm text-slate-700">
                Varsayılan öğrenim
              </label>
            </div>
            {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
            <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={kapat}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="intrada-btn intrada-btn-kaydet"
              >
                {isPending ? 'Kaydediliyor…' : 'Güncelle'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Öğrenim Kaydı Geçmişi"
        diffSatirlari={ogrenimAuditDiffSatirlari}
        degerGoster={ogrenimAuditDegerGoster}
      />
    </div>
  )
}
