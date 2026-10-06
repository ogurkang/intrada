'use client'

import { Fragment, useEffect, useMemo, useState, useTransition, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { SmsLogOlaySatir } from '@/lib/sms-log-durum'
import Modal from '@/components/ui/Modal'
import {
  smsLogDurumSenkronizeAction,
  smsLogTopluIptalAction,
  smsPlanliLoglariSenkronizeAction,
} from '@/app/(dashboard)/iletisim-yonetimi/gecmis-gonderimler/actions'

export interface SmsLogSatir {
  id: number
  alici_ad: string | null
  alici_sicil: string | null
  telefon: string
  mesaj: string
  originator: string | null
  durum: string
  baglam: string | null
  planlanan_gonderim_at: string | null
  gonderim_kontrol_at: string | null
  saglayici_mesaj_id: string | null
  hata_mesaji: string | null
  actor_email: string | null
  created_at: string
}

function tarihFmt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

function baglamEtiket(baglam: string | null): string | null {
  if (!baglam) return null
  if (baglam === 'dogum_gunu') return 'Doğum günü'
  if (baglam === 'hosgeldin_bebek') return 'Hoş geldin bebek'
  if (baglam === 'performans_amir2_bildirim') return 'Performans 2. amir'
  if (baglam === 'tekil') return 'Tekil'
  return baglam
}

function olayTipEtiket(tip: string): string {
  const map: Record<string, string> = {
    planlandi: 'Planlandı',
    gonderildi: 'Gönderildi',
    basarisiz: 'Başarısız',
    beklemede: 'Beklemede',
    kontrol: 'Durum kontrolü',
    kontrol_hata: 'Kontrol hatası',
    iptal: 'İptal',
  }
  return map[tip] ?? tip
}

function olayTipRenk(tip: string): string {
  if (tip === 'gonderildi') return 'text-green-700 bg-green-50'
  if (tip === 'planlandi') return 'text-sky-700 bg-sky-50'
  if (tip === 'beklemede') return 'text-amber-700 bg-amber-50'
  if (tip === 'basarisiz' || tip === 'kontrol_hata') return 'text-red-600 bg-red-50'
  if (tip === 'iptal') return 'text-slate-500 bg-slate-100'
  return 'text-slate-600 bg-slate-50'
}

interface Props {
  loglar: SmsLogSatir[]
  olaylarByLogId: Record<number, SmsLogOlaySatir[]>
}

export default function GecmisGonderimlerClient({ loglar, olaylarByLogId }: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [durum, setDurum] = useState('')
  const [acikLogId, setAcikLogId] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const [senkronLogId, setSenkronLogId] = useState<number | null>(null)
  const [secili, setSecili] = useState<Set<number>>(new Set())
  const [iptalAday, setIptalAday] = useState<number[] | null>(null)
  const [iptalSonuc, setIptalSonuc] = useState<string | null>(null)
  const [planSenkron, setPlanSenkron] = useState(false)

  useEffect(() => {
    let iptal = false
    setPlanSenkron(true)
    smsPlanliLoglariSenkronizeAction().finally(() => {
      if (!iptal) setPlanSenkron(false)
    })
    return () => {
      iptal = true
    }
  }, [])

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    return loglar.filter(l => {
      if (durum && l.durum !== durum) return false
      if (q) {
        const hav = `${l.alici_ad ?? ''} ${l.telefon} ${l.mesaj} ${l.actor_email ?? ''}`.toLocaleLowerCase('tr-TR')
        if (!hav.includes(q)) return false
      }
      return true
    })
  }, [loglar, arama, durum])

  const basarisiz = loglar.filter(l => l.durum === 'basarisiz').length
  const planli = loglar.filter(l => l.durum === 'planlandi').length
  const gonderildi = loglar.filter(l => l.durum === 'gonderildi').length
  const iptal = loglar.filter(l => l.durum === 'iptal').length

  function satirTikla(id: number) {
    setAcikLogId(prev => (prev === id ? null : id))
  }

  function durumYenile(logId: number, e: MouseEvent) {
    e.stopPropagation()
    setSenkronLogId(logId)
    startTransition(async () => {
      await smsLogDurumSenkronizeAction(logId)
      setSenkronLogId(null)
    })
  }

  const planliFiltre = filtreli.filter(l => l.durum === 'planlandi')
  const seciliPlanli = planliFiltre.filter(l => secili.has(l.id))
  const tumPlanliSecili = planliFiltre.length > 0 && seciliPlanli.length === planliFiltre.length

  function secimDegistir(id: number, acik: boolean) {
    setSecili(prev => {
      const sonraki = new Set(prev)
      if (acik) sonraki.add(id)
      else sonraki.delete(id)
      return sonraki
    })
  }

  function tumPlanlilariSec(acik: boolean) {
    setSecili(prev => {
      const sonraki = new Set(prev)
      for (const l of planliFiltre) {
        if (acik) sonraki.add(l.id)
        else sonraki.delete(l.id)
      }
      return sonraki
    })
  }

  function iptalPenceresiAc(idler: number[], e?: MouseEvent) {
    e?.stopPropagation()
    const planliIdler = idler.filter(id => loglar.some(l => l.id === id && l.durum === 'planlandi'))
    if (!planliIdler.length) return
    setIptalSonuc(null)
    setIptalAday(planliIdler)
  }

  function iptaliOnayla() {
    if (!iptalAday?.length) return
    const idler = iptalAday
    startTransition(async () => {
      const sonuc = await smsLogTopluIptalAction(idler)
      if (!sonuc.iptal) {
        setIptalSonuc(sonuc.hata ?? 'İptal edilemedi.')
        return
      }
      setSecili(prev => {
        const sonraki = new Set(prev)
        for (const id of idler) sonraki.delete(id)
        return sonraki
      })
      setIptalAday(null)
      setIptalSonuc(
        sonuc.hatalar?.length
          ? `${sonuc.iptal} kayıt iptal edildi. İptal edilemeyen ${sonuc.hatalar.length} kayıt: ${sonuc.hatalar.join(' ')}`
          : null,
      )
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Ad, numara, mesaj ara…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <select
          value={durum}
          onChange={e => setDurum(e.target.value)}
          className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">Tüm durumlar</option>
          <option value="gonderildi">Gönderildi</option>
          <option value="planlandi">Planlandı</option>
          <option value="iptal">İptal</option>
          <option value="basarisiz">Başarısız</option>
        </select>
        <div className="text-xs text-slate-500">
          <span className="text-green-700">{gonderildi} gönderildi</span>
          {' · '}
          <span className="text-sky-700">{planli} planlandı</span>
          {' · '}
          <span className="text-slate-500">{iptal} iptal</span>
          {' · '}
          <span className="text-red-600">{basarisiz} başarısız</span>
        </div>
      </div>

      {seciliPlanli.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
          <p className="text-sm text-sky-900">{seciliPlanli.length} planlanmış SMS seçildi.</p>
          <button
            type="button"
            onClick={() => iptalPenceresiAc(seciliPlanli.map(l => l.id))}
            disabled={pending}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Seçilenleri iptal et
          </button>
        </div>
      ) : null}

      {iptalSonuc && !iptalAday ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{iptalSonuc}</p>
      ) : null}

      <p className="text-xs text-slate-500">
        Satıra tıklayarak gönderim geçmişini görüntüleyebilirsiniz. Planlanmış doğum günü mesajlarında
        iletim durumu sağlayıcıdan sorgulanır. Sağlayıcı durum kodu <strong>0</strong> (beklemede), planlanan
        tarih henüz gelmediyse normaldir — mesaj genelde o gün saat 09:00&apos;da gönderilir.
        {planSenkron ? (
          <span className="ml-1 text-indigo-600">Planlı gönderimler arka planda güncelleniyor…</span>
        ) : null}
      </p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="max-h-[640px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0 z-10">
              <tr>
                <th className="text-left font-medium px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={tumPlanliSecili}
                    disabled={!planliFiltre.length}
                    aria-label="Görünen planlanmış SMS’leri seç"
                    onChange={e => tumPlanlilariSec(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="text-left font-medium px-4 py-2 w-8" />
                <th className="text-left font-medium px-2 py-2">Tarih</th>
                <th className="text-left font-medium px-2 py-2">Alıcı</th>
                <th className="text-left font-medium px-2 py-2">Numara</th>
                <th className="text-left font-medium px-2 py-2">Mesaj</th>
                <th className="text-left font-medium px-2 py-2">Başlık</th>
                <th className="text-left font-medium px-2 py-2">Durum</th>
                <th className="text-left font-medium px-4 py-2">Gönderen</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map(l => {
                const acik = acikLogId === l.id
                const olaylar = olaylarByLogId[l.id] ?? []
                const baglam = baglamEtiket(l.baglam)
                return (
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => satirTikla(l.id)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${acik ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        {l.durum === 'planlandi' ? (
                          <input
                            type="checkbox"
                            checked={secili.has(l.id)}
                            aria-label={`${l.alici_ad ?? l.telefon} planını seç`}
                            onChange={e => secimDegistir(l.id, e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">{acik ? '▼' : '▶'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-slate-500 text-xs">
                        {tarihFmt(l.created_at)}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        <div>{l.alici_ad ?? '—'}</div>
                        {baglam ? (
                          <div className="text-[10px] text-slate-400 mt-0.5">{baglam}</div>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{l.telefon}</td>
                      <td className="px-2 py-2 text-slate-500 max-w-[240px] truncate" title={l.mesaj}>
                        {l.mesaj}
                      </td>
                      <td className="px-2 py-2 text-slate-500 text-xs whitespace-nowrap">{l.originator ?? '—'}</td>
                      <td className="px-2 py-2">
                        {l.durum === 'gonderildi' ? (
                          <span className="text-xs text-green-700 bg-green-50 rounded px-1.5 py-0.5">Gönderildi</span>
                        ) : l.durum === 'planlandi' ? (
                          <span className="text-xs text-sky-700 bg-sky-50 rounded px-1.5 py-0.5" title={l.planlanan_gonderim_at ? `Plan: ${tarihFmt(l.planlanan_gonderim_at)}` : undefined}>
                            Planlandı
                          </span>
                        ) : l.durum === 'iptal' ? (
                          <span className="text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">İptal</span>
                        ) : (
                          <span className="text-xs text-red-600 bg-red-50 rounded px-1.5 py-0.5" title={l.hata_mesaji ?? ''}>
                            Başarısız
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-400">{l.actor_email ?? '—'}</td>
                    </tr>
                    {acik ? (
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="space-y-3 max-w-3xl">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-sm font-semibold text-slate-700">Gönderim geçmişi</h3>
                              {l.durum === 'planlandi' && l.saglayici_mesaj_id ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={e => durumYenile(l.id, e)}
                                    disabled={pending && senkronLogId === l.id}
                                    className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                  >
                                    {pending && senkronLogId === l.id ? 'Sorgulanıyor…' : 'Durumu sorgula'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={e => iptalPenceresiAc([l.id], e)}
                                    disabled={pending}
                                    className="text-xs rounded-lg border border-red-200 bg-white px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Gönderimi iptal et
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            {l.planlanan_gonderim_at ? (
                              <p className="text-xs text-slate-600">
                                Planlanan gönderim: <strong>{tarihFmt(l.planlanan_gonderim_at)}</strong>
                                {l.gonderim_kontrol_at ? (
                                  <> · Son kontrol: {tarihFmt(l.gonderim_kontrol_at)}</>
                                ) : null}
                              </p>
                            ) : null}

                            {l.saglayici_mesaj_id ? (
                              <p className="text-xs text-slate-500 font-mono">
                                Sağlayıcı mesaj ID: {l.saglayici_mesaj_id}
                              </p>
                            ) : null}

                            {olaylar.length ? (
                              <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
                                {olaylar.map(o => (
                                  <li key={o.id} className="relative">
                                    <span className="absolute -left-[1.35rem] top-1.5 w-2 h-2 rounded-full bg-slate-300" />
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${olayTipRenk(o.olay_tipi)}`}>
                                        {olayTipEtiket(o.olay_tipi)}
                                      </span>
                                      <span className="text-[11px] text-slate-400">{tarihFmt(o.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-0.5">{o.aciklama}</p>
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-xs text-slate-400">Henüz olay kaydı yok.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
              {!filtreli.length && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-sm">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={iptalAday != null}
        onClose={() => {
          if (pending) return
          setIptalAday(null)
          setIptalSonuc(null)
        }}
        title="Planlanmış gönderimi iptal et"
        size="sm"
      >
        <p className="text-sm text-slate-700">
          <strong>{iptalAday?.length ?? 0}</strong> planlanmış SMS Intrada kaydında iptal edilecek.
          Mesaj henüz gitmediyse bu listedeki plan kalkar.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Sağlayıcı kuyruğundaki mesaj bu işlemle otomatik silinmeyebilir. Gerekirse Mesajpaketi panelinden de kontrol edin.
        </p>
        {iptalSonuc ? <p className="mt-3 text-sm text-red-700">{iptalSonuc}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setIptalAday(null)
              setIptalSonuc(null)
            }}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={iptaliOnayla}
            disabled={pending || !iptalAday?.length}
            className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {pending ? 'İptal ediliyor…' : 'İptal et'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
