'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type RefObject, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  butceMatrisKaydet,
  type ButceIslemTur,
} from '@/app/(dashboard)/yerel-bilgi/islemler/lib/yerel-bilgi-butce-islem-actions'
import YerelBilgiMudurlukSecici from '@/components/yerel-bilgi/YerelBilgiMudurlukSecici'
import type { MudurlukSecenek } from '@/lib/yerel-bilgi-butce-mudurluk'

export type ButceKalemSatir = {
  id: number
  sira_no: number | null
  tanim_adi: string
}

function parseTutarSayi(raw: string): number {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return 0
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

function formatToplamTr(n: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  )
}

type Props = {
  tur: ButceIslemTur
  tabloBasligi: string
  aciklama: string
  tutarSutunEtiketi: string
  yilEtiketi: number
  geriHref: string
  geriLabel?: string
  kaydetSonrasiHref?: string
  kayitYapilabilir: boolean
  giderKalemleri: ButceKalemSatir[]
  gelirKalemleri: ButceKalemSatir[]
  baslangicGider: Record<number, string>
  baslangicGelir: Record<number, string>
  isAdmin?: boolean
  mudurlukler?: MudurlukSecenek[]
  seciliMudurlukId?: number | null
  mudurlukAdi?: string | null
  girisBasePath?: string
}

