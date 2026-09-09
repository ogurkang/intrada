'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { personelDetayHref } from '@/lib/personel-link'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import type { Tables } from '@/types/database'

interface Satir {
  sicil_no: string
  public_id: string
  ad_soyad: string
  tckn: string | null
  deger: string | null
  kadro_unvani?: string | null
  gorev_unvani?: string | null
}

interface Props {
  baslik: string
  alanEtiketi: string
  data: Satir[]
  inputType: 'text' | 'select'
  secenekler?: string[]
  /** Select boş seçenek metni (varsayılan: —) */
  bosSecenekEtiketi?: string
  sortBy?: 'ad_soyad' | 'sicil_no' | 'sicil_no_desc'
  onSatirKaydet: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  onTopluKaydet: (satirlar: { sicil_no: string; deger: string | null }[]) => Promise<{ hata?: string; kaydedilen?: number }>
  /** Bu değere sahip satırlar amber arka plan alır */
  vurguDeger?: string
  /** TCKN yerine kadro ünvanı ve görev ünvanı sütunları */
  unvanSutunlari?: boolean
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
  auditBaslik?: string
  auditDiffSatirlari?: (
    onceki: unknown,
    sonraki: unknown,
  ) => { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[]
  auditDegerGoster?: (alan: string, deger: unknown) => string
}

export default function PersonelTekAlanTopluClient({
  baslik,
  alanEtiketi,
  data,
  inputType,
  secenekler = [],
  bosSecenekEtiketi = '—',
  sortBy = 'ad_soyad',
  onSatirKaydet,
  onTopluKaydet,
  vurguDeger,
  unvanSutunlari = false,
  auditLoglarByRefId = {},
  auditBaslik = 'Değişiklik Geçmişi',
  auditDiffSatirlari,
  auditDegerGoster,
}: Props) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [arama, setArama] = useState('')
  const [duzenlenenSicil, setDuzenlenenSicil] = useState<string | null>(null)
  const [inline, setInline] = useState<Record<string, string>>({})
  const [toplu, setToplu] = useState<Record<string, string>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [topluMesaj, setTopluMesaj] = useState<string | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const auditAcik = Boolean(auditDiffSatirlari && auditDegerGoster)

