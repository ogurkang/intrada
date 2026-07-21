'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import { organizasyonAuditDegerGoster, organizasyonAuditDiffSatirlari } from '@/lib/organizasyon-audit'
import type { PersonelAday } from '@/lib/organizasyon-birim'
import type { OrganizasyonBirim } from '@/app/(dashboard)/tanimlar/organizasyon/[id]/page'
import type { Tables } from '@/types/database'

interface Secenek {
  id: number
  label: string
}

interface Props {
  organizasyonId: number
  organizasyonAdi: string
  aktif: boolean
  birimler: OrganizasyonBirim[]
  mudurlukSecenekleri: Secenek[]
  baskanEklenmis: boolean
  baskanYardimcisiAdaylari: PersonelAday[]
  eklenmisBaskanYrdSicil: string[]
  auditLoglar?: Tables<'personel_audit_log'>[]
  onBirimEkle: (organizasyonId: number, formData: FormData) => Promise<{ hata?: string }>
  onBirimSil: (birimId: number, organizasyonId: number) => Promise<{ hata?: string }>
}

type AgacDugum = OrganizasyonBirim & { cocuklar: AgacDugum[] }

function agacKur(birimler: OrganizasyonBirim[]): AgacDugum[] {
  const map = new Map<number, AgacDugum>()
  birimler.forEach(b => map.set(b.id, { ...b, cocuklar: [] }))
  const kokler: AgacDugum[] = []
  map.forEach(dugum => {
    if (dugum.ust_birim_id != null && map.has(dugum.ust_birim_id)) {
      map.get(dugum.ust_birim_id)!.cocuklar.push(dugum)
    } else {
      kokler.push(dugum)
    }
  })
  const turSira: Record<string, number> = { baskan: 0, baskan_yardimcisi: 1, mudurluk: 2 }
  const sirala = (liste: AgacDugum[]) => {
    liste.sort((a, b) => {
      const t = (turSira[a.birim_turu] ?? 9) - (turSira[b.birim_turu] ?? 9)
      if (t !== 0) return t
      return a.ad.localeCompare(b.ad, 'tr')
    })
    liste.forEach(d => sirala(d.cocuklar))
  }
  sirala(kokler)
  return kokler
}

