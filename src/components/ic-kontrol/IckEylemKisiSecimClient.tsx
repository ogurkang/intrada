'use client'

import { useEffect, useMemo, useState } from 'react'
import { ickMudurlukPersoneli } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_INPUT, IckUyari } from '@/components/ic-kontrol/IckUi'
import { trNormalize } from '@/lib/turkce-search'
import type { IckPersonel } from '@/lib/ick/yukle'

type Rol = '' | 'k' | 'i'

/** Sorumlu müdürlüğün görevdeki personelinden müdürlük koordinatörü ve işlemcisi seçimi */
export default function IckEylemKisiSecimClient({
  mudurlukId,
  koordinatorler,
  islemciler,
  onChange,
}: {
  mudurlukId: number | null
  koordinatorler: string[]
  islemciler: string[]
  onChange: (koordinatorler: string[], islemciler: string[]) => void
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
  const liste = useMemo(() => guncel?.liste ?? [], [guncel])

  function rolu(sicil: string): Rol {
    return koordinatorler.includes(sicil) ? 'k' : islemciler.includes(sicil) ? 'i' : ''
  }

  const gorunen = useMemo(() => {
    const q = trNormalize(ara.trim())
    const l = q ? liste.filter(p => trNormalize(`${p.ad} ${p.sicil} ${p.unvan}`).includes(q)) : liste
    const sira = (s: string) => (koordinatorler.includes(s) ? 0 : islemciler.includes(s) ? 1 : 2)
    return [...l].sort((a, b) => sira(a.sicil) - sira(b.sicil))
  }, [liste, ara, koordinatorler, islemciler])

  if (!mudurlukId) return <p className="text-sm text-slate-500">Önce sorumlu müdürlüğü seçin.</p>
  if (guncel?.hata) return <IckUyari tur="hata" metin={guncel.hata} />

  function degistir(sicil: string, rol: Rol) {
    const k = koordinatorler.filter(s => s !== sicil)
    const i = islemciler.filter(s => s !== sicil)
    if (rol === 'k') k.push(sicil)
    if (rol === 'i') i.push(sicil)
    onChange(k, i)
  }

  const listedeOlmayan = [...koordinatorler, ...islemciler].filter(s => !liste.some(p => p.sicil === s))

  return (
    <div className="space-y-2">
      <input className={ICK_INPUT} placeholder="Ad veya unvan ara" value={ara} onChange={e => setAra(e.target.value)} />
      {yukleniyor ? <p className="text-sm text-slate-500">Personel yükleniyor…</p> : null}
      {!yukleniyor && !liste.length ? <p className="text-sm text-slate-500">Bu müdürlükte görevli personel bulunamadı.</p> : null}
      {listedeOlmayan.length && !yukleniyor && liste.length ? (
        <IckUyari metin={`Seçili ${listedeOlmayan.length} kişi artık bu müdürlükte görünmüyor; kaydederseniz eylemden çıkar.`} />
      ) : null}
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {gorunen.map(p => {
          const r = rolu(p.sicil)
          return (
            <div key={p.sicil} className={`flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm ${r ? 'bg-blue-50/60' : ''}`}>
              <span className="min-w-0">
                <span className="font-medium text-slate-800">{p.ad}</span>
                {p.unvan ? <span className="block text-xs text-slate-500">{p.unvan}</span> : null}
                {!p.hesapVar ? (
                  <span className="block text-xs text-amber-700">Uygulamada kullanıcı hesabı yok; hesap açılınca yetkisi çalışır.</span>
                ) : !p.menuAcik ? (
                  <span className="block text-xs text-amber-700">İç Kontrol menüsü kapalı; Yetkilendirme ekranından açılmalı.</span>
                ) : null}
              </span>
              <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={r} onChange={e => degistir(p.sicil, e.target.value as Rol)}>
                <option value="">Seçilmedi</option>
                <option value="k">Müdürlük koordinatörü</option>
                <option value="i">Müdürlük işlemcisi</option>
              </select>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-500">
        {koordinatorler.length} müdürlük koordinatörü, {islemciler.length} işlemci seçili.
        {!koordinatorler.length ? <span className="text-red-700"> Müdürlük koordinatörü seçilmezse bu eylemin bildirimi koordinatöre gönderilemez.</span> : null}
      </p>
    </div>
  )
}