  const sirali = useMemo(
    () =>
      [...data].sort((a, b) =>
        sortBy === 'sicil_no'
          ? a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
          : sortBy === 'sicil_no_desc'
            ? b.sicil_no.localeCompare(a.sicil_no, 'tr', { numeric: true })
          : a.ad_soyad.localeCompare(b.ad_soyad, 'tr'),
      ),
    [data, sortBy],
  )

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return sirali
    return sirali.filter(
      p =>
        p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        p.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        String(p.tckn ?? '').includes(q) ||
        String(p.kadro_unvani ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        String(p.gorev_unvani ?? '').toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [sirali, arama])

  function mevcutDeger(s: Satir): string {
    return s.deger ?? ''
  }

  function inlineDeger(s: Satir): string {
    return inline[s.sicil_no] ?? mevcutDeger(s)
  }

  function topluDeger(s: Satir): string {
    return toplu[s.sicil_no] ?? mevcutDeger(s)
  }

  function handleInlineKaydet(s: Satir) {
    const fd = new FormData()
    fd.set('value', inlineDeger(s))
    fd.set(alanEtiketi, inlineDeger(s))
    setHata(null)
    startTransition(async () => {
      const res = await onSatirKaydet(s.sicil_no, fd)
      if (res.hata) setHata(res.hata)
      else {
        setDuzenlenenSicil(null)
        setInline({})
        router.refresh()
      }
    })
  }

  function handleInlineVazgec(sicil: string) {
    setDuzenlenenSicil(null)
    setInline(prev => {
      const n = { ...prev }
      delete n[sicil]
      return n
    })
  }

  function handleTopluKaydet() {
    const degisen = sirali
      .filter(s => topluDeger(s) !== mevcutDeger(s))
      .map(s => ({ sicil_no: s.sicil_no, deger: topluDeger(s) || null }))
    if (!degisen.length) {
      setTopluMesaj('Değişiklik yapılmadı.')
      return
    }
    setTopluMesaj(null)
    startTransition(async () => {
      const res = await onTopluKaydet(degisen)
      if (res.hata) setTopluMesaj(res.hata)
      else {
        setToplu({})
        setTopluMesaj(`${res.kaydedilen ?? degisen.length} kayıt güncellendi.`)
        router.refresh()
      }
    })
  }

  const InputCell = (props: { value: string; onChange: (v: string) => void }) =>
    inputType === 'select' ? (
      <select
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        className="w-44 px-2 py-1 border border-slate-300 rounded text-sm bg-white"
      >
        <option value="">{bosSecenekEtiketi}</option>
        {secenekler.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    ) : (
      <input
        type="text"
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        className="w-44 px-2 py-1 border border-slate-300 rounded text-sm"
      />
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-500">Satır bazlı veya toplu güncelleme yapabilirsiniz.</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          <button className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'liste' ? 'bg-white shadow' : ''}`} onClick={() => setSekme('liste')}>Kayıt Listesi</button>
          <button className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'toplu' ? 'bg-white shadow' : ''}`} onClick={() => setSekme('toplu')}>Toplu Güncelle</button>
        </div>
      </div>

      {sekme === 'liste' && (
        <>
          <input
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder={unvanSutunlari ? 'Ad, sicil, ünvan ara…' : 'Ad, sicil, TCKN ara…'}
            className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
        </>
      )}

      {sekme === 'toplu' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Değişen satırlar kaydedilir.</p>
          <button onClick={handleTopluKaydet} disabled={isPending} className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg">
            {isPending ? 'Kaydediliyor…' : 'Toplu Kaydet'}
          </button>
        </div>
      )}
      {topluMesaj && <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{topluMesaj}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className={`w-full text-sm ${unvanSutunlari ? 'min-w-[920px]' : 'min-w-[760px]'}`}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-center">#</th>
              <th className="px-3 py-3 text-left">Sicil No</th>
              <th className="px-3 py-3 text-left">Adı Soyadı</th>
              {unvanSutunlari ? (
                <>
                  <th className="px-3 py-3 text-left">Kadro Ünvanı</th>
                  <th className="px-3 py-3 text-left">Görev Ünvanı</th>
                </>
              ) : (
                <th className="px-3 py-3 text-left">TCKN</th>
              )}
              <th className="px-3 py-3 text-left">{alanEtiketi}</th>
              {sekme === 'liste' && <th className="px-3 py-3 text-right">İşlem</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(sekme === 'liste' ? filtreli : sirali).map((s, i) => {
              const duz = duzenlenenSicil === s.sicil_no
              const gosterilen = sekme === 'toplu' ? topluDeger(s) : duz ? inlineDeger(s) : mevcutDeger(s)
              const vurgu = !duz && vurguDeger && gosterilen === vurguDeger ? 'bg-amber-50' : ''
              const auditLoglar = auditLoglarByRefId[s.sicil_no] ?? []
              return (
                <tr
                  key={s.sicil_no}
                  className={duz ? 'bg-blue-50' : vurgu}
                >
                  <td className="px-3 py-2 text-center">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs">{s.sicil_no}</td>
                  <td className="px-3 py-2">
                    <Link href={personelDetayHref(s)} className="hover:underline">{s.ad_soyad}</Link>
                  </td>
                  {unvanSutunlari ? (
                    <>
                      <td className="px-3 py-2 text-slate-700">{s.kadro_unvani?.trim() || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{s.gorev_unvani?.trim() || '—'}</td>
                    </>
                  ) : (
                    <td className="px-3 py-2">{s.tckn ?? '—'}</td>
                  )}
                  <td className="px-3 py-2">
                    {sekme === 'liste' ? (
                      duz ? (
                        <InputCell value={inlineDeger(s)} onChange={v => setInline(prev => ({ ...prev, [s.sicil_no]: v }))} />
                      ) : (
                        <span>{mevcutDeger(s) || '—'}</span>
                      )
                    ) : (
                      <InputCell value={topluDeger(s)} onChange={v => setToplu(prev => ({ ...prev, [s.sicil_no]: v }))} />
                    )}
                  </td>
                  {sekme === 'liste' && (
                    <td className="px-3 py-2">
                      {duz ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleInlineVazgec(s.sicil_no)}
                            disabled={isPending}
                            className="text-xs text-slate-600 px-2 py-1.5 rounded hover:bg-slate-100"
                          >
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInlineKaydet(s)}
                            disabled={isPending}
                            className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded"
                          >
                            Kaydet
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {auditAcik && (
                            <SaatGecmisDugmesi
                              sayi={auditLoglar.length}
                              onClick={() => setGecmisRefId(s.sicil_no)}
                              title="Değişiklik geçmişi"
                            />
                          )}
                          <KalemDuzenleDugmesi
                            onClick={() => setDuzenlenenSicil(s.sicil_no)}
                            title="Düzenle"
                          />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {auditAcik && auditDiffSatirlari && auditDegerGoster && (
        <AuditGecmisPanel
          acik={gecmisRefId != null}
          onKapat={() => setGecmisRefId(null)}
          auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
          baslik={auditBaslik}
          diffSatirlari={auditDiffSatirlari}
          degerGoster={auditDegerGoster}
        />
      )}
    </div>
  )
}