export default function OrganizasyonDetayClient({
  organizasyonId,
  organizasyonAdi,
  aktif,
  birimler,
  mudurlukSecenekleri,
  baskanEklenmis,
  baskanYardimcisiAdaylari,
  eklenmisBaskanYrdSicil,
  auditLoglar = [],
  onBirimEkle,
  onBirimSil,
}: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [modalAcik, setModalAcik] = useState(false)
  const [seciliBirimler, setSeciliBirimler] = useState<Set<string>>(new Set())
  const [seciliUst, setSeciliUst] = useState('')
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [gecmisAcik, setGecmisAcik] = useState(false)
  const [isPending, startTransition] = useTransition()

  const agac = useMemo(() => agacKur(birimler), [birimler])

  // Zaten eklenmiş müdürlükler tekrar seçilemesin.
  const eklenmisMudurlukIds = useMemo(
    () => new Set(birimler.filter(b => b.mudurluk_id != null).map(b => b.mudurluk_id)),
    [birimler],
  )
  const eklenebilirMudurlukler = useMemo(
    () => mudurlukSecenekleri.filter(m => !eklenmisMudurlukIds.has(m.id)),
    [mudurlukSecenekleri, eklenmisMudurlukIds],
  )

  // Henüz eklenmemiş başkan yardımcısı adayları.
  const eklenebilirYardimcilar = useMemo(() => {
    const eklenmis = new Set(eklenmisBaskanYrdSicil)
    return baskanYardimcisiAdaylari.filter(a => !eklenmis.has(a.sicil_no))
  }, [baskanYardimcisiAdaylari, eklenmisBaskanYrdSicil])

  const eklenebilirVar =
    !baskanEklenmis || eklenebilirYardimcilar.length > 0 || eklenebilirMudurlukler.length > 0

  // Seçimde en az bir müdürlük (değer 'm:<id>') var mı? Varsa üst birim makam olmak zorunda.
  const mudurlukSecili = useMemo(
    () => [...seciliBirimler].some(v => v.startsWith('m:')),
    [seciliBirimler],
  )

  // Üst birim adayları: yalnızca makam birimleri (Başkan / Başkan Yardımcısı). Müdürlük üst birim olamaz.
  const makamBirimler = useMemo(
    () => birimler.filter(b => b.birim_turu === 'baskan' || b.birim_turu === 'baskan_yardimcisi'),
    [birimler],
  )

  function ustBirimEtiket(b: OrganizasyonBirim): string {
    return b.personel_adi ? `${b.ad} - ${b.personel_adi}` : b.ad
  }

  function birimToggle(value: string, secili: boolean) {
    setSeciliBirimler(prev => {
      const next = new Set(prev)
      if (secili) next.add(value)
      else next.delete(value)
      return next
    })
  }

  function ekleAc() {
    setSunuciHata(null)
    setSeciliBirimler(new Set())
    setSeciliUst('')
    setModalAcik(true)
  }

  function kapat() {
    setModalAcik(false)
    setSeciliBirimler(new Set())
    setSeciliUst('')
    setSunuciHata(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    if (seciliBirimler.size === 0) {
      setSunuciHata('En az bir birim seçin.')
      return
    }
    const fd = new FormData(e.currentTarget)
    for (const v of seciliBirimler) fd.append('birimler', v)
    startTransition(async () => {
      const res = await onBirimEkle(organizasyonId, fd)
      if (res?.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  function handleSil(birim: OrganizasyonBirim) {
    if (!confirm(`"${birim.ad}" birimini organizasyondan çıkarmak istediğinize emin misiniz? Alt birimleri de silinir.`)) return
    startTransition(async () => {
      const res = await onBirimSil(birim.id, organizasyonId)
      if (res?.hata) setSunuciHata(res.hata)
    })
  }

  function dugumRender(dugum: AgacDugum, seviye: number): React.ReactNode {
    const ozel = dugum.birim_turu !== 'mudurluk'
    return (
      <div key={dugum.id}>
        <div
          className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100"
          style={{ paddingLeft: `${seviye * 1.5 + 0.75}rem` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {seviye > 0 && <span className="text-slate-300">└</span>}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium truncate ${ozel ? 'text-sky-800' : 'text-slate-800'}`}>{dugum.ad}</span>
                {ozel && (
                  <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-medium">
                    Makam
                  </span>
                )}
              </div>
              {dugum.personel_adi ? (
                <div className="text-xs text-slate-500 mt-0.5 truncate">{dugum.personel_adi}</div>
              ) : (
                <div className="text-xs text-slate-300 mt-0.5 italic">İlişkili personel bulunamadı</div>
              )}
            </div>
          </div>
          {!saltOkunur && (
            <button
              onClick={() => handleSil(dugum)}
              disabled={isPending}
              title="Birimi çıkar"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
        {dugum.cocuklar.map(c => dugumRender(c, seviye + 1))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/tanimlar/organizasyon" className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Organizasyon Listesi
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{organizasyonAdi}</h1>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              aktif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
            {aktif ? 'Aktif' : 'Pasif'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SaatGecmisDugmesi sayi={auditLoglar.length} onClick={() => setGecmisAcik(true)} />
          {!saltOkunur && (
            <button
              type="button"
              onClick={ekleAc}
              className="intrada-btn intrada-btn-ekle"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ekle
            </button>
          )}
        </div>
      </div>

      {sunuciHata && !modalAcik && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
          Birimler
        </div>
        {birimler.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Henüz birim eklenmemiş. &ldquo;Ekle&rdquo; butonu ile başlayın.
          </div>
        ) : (
          <div>{agac.map(d => dugumRender(d, 0))}</div>
        )}
      </div>

      <Modal open={modalAcik} onClose={kapat} title="Birim Ekle" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Eklenecek Birim(ler)</label>
              {seciliBirimler.size > 0 && (
                <span className="text-xs text-slate-500">{seciliBirimler.size} seçili</span>
              )}
            </div>
            {!eklenebilirVar ? (
              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Eklenebilecek birim kalmadı.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {(!baskanEklenmis || eklenebilirYardimcilar.length > 0) && (
                  <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Makam
                  </div>
                )}
                {!baskanEklenmis && (
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={seciliBirimler.has('baskan')}
                      onChange={e => birimToggle('baskan', e.target.checked)}
                      className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                    />
                    Belediye Başkanı
                  </label>
                )}
                {eklenebilirYardimcilar.map(a => {
                  const v = `byrd:${a.sicil_no}`
                  return (
                    <label key={v} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={seciliBirimler.has(v)}
                        onChange={e => birimToggle(v, e.target.checked)}
                        className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                      />
                      Belediye Başkan Yardımcısı — {a.ad_soyad}
                    </label>
                  )
                })}
                {eklenebilirMudurlukler.length > 0 && (
                  <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Müdürlükler
                  </div>
                )}
                {eklenebilirMudurlukler.map(m => {
                  const v = `m:${m.id}`
                  return (
                    <label key={v} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={seciliBirimler.has(v)}
                        onChange={e => birimToggle(v, e.target.checked)}
                        className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                      />
                      {m.label}
                    </label>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Birden çok birim seçip aynı üst birime tek seferde bağlayabilirsiniz. Başkan yardımcıları, Kadro
              Hareketleri’ndeki &ldquo;Başkan Yardımcısı&rdquo; unvanlı personelden gelir.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bağlı Olduğu Birim</label>
            {mudurlukSecili && makamBirimler.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Müdürlük yalnızca Belediye Başkanı veya Başkan Yardımcısına bağlanabilir. Önce bir makam birimi ekleyin.
              </p>
            ) : (
              <select
                name="ust_birim_id"
                required={mudurlukSecili}
                value={seciliUst}
                onChange={e => setSeciliUst(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                {mudurlukSecili ? (
                  <option value="" disabled>Bağlı olduğu makam seçin…</option>
                ) : (
                  <option value="">En üst birim (bağlı değil)</option>
                )}
                {makamBirimler.map(b => (
                  <option key={b.id} value={b.id}>{ustBirimEtiket(b)}</option>
                ))}
              </select>
            )}
          </div>

          {sunuciHata && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending || saltOkunur || !eklenebilirVar}
              className="intrada-btn intrada-btn-kaydet"
            >
              {isPending ? 'Ekleniyor…' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisAcik}
        onKapat={() => setGecmisAcik(false)}
        auditLoglar={auditLoglar}
        baslik={`${organizasyonAdi} · Değişiklik Geçmişi`}
        diffSatirlari={organizasyonAuditDiffSatirlari}
        degerGoster={organizasyonAuditDegerGoster}
      />
    </div>
  )
}
