'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import PerformansEk5OnizleModal from '@/components/performans/PerformansEk5OnizleModal'
import {
  performansDegerlendirmeSifirla,
  performansDegerlendirmeAuditLoglari,
  performansEk5OnizleVeri,
  type PerformansEk5OnizleVeri,
} from '@/app/(dashboard)/performans/actions'
import { donemIlerlemeOzet, degerlendirmeTamamlandi, type MudurlukSatir } from '@/lib/performans-istatistik'
import { performansPuanBandi } from '@/lib/performans'
import { performansSatirDurumMetni, type PerformansIzleyiciRol } from '@/lib/performans-durum-metni'
import type { PerformansAmirErisim } from '@/lib/performans-amir-erisim'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import {
  performansDegAuditDiffSatirlari,
  performansDegAuditDegerGoster,
} from '@/lib/performans-degerlendirme-audit'
import type { Tables } from '@/types/database'

export type PersonelSatir = {
  siraNo: number
  id: number
  sicil_no: string
  ad_soyad: string
  kadro_unvani: string | null
  puan_amir1: number | null
  puan_amir2: number | null
  tek_amir: boolean
  durum: string
  iade_notu: string | null
  amir1_sicil: string | null
  amir2_sicil: string | null
}

export type DonemBilgi = {
  id: number
  sira_no: string | null
  donem_adi: string | null
  yil: number
  durum: string
  baslangic_tarihi: string
  bitis_tarihi: string
}

