'use client'

import { useEffect, useMemo, useState } from 'react'
import { ickMudurlukPersoneli } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_INPUT, IckUyari } from '@/components/ic-kontrol/IckUi'
import { trNormalize } from '@/lib/turkce-search'
import type { IckPersonel } from '@/lib/ick/yukle'

/** Müdürlüğün görevdeki personelinden çoklu seçim */
export default function IckPersonelSecimClient({
  mudurlukId,
  secili,
  onChange,
}: {
  mudurlukId: number | null
  secili: string[]
  onChange: (siciller: string[]) => void
}) {
  const [sonuc, setSonuc] = useState<{ mudurlukId: number; liste: IckPersonel[]; hata: string | null } | null>(null)
  const [ara, setAra] = useState('')

  useEffect(() => {
    if (!mudurlukId) return
    let iptal = false
    ickMudurlukPersoneli(mudurlukId).then(s => {
      if (!iptal) setSonuc({ mudurlukId, liste: s.personel ?? [], hata: s.hata ?? null })
    })
    return () => {
      iptal = true
    }
  }, [mudurlukId])

  const guncel = sonuc && sonuc.mudurlukId === mudurlukId ? sonuc : null
  const yukleniyor = mudurlukId != null && !guncel
  const hata = guncel?.hata ?? null
  const liste = useMemo(() => guncel?.liste ?? [], [guncel])

  const gorunen = useMemo(() => {
    const q = trNormalize(ara.trim())
    const l = q ? liste.filter(p => trNormalize(`${p.ad} ${p.sicil} ${p.unvan}`).includes(q)) : liste
    return [...l].sort((a, b) => Number(secili.includes(b.sicil)) - Number(secili.includes(a.sicil)))
  }, [liste, ara, secili])

  if (!mudurlukId) return <p className="text-sm text-slate-500">Önce müdürlüğü seçin.</p>
  if (hata) return <IckUyari tur="hata" metin={hata} />

  function degistir(sicil: string) {
    onChange(secili.includes(sicil) ? secili.filter(s => s !== sicil) : [...secili, sicil])
  }

  const listedeOlmayan = secili.filter(s => !liste.some(p => p.sicil === s))

  return (
    <div className="space-y-2">
      <input className={ICK_INPUT} placeholder="Ad veya unvan ara" value={ara} onChange={e => setAra(e.target.value)} />
      {yukleniyor ? <p className="text-sm text-slate-500">Personel yükleniyor…</p> : null}
      {!yukleniyor && !liste.length ? <p className="text-sm text-slate-500">Bu müdürlükte görevli personel bulunamadı.</p> : null}
      {listedeOlmayan.length && !yukleniyor && liste.length ? (
        <IckUyari metin={`Seçili ${listedeOlmayan.length} kişi artık bu müdürlükte görünmüyor; kaydederseniz listeden çıkar.`} />
      ) : null}
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {gorunen.map(p => (
          <label key={p.sicil} className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={secili.includes(p.sicil)} onChange={() => degistir(p.sicil)} />
            <span className="min-w-0">
              <span className="font-medium text-slate-800">{p.ad}</span>
              {p.unvan ? <span className="block text-xs text-slate-500">{p.unvan}</span> : null}
              {!p.hesapVar ? (
                <span className="block text-xs text-amber-700">Uygulamada kullanıcı hesabı yok; hesap açılınca yetkisi çalışır.</span>
              ) : !p.menuAcik ? (
                <span className="block text-xs text-amber-700">İç Kontrol menüsü kapalı; Yetkilendirme ekranından açılmalı.</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500">{secili.length} kişi seçili.</p>
    </div>
  )
}
