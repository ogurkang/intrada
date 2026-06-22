'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SmsGonderInput, SmsGonderActionSonuc } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'

export interface SmsPersonelSatir {
  sicil_no: string
  ad_soyad: string
  telefon: string
  telefon_gecerli: boolean
  mudurluk: string
  statu: string
}

export interface SmsLogSatir {
  id: number
  alici_ad: string | null
  alici_sicil: string | null
  telefon: string
  mesaj: string
  durum: string
  hata_mesaji: string | null
  actor_email: string | null
  created_at: string
}

interface Props {
  personeller: SmsPersonelSatir[]
  loglar: SmsLogSatir[]
  adminMi: boolean
  gonderimAcik: boolean
  onGonder: (input: SmsGonderInput) => Promise<SmsGonderActionSonuc>
}

function benzersiz(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
}

function smsAdedi(uzunluk: number): number {
  if (uzunluk === 0) return 0
  if (uzunluk <= 160) return 1
  return Math.ceil(uzunluk / 153)
}

function tarihFmt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SmsIslemleriClient({ personeller, loglar, adminMi, gonderimAcik, onGonder }: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [mudurluk, setMudurluk] = useState('')
  const [statu, setStatu] = useState('')
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [manuel, setManuel] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [sonuc, setSonuc] = useState<SmsGonderActionSonuc | null>(null)
  const [isPending, startTransition] = useTransition()

  const mudurlukler = useMemo(() => benzersiz(personeller.map(p => p.mudurluk)), [personeller])
  const statuler = useMemo(() => benzersiz(personeller.map(p => p.statu)), [personeller])

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    return personeller.filter(p => {
      if (mudurluk && p.mudurluk !== mudurluk) return false
      if (statu && p.statu !== statu) return false
      if (q && !p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) && !p.sicil_no.includes(q)) return false
      return true
    })
  }, [personeller, arama, mudurluk, statu])

  const filtreliSecilebilir = useMemo(() => filtreli.filter(p => p.telefon_gecerli), [filtreli])
  const tumuSecili = filtreliSecilebilir.length > 0 && filtreliSecilebilir.every(p => secili.has(p.sicil_no))

  function toggle(sicil: string) {
    setSecili(prev => {
      const n = new Set(prev)
      if (n.has(sicil)) n.delete(sicil)
      else n.add(sicil)
      return n
    })
  }

  function tumunuToggle() {
    setSecili(prev => {
      const n = new Set(prev)
      if (tumuSecili) filtreliSecilebilir.forEach(p => n.delete(p.sicil_no))
      else filtreliSecilebilir.forEach(p => n.add(p.sicil_no))
      return n
    })
  }

  const manuelAdet = manuel.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean).length
  const toplamAlici = secili.size + manuelAdet

  function gonder() {
    setSonuc(null)
    if (!mesaj.trim()) {
      setSonuc({ hata: 'Mesaj boş olamaz.' })
      return
    }
    if (toplamAlici === 0) {
      setSonuc({ hata: 'En az bir alıcı seçin veya numara girin.' })
      return
    }
    startTransition(async () => {
      const res = await onGonder({
        mesaj: mesaj.trim(),
        sicilNolar: [...secili],
        manuelNumaralar: manuel,
      })
      setSonuc(res)
      if (res.ok) {
        setSecili(new Set())
        setManuel('')
        setMesaj('')
        router.refresh()
      }
    })
  }

  const uzunluk = mesaj.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alıcı seçimi */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
            <input
              value={arama}
              onChange={e => setArama(e.target.value)}
              placeholder="Ad veya sicil ara…"
              className="flex-1 min-w-[160px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <select
              value={mudurluk}
              onChange={e => setMudurluk(e.target.value)}
              className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white max-w-[180px]"
            >
              <option value="">Tüm müdürlükler</option>
              {mudurlukler.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={statu}
              onChange={e => setStatu(e.target.value)}
              className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white max-w-[160px]"
            >
              <option value="">Tüm statüler</option>
              {statuler.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tumuSecili} onChange={tumunuToggle} disabled={!filtreliSecilebilir.length} />
              Görünen geçerli numaraları seç ({filtreliSecilebilir.length})
            </label>
            <span>{filtreli.length} kayıt · {secili.size} seçili</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {filtreli.map(p => (
                  <tr key={p.sicil_no} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="pl-4 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={secili.has(p.sicil_no)}
                        disabled={!p.telefon_gecerli}
                        onChange={() => toggle(p.sicil_no)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="font-medium text-slate-800">{p.ad_soyad}</div>
                      <div className="text-xs text-slate-400">
                        {p.sicil_no}
                        {p.mudurluk ? ` · ${p.mudurluk}` : ''}
                        {p.statu ? ` · ${p.statu}` : ''}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap">
                      {p.telefon_gecerli ? (
                        <span className="text-slate-600">{p.telefon}</span>
                      ) : (
                        <span className="text-xs text-red-500">telefon yok/geçersiz</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!filtreli.length && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-sm">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mesaj + manuel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 self-start">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ek numaralar (manuel)</label>
            <textarea
              value={manuel}
              onChange={e => setManuel(e.target.value)}
              rows={3}
              placeholder="Virgül, boşluk veya satırla ayırın"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
            />
            {manuelAdet > 0 && <p className="text-xs text-slate-400 mt-1">{manuelAdet} numara girildi</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mesaj</label>
            <textarea
              value={mesaj}
              onChange={e => setMesaj(e.target.value)}
              rows={6}
              maxLength={900}
              placeholder="Gönderilecek mesaj metni…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              {uzunluk} karakter · {smsAdedi(uzunluk)} SMS
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm text-slate-600">
            Toplam alıcı: <strong>{toplamAlici}</strong>
          </div>

          <button
            type="button"
            onClick={gonder}
            disabled={isPending || !gonderimAcik || toplamAlici === 0}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? 'Gönderiliyor…' : 'SMS Gönder'}
          </button>

          {sonuc?.ok && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {sonuc.gonderilen} alıcıya gönderildi{sonuc.mesajId ? ` (ID: ${sonuc.mesajId})` : ''}.
            </div>
          )}
          {sonuc?.hata && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{sonuc.hata}</div>
          )}
          {sonuc?.gecersiz && sonuc.gecersiz.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Atlanan ({sonuc.gecersiz.length}): {sonuc.gecersiz.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Gönderim geçmişi */}
      {adminMi && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Son Gönderimler</h2>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Tarih</th>
                  <th className="text-left font-medium px-2 py-2">Alıcı</th>
                  <th className="text-left font-medium px-2 py-2">Numara</th>
                  <th className="text-left font-medium px-2 py-2">Mesaj</th>
                  <th className="text-left font-medium px-2 py-2">Durum</th>
                  <th className="text-left font-medium px-4 py-2">Gönderen</th>
                </tr>
              </thead>
              <tbody>
                {loglar.map(l => (
                  <tr key={l.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500 text-xs">{tarihFmt(l.created_at)}</td>
                    <td className="px-2 py-2 text-slate-700">{l.alici_ad ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{l.telefon}</td>
                    <td className="px-2 py-2 text-slate-500 max-w-[260px] truncate" title={l.mesaj}>
                      {l.mesaj}
                    </td>
                    <td className="px-2 py-2">
                      {l.durum === 'gonderildi' ? (
                        <span className="text-xs text-green-700 bg-green-50 rounded px-1.5 py-0.5">Gönderildi</span>
                      ) : (
                        <span className="text-xs text-red-600 bg-red-50 rounded px-1.5 py-0.5" title={l.hata_mesaji ?? ''}>
                          Başarısız
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{l.actor_email ?? '—'}</td>
                  </tr>
                ))}
                {!loglar.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                      Henüz gönderim kaydı yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