function IlerlemeKart({
  baslik,
  yuzde,
  alt,
}: {
  baslik: string
  yuzde: number
  alt: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-600">{baslik}</p>
      <p className="text-3xl font-bold text-slate-800 tabular-nums mt-1">%{yuzde}</p>
      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all"
          style={{ width: `${Math.min(100, yuzde)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">{alt}</p>
    </div>
  )
}

function tarih(t: string) {
  return new Date(t).toLocaleDateString('tr-TR')
}

function GozIkon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function GeriLink({
  href,
  label,
  onClick,
}: {
  href?: string
  label: string
  onClick?: () => void
}) {
  const cls =
    'px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0'
  const icon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
    </svg>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {icon}
        {label}
      </button>
    )
  }
  return (
    <Link href={href ?? '#'} className={cls}>
      {icon}
      {label}
    </Link>
  )
}

function YildizDegerlendirmeButon({
  href,
  title,
  onClick,
}: {
  href?: string
  title: string
  onClick?: () => void
}) {
  const cls =
    'inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-300 text-amber-600 hover:bg-amber-50 text-sm'
  const inner = <span aria-hidden>★</span>
  if (href) {
    return (
      <Link href={href} title={title} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" title={title} onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

function GeriAlIkon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a4 4 0 014 4v0a4 4 0 01-4 4H5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 6l-4 4 4 4" />
    </svg>
  )
}

export default function PerformansDonemDashboardClient({
  donem,
  ilerleme,
  mudurlukler,
  personeller,
  seciliMudurluk,
  isAdmin,
  amirErisim = null,
}: {
  donem: DonemBilgi
  ilerleme: ReturnType<typeof donemIlerlemeOzet>
  mudurlukler: MudurlukSatir[]
  personeller: PersonelSatir[]
  seciliMudurluk: string | null
  isAdmin: boolean
  amirErisim?: PerformansAmirErisim | null
}) {
  const router = useRouter()
  const personelGorunumu = Boolean(seciliMudurluk)
  const [sifirlaHedef, setSifirlaHedef] = useState<PersonelSatir | null>(null)
  const [sifirlaHata, setSifirlaHata] = useState<string | null>(null)
  const [sifirlaPending, startSifirla] = useTransition()
  const [onizleAcik, setOnizleAcik] = useState(false)
  const [onizleVeri, setOnizleVeri] = useState<PerformansEk5OnizleVeri | null>(null)
  const [onizleHata, setOnizleHata] = useState<string | null>(null)
  const [onizlePending, startOnizle] = useTransition()
  const [amir2UyariAcik, setAmir2UyariAcik] = useState(false)
  const [auditAcik, setAuditAcik] = useState(false)
  const [auditLoglar, setAuditLoglar] = useState<Tables<'personel_audit_log'>[]>([])
  const [auditHedef, setAuditHedef] = useState<PersonelSatir | null>(null)
  const [auditPending, startAudit] = useTransition()

  function amir2Degerlendirebilir(p: PersonelSatir): boolean {
    return p.durum === 'amir1_gonderildi'
  }

  function personelSatirSinifi(p: PersonelSatir): string {
    const taban = 'border-t border-slate-100'
    if (degerlendirmeTamamlandi(p)) {
      return `${taban} bg-emerald-50/60`
    }
    // Yalnızca 2. amirden 1. amire iade edilmiş; yeniden gönderilince (amir1_gonderildi) varsayılan renk
    if (p.durum === 'iade') {
      return `${taban} bg-amber-50/70`
    }
    return taban
  }

  const sifirlaYapilabilir = isAdmin && donem.durum !== 'Yayınlandı'
  const degerlendirmeGoster = isAdmin || amirErisim != null
  const currentSicil = amirErisim?.sicilNo?.trim() || null

  /** Admin: her iki rol (vekalet). Amir: yalnızca kendi rolü (1 veya 2). */
  function amir1Gorebilir(p: PersonelSatir): boolean {
    if (isAdmin) return true
    if (!currentSicil) return false
    return String(p.amir1_sicil ?? '').trim() === currentSicil
  }

  function amir2Gorebilir(p: PersonelSatir): boolean {
    if (isAdmin) return true
    if (!currentSicil || p.tek_amir) return false
    return String(p.amir2_sicil ?? '').trim() === currentSicil
  }

  function izleyiciRol(p: PersonelSatir): PerformansIzleyiciRol {
    if (isAdmin) return 'diger'
    if (currentSicil && String(p.amir2_sicil ?? '').trim() === currentSicil && !p.tek_amir) {
      return 'amir2'
    }
    if (currentSicil && String(p.amir1_sicil ?? '').trim() === currentSicil) {
      return 'amir1'
    }
    return 'diger'
  }

  function auditAc(degerlendirmeId: number, hedef: PersonelSatir) {
    setAuditHedef(hedef)
    setAuditAcik(true)
    setAuditLoglar([])
    startAudit(async () => {
      const res = await performansDegerlendirmeAuditLoglari(degerlendirmeId)
      if (!res.hata) setAuditLoglar(res.loglar ?? [])
    })
  }

  function kayitQuery(rol: 'amir1' | 'amir2', vekalet: boolean): string {
    const q = new URLSearchParams({ rol, donem: String(donem.id) })
    if (seciliMudurluk) q.set('mudurluk', seciliMudurluk)
    if (vekalet) q.set('vekalet', '1')
    return q.toString()
  }

  function sifirlaOnayla() {
    if (!sifirlaHedef) return
    setSifirlaHata(null)
    startSifirla(async () => {
      const res = await performansDegerlendirmeSifirla(sifirlaHedef.id)
      if (res.hata) {
        setSifirlaHata(res.hata)
        return
      }
      setSifirlaHedef(null)
      router.refresh()
    })
  }

  function onizleAc(degerlendirmeId: number) {
    setOnizleAcik(true)
    setOnizleVeri(null)
    setOnizleHata(null)
    startOnizle(async () => {
      const res = await performansEk5OnizleVeri(degerlendirmeId)
      if (res.hata) {
        setOnizleHata(res.hata)
        return
      }
      setOnizleVeri(res.veri ?? null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {donem.donem_adi ?? `${donem.yil} Dönemi`}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {donem.sira_no ? `${donem.sira_no} · ` : ''}
            {tarih(donem.baslangic_tarihi)} – {tarih(donem.bitis_tarihi)} · {donem.durum}
          </p>
          {isAdmin && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2 max-w-3xl">
              Yönetici erişimi: tüm müdürlükler ve dönem kayıtları görünür; amir filtreleri uygulanmaz. 1./2. amir vekalet değerlendirmesi yapabilirsiniz.
            </p>
          )}
          {!isAdmin && amirErisim && (
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mt-2 max-w-3xl">
              {amirErisim.amir1Yetkisi && amirErisim.amir2Yetkisi
                ? '1. amir veya 2. amir olduğunuz personeli değerlendirebilirsiniz. Müdürlük listelerinde yalnızca kadro müdürlüğüne göre memur personel gösterilir.'
                : amirErisim.amir1Yetkisi
                  ? 'Yalnızca 1. amir olarak değerlendirebileceğiniz, kadro müdürlüğünüzdeki memur personel listelenir.'
                  : 'Yalnızca 2. amir olarak değerlendirebileceğiniz personel listelenir.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {personelGorunumu ? (
            <GeriLink
              label="Geri"
              onClick={() => router.push(`/performans/degerlendirme/${donem.id}`)}
            />
          ) : (
            <GeriLink href="/performans/degerlendirme" label="Geri" />
          )}
        </div>
      </div>

      {!personelGorunumu && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <IlerlemeKart
              baslik="1. Amir Değerlendirme Gerçekleşme"
              yuzde={ilerleme.amir1Yuzde}
              alt={`${ilerleme.amir1Tamam} / ${ilerleme.amir1Toplam} personel`}
            />
            <IlerlemeKart
              baslik="2. Amir Değerlendirme Gerçekleşme"
              yuzde={ilerleme.amir2Yuzde}
              alt={`${ilerleme.amir2Tamam} / ${ilerleme.amir2Toplam} personel (tek amir hariç)`}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold w-20">Sıra No</th>
                  <th className="px-4 py-3 font-semibold">Müdürlük Adı</th>
                  <th className="px-4 py-3 font-semibold text-center w-32">Personel Sayısı</th>
                  <th className="px-4 py-3 font-semibold text-center w-48">Değerlendirme Tamamlanma Oranı</th>
                </tr>
              </thead>
              <tbody>
                {mudurlukler.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Bu dönemde personel kaydı yok.
                    </td>
                  </tr>
                ) : (
                  mudurlukler.map(m => (
                    <tr
                      key={m.mudurlukAdi}
                      className="border-t border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(
                          `/performans/degerlendirme/${donem.id}?mudurluk=${encodeURIComponent(m.mudurlukAdi)}`,
                        )
                      }
                    >
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{m.siraNo}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.mudurlukAdi}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{m.personelSayisi}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums">%{m.tamamlanmaYuzde}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {personelGorunumu && seciliMudurluk && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">{seciliMudurluk}</h2>
            <GeriLink
              label="Geri"
              onClick={() => router.push(`/performans/degerlendirme/${donem.id}`)}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold w-16">Sıra No</th>
                  <th className="px-4 py-3 font-semibold w-24">Sicil No</th>
                  <th className="px-4 py-3 font-semibold">Adı Soyadı</th>
                  <th className="px-4 py-3 font-semibold">Kadro Unvanı</th>
                  <th className="px-4 py-3 font-semibold min-w-[12rem]">Durum</th>
                  <th className="px-4 py-3 font-semibold min-w-[10rem]">Açıklama</th>
                  <th className="px-4 py-3 font-semibold text-center w-28">1. Amir Puanı</th>
                  <th className="px-4 py-3 font-semibold text-center w-28">2. Amir Puanı</th>
                  {degerlendirmeGoster && (
                    <th className="px-4 py-3 font-semibold text-right w-40">İşlemler</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {personeller.length === 0 ? (
                  <tr>
                    <td colSpan={degerlendirmeGoster ? 9 : 8} className="px-4 py-10 text-center text-slate-400">
                      Bu müdürlükte personel kaydı yok.
                    </td>
                  </tr>
                ) : (
                  personeller.map(p => (
                    <tr key={p.id} className={personelSatirSinifi(p)}>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{p.siraNo}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">{p.sicil_no}</td>
                      <td className="px-4 py-3">{p.ad_soyad}</td>
                      <td className="px-4 py-3 text-slate-600">{p.kadro_unvani ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs leading-snug">
                        {performansSatirDurumMetni(p, izleyiciRol(p))}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs leading-snug">
                        {p.durum === 'iade' && p.iade_notu ? p.iade_notu : '—'}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {p.puan_amir1 != null ? (
                          <>
                            {p.puan_amir1}
                            <span className="text-xs text-slate-400 ml-1">({performansPuanBandi(p.puan_amir1)})</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {p.tek_amir ? (
                          <span className="text-xs text-slate-400">Tek amir</span>
                        ) : p.puan_amir2 != null ? (
                          <>
                            {p.puan_amir2}
                            <span className="text-xs text-slate-400 ml-1">({performansPuanBandi(p.puan_amir2)})</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      {degerlendirmeGoster && (
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            {!degerlendirmeTamamlandi(p) && amir1Gorebilir(p) && (
                              isAdmin ? (
                                <Link
                                  href={`/performans/degerlendirme/kayit/${p.id}?${kayitQuery('amir1', isAdmin)}`}
                                  title="1. amir değerlendirme"
                                  className="intrada-icon-btn intrada-icon-btn-detay h-7 w-7 text-xs font-semibold"
                                >
                                  1
                                </Link>
                              ) : (
                                <YildizDegerlendirmeButon
                                  href={`/performans/degerlendirme/kayit/${p.id}?${kayitQuery('amir1', false)}`}
                                  title="1. amir değerlendirme"
                                />
                              )
                            )}
                            {!degerlendirmeTamamlandi(p) && amir2Gorebilir(p) && (
                              isAdmin ? (
                                <button
                                  type="button"
                                  title="2. amir değerlendirme"
                                  onClick={() => {
                                    if (!amir2Degerlendirebilir(p)) {
                                      setAmir2UyariAcik(true)
                                      return
                                    }
                                    router.push(
                                      `/performans/degerlendirme/kayit/${p.id}?${kayitQuery('amir2', isAdmin)}`,
                                    )
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  2
                                </button>
                              ) : (
                                <YildizDegerlendirmeButon
                                  title="2. amir değerlendirme"
                                  onClick={() => {
                                    if (!amir2Degerlendirebilir(p)) {
                                      setAmir2UyariAcik(true)
                                      return
                                    }
                                    router.push(
                                      `/performans/degerlendirme/kayit/${p.id}?${kayitQuery('amir2', false)}`,
                                    )
                                  }}
                                />
                              )
                            )}
                            {(isAdmin || amir1Gorebilir(p) || amir2Gorebilir(p)) && (
                              <button
                                type="button"
                                onClick={() => onizleAc(p.id)}
                                title="Önizle"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                <GozIkon className="h-4 w-4" />
                              </button>
                            )}
                            {(isAdmin || amir1Gorebilir(p) || amir2Gorebilir(p)) && (
                              <SaatGecmisDugmesi
                                sayi={0}
                                title="Değerlendirme geçmişi"
                                onClick={() => auditAc(p.id, p)}
                              />
                            )}
                            {sifirlaYapilabilir && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSifirlaHata(null)
                                  setSifirlaHedef(p)
                                }}
                                title="Sıfırla"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <GeriAlIkon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={amir2UyariAcik}
        onClose={() => setAmir2UyariAcik(false)}
        title="Değerlendirme yapılamaz"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Henüz 1. Amir değerlendirme yapmadı.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAmir2UyariAcik(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={sifirlaHedef != null}
        onClose={() => {
          if (!sifirlaPending) {
            setSifirlaHedef(null)
            setSifirlaHata(null)
          }
        }}
        title="Değerlendirme Sıfırlama"
        size="sm"
      >
        {sifirlaHedef && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              {sifirlaHedef.sicil_no} sicil numaralı {sifirlaHedef.ad_soyad}&apos;in performans değerlendirmesini
              sıfırlayacaksınız. Onaylıyor musunuz?
            </p>
            {sifirlaHata && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sifirlaHata}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={sifirlaPending}
                onClick={() => {
                  setSifirlaHedef(null)
                  setSifirlaHata(null)
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Hayır
              </button>
              <button
                type="button"
                disabled={sifirlaPending}
                onClick={sifirlaOnayla}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {sifirlaPending ? 'Sıfırlanıyor…' : 'Evet'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PerformansEk5OnizleModal
        acik={onizleAcik}
        onKapat={() => {
          setOnizleAcik(false)
          setOnizleVeri(null)
          setOnizleHata(null)
        }}
        veri={onizleVeri}
        yukleniyor={onizlePending}
        hata={onizleHata}
      />

      <AuditGecmisPanel
        acik={auditAcik}
        onKapat={() => {
          setAuditAcik(false)
          setAuditHedef(null)
          setAuditLoglar([])
        }}
        auditLoglar={auditLoglar}
        baslik={
          auditHedef
            ? `Değerlendirme Geçmişi — ${auditHedef.ad_soyad} (${auditHedef.sicil_no})`
            : 'Değerlendirme Geçmişi'
        }
        aciklama={
          auditPending
            ? 'Geçmiş yükleniyor…'
            : 'Kaydet, gönder, onay ve iade adımları kronolojik olarak listelenir.'
        }
        diffSatirlari={performansDegAuditDiffSatirlari}
        degerGoster={performansDegAuditDegerGoster}
      />
    </div>
  )
}