export default function YerelBilgiButceMatrisClient({
  tur,
  tabloBasligi,
  aciklama,
  tutarSutunEtiketi,
  yilEtiketi,
  geriHref,
  geriLabel = '← Yerel Bilgi — İşlemler',
  kaydetSonrasiHref,
  kayitYapilabilir,
  giderKalemleri,
  gelirKalemleri,
  baslangicGider,
  baslangicGelir,
  isAdmin = false,
  mudurlukler = [],
  seciliMudurlukId = null,
  mudurlukAdi = null,
  girisBasePath = '',
}: Props) {
  const router = useRouter()
  const ilkGiderInputRef = useRef<HTMLInputElement>(null)
  const ilkGelirInputRef = useRef<HTMLInputElement>(null)

  const [gider, setGider] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    for (const k of giderKalemleri) o[String(k.id)] = baslangicGider[k.id] ?? ''
    return o
  })
  const [gelir, setGelir] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    for (const k of gelirKalemleri) o[String(k.id)] = baslangicGelir[k.id] ?? ''
    return o
  })
  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [sunucuHata, setSunucuHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const g: Record<string, string> = {}
    for (const k of giderKalemleri) g[String(k.id)] = baslangicGider[k.id] ?? ''
    const l: Record<string, string> = {}
    for (const k of gelirKalemleri) l[String(k.id)] = baslangicGelir[k.id] ?? ''
    setGider(g)
    setGelir(l)
  }, [giderKalemleri, gelirKalemleri, baslangicGider, baslangicGelir])

  const toplamGider = useMemo(
    () => giderKalemleri.reduce((s, k) => s + parseTutarSayi(gider[String(k.id)] ?? ''), 0),
    [gider, giderKalemleri],
  )
  const toplamGelir = useMemo(
    () => gelirKalemleri.reduce((s, k) => s + parseTutarSayi(gelir[String(k.id)] ?? ''), 0),
    [gelir, gelirKalemleri],
  )

  const engel = !kayitYapilabilir
  const adminMudurlukSecilmedi = isAdmin && seciliMudurlukId == null
  const inputKilitli = engel || !duzenlemeAcik

  function duzenlemeyiAc() {
    if (engel) return
    setDuzenlemeAcik(true)
  }

  function kaydet() {
    if (engel || !duzenlemeAcik) return
    setSunucuHata(null)
    startTransition(async () => {
      const res = await butceMatrisKaydet(
        tur,
        gider,
        gelir,
        isAdmin && seciliMudurlukId != null ? seciliMudurlukId : undefined,
      )
      if (res.hata) {
        setSunucuHata(res.hata)
        return
      }
      setDuzenlemeAcik(false)
      if (kaydetSonrasiHref) {
        router.push(kaydetSonrasiHref)
        return
      }
      router.refresh()
    })
  }

  function siraEtiket(i: number, sira: number | null) {
    const n = typeof sira === 'number' && Number.isFinite(sira) ? sira : i + 1
    return String(n).padStart(2, '0')
  }

  function kolonBaslik(ana: string, onTutarBaslikTikla: () => void) {
    return (
      <div className="rounded-t-lg overflow-hidden border border-slate-300 border-b-0">
        <div className="bg-slate-600 text-white text-center text-sm font-semibold py-2.5 px-2">{ana}</div>
        <div className="grid grid-cols-[2.5rem_1fr_7.5rem] gap-0 bg-slate-500 text-white text-xs font-medium">
          <div className="py-2 text-center border-r border-slate-400/50">No</div>
          <div className="py-2 px-2 border-r border-slate-400/50">Tanım</div>
          <button
            type="button"
            onClick={() => {
              duzenlemeyiAc()
              requestAnimationFrame(() => onTutarBaslikTikla())
            }}
            className="py-2 text-center pr-1 w-full hover:bg-slate-400/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm transition-colors cursor-pointer"
            title="Değiştir modunu aç ve bu sütuna git"
          >
            {tutarSutunEtiketi} ({yilEtiketi})
          </button>
        </div>
      </div>
    )
  }

  function satir(
    k: ButceKalemSatir,
    i: number,
    deger: string,
    set: (id: string, v: string) => void,
    zebra: boolean,
    ilkInputRef: RefObject<HTMLInputElement | null> | null,
  ) {
    return (
      <div
        key={k.id}
        className={`grid grid-cols-[2.5rem_1fr_7.5rem] gap-0 text-sm border-x border-b border-slate-200 ${
          zebra ? 'bg-teal-50/50' : 'bg-white'
        }`}
      >
        <div className="py-2 text-center tabular-nums text-slate-700 border-r border-slate-200/80">
          {siraEtiket(i, k.sira_no)}
        </div>
        <div className="py-2 px-2 text-slate-800 border-r border-slate-200/80 leading-snug">{k.tanim_adi}</div>
        <div className="py-1.5 pr-1 pl-1 flex items-center justify-end">
          <input
            ref={ilkInputRef ?? undefined}
            type="text"
            inputMode="decimal"
            disabled={inputKilitli}
            value={deger}
            onChange={e => set(String(k.id), e.target.value)}
            className="w-full max-w-[7rem] h-8 border border-slate-300 rounded px-1.5 text-right text-sm tabular-nums bg-white disabled:bg-slate-100 disabled:text-slate-600"
            placeholder="0"
            aria-label={`${k.tanim_adi} tutar`}
          />
        </div>
      </div>
    )
  }

  const geriBtn =
    'inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors'

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link href={geriHref} className={geriBtn}>
          {geriLabel}
        </Link>
      </div>

      {isAdmin && mudurlukler.length > 0 && girisBasePath && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <YerelBilgiMudurlukSecici
            mudurlukler={mudurlukler}
            seciliMudurlukId={seciliMudurlukId}
            basePath={girisBasePath}
          />
          {adminMudurlukSecilmedi && (
            <p className="text-xs text-amber-700 mt-2">Görüntülemek ve kaydetmek için müdürlük seçin.</p>
          )}
          {mudurlukAdi && (
            <p className="text-xs text-slate-500 mt-2">Seçili müdürlük: {mudurlukAdi}</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={duzenlemeyiAc}
              disabled={engel}
              className="text-left w-full group disabled:opacity-60 disabled:cursor-not-allowed"
              title="Değiştir modunu aç"
            >
              <span className="text-2xl font-bold text-slate-800 group-hover:text-teal-800 group-hover:underline decoration-teal-600/40 underline-offset-2 transition-colors">
                {tabloBasligi}
              </span>
            </button>
            <p className="text-sm text-slate-500 mt-1.5">{aciklama}</p>
          </div>
          <div className="shrink-0 flex justify-end sm:pt-0.5 self-start">
            <button
              type="button"
              onClick={duzenlemeyiAc}
              disabled={engel || duzenlemeAcik}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              Değiştir
            </button>
          </div>
        </div>

        {engel && !isAdmin && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
            Profilinizde sicil veya kadroda görev müdürlüğü bulunamadı; kayıt yapılamaz. IK ile iletişime geçin.
          </div>
        )}

        {duzenlemeAcik && !engel && (
          <p className="mx-4 mt-3 text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            Değiştir modu açık. Tutarları girip alttan <strong>Kaydet</strong> ile kaydedin.
          </p>
        )}

        {sunucuHata && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunucuHata}</div>
        )}

        <div className="p-4 pb-0 flex-1 min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <div className="min-w-0">
              {kolonBaslik('Bütçe Gider Türü', () => ilkGiderInputRef.current?.focus())}
              <div className="rounded-b-lg overflow-hidden border border-t-0 border-slate-300">
                {giderKalemleri.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm border-x border-b border-slate-200">Tanım yok.</div>
                ) : (
                  giderKalemleri.map((k, i) =>
                    satir(
                      k,
                      i,
                      gider[String(k.id)] ?? '',
                      (id, v) => setGider(p => ({ ...p, [id]: v })),
                      i % 2 === 1,
                      i === 0 ? ilkGiderInputRef : null,
                    ),
                  )
                )}
                {giderKalemleri.length > 0 && (
                  <div className="grid grid-cols-[2.5rem_1fr_7.5rem] gap-0 text-sm font-semibold bg-slate-100 border-x border-b border-slate-300">
                    <div className="py-2.5 col-span-2 text-right pr-3 text-slate-800 border-r border-slate-200">Toplam</div>
                    <div className="py-2.5 text-right pr-2 tabular-nums text-slate-900">{formatToplamTr(toplamGider)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              {kolonBaslik('Bütçe Gelir Türü', () => ilkGelirInputRef.current?.focus())}
              <div className="rounded-b-lg overflow-hidden border border-t-0 border-slate-300">
                {gelirKalemleri.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm border-x border-b border-slate-200">Tanım yok.</div>
                ) : (
                  gelirKalemleri.map((k, i) =>
                    satir(
                      k,
                      i,
                      gelir[String(k.id)] ?? '',
                      (id, v) => setGelir(p => ({ ...p, [id]: v })),
                      i % 2 === 1,
                      i === 0 ? ilkGelirInputRef : null,
                    ),
                  )
                )}
                {gelirKalemleri.length > 0 && (
                  <div className="grid grid-cols-[2.5rem_1fr_7.5rem] gap-0 text-sm font-semibold bg-slate-100 border-x border-b border-slate-300">
                    <div className="py-2.5 col-span-2 text-right pr-3 text-slate-800 border-r border-slate-200">Toplam</div>
                    <div className="py-2.5 text-right pr-2 tabular-nums text-slate-900">{formatToplamTr(toplamGelir)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-4 pb-4 pt-3 mt-auto border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={kaydet}
            disabled={engel || !duzenlemeAcik || isPending}
            className="inline-flex items-center rounded-lg bg-slate-800 text-white px-6 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
