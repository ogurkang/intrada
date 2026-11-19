'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpPerformansBlok, PpPerformansRaporYil } from '@/lib/pp-mudurluk-rapor'
import { ppGostergeBaslik, ppMaliyetBaslik, ppRaporGosterge, ppRaporPara } from '@/lib/pp-mudurluk-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'

export type PpPerformansRaporGorunum = {
  baslik: string
  aciklama: string
  tabloBaslik: string
  yilYolu: string
  excelYolu: string
}

const MUDURLUK_GORUNUM: PpPerformansRaporGorunum = {
  baslik: 'Müdürlüklerin Performans Programı Tablosu',
  aciklama: 'Seçilen yıl ve müdürlüğün performans programı tablosu.',
  tabloBaslik: 'MÜDÜRLÜK PERFORMANS BİLGİSİ',
  yilYolu: `${PP_RAPORLAR_BASE}/mudurluklerin-performans-programi`,
  excelYolu: '/api/performans-programi/raporlar/mudurluk-performans/excel',
}

export const IDARE_GORUNUM: PpPerformansRaporGorunum = {
  baslik: 'İdare Performans Bilgisi Tablosu',
  aciklama: 'Alt program hedefi eklerken seçilen müdürlüğe özel tablo. Aynı hedef birden fazla müdürlükle bağlıysa her müdürlük için ayrı tablo oluşur.',
  tabloBaslik: 'İDARE PERFORMANS BİLGİSİ',
  yilYolu: `${PP_RAPORLAR_BASE}/idare-performans-bilgisi`,
  excelYolu: '/api/performans-programi/raporlar/idare-performans/excel',
}

export default function PpMudurlukPerformansClient({
  rapor,
  gorunum = MUDURLUK_GORUNUM,
}: {
  rapor: PpPerformansRaporYil
  gorunum?: PpPerformansRaporGorunum
}) {
  const router = useRouter()
  const [sekme, setSekme] = useState(0)
  const aktif = rapor.sekmeler[sekme] ?? rapor.sekmeler[0]
  const gBaslik = ppGostergeBaslik(rapor.yil)
  const mBaslik = ppMaliyetBaslik(rapor.yil)
  const excel = aktif
    ? `${gorunum.excelYolu}?yil=${rapor.yil}&m=${encodeURIComponent(aktif.mudurluk)}`
    : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{gorunum.baslik}</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Raporun bütçe yılını değiştirir. Kayıt girişi yapmaz.' },
              { baslik: 'Müdürlük sekmesi', metin: 'Hedef ekleme aşamasında ilişkilendirilen müdürlüğün tablolarını açar. Aynı hedef birden fazla müdürlükteyse her biri ayrı sekmedir.' },
              { baslik: 'Excel İndir', metin: 'Açık müdürlüğün tablosunu örnek formun düzeniyle indirir. Ekrandaki veriyi değiştirmez.' },
            ]} />
          </div>
          <p className="text-sm text-slate-600 mt-1">{gorunum.aciklama}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link
            href={PP_RAPORLAR_BASE}
            className="inline-flex items-center rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            ← Raporlar
          </Link>
          {aktif && (
            <a href={excel} className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600">
              Excel İndir ({aktif.mudurluk})
            </a>
          )}
          <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
          <select
            value={rapor.yil}
            onChange={e => router.push(`${gorunum.yilYolu}?y=${e.target.value}`)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            {rapor.yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {rapor.sekmeler.length === 0 ? (
        <p className="text-sm text-slate-500">Bu yıl için bağlı müdürlük yok.</p>
      ) : (
        <>
          <div className="border-b border-slate-200 overflow-x-auto">
            <nav className="flex gap-0 min-w-max" aria-label="Müdürlük sekmeleri">
              {rapor.sekmeler.map((s, i) => (
                <button
                  key={s.mudurluk}
                  type="button"
                  onClick={() => setSekme(i)}
                  className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    (aktif?.mudurluk === s.mudurluk)
                      ? 'border-teal-600 text-teal-800 bg-teal-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {s.mudurluk}
                </button>
              ))}
            </nav>
          </div>
          {aktif?.bloklar.map(blok => (
            <BlokTablo
              key={`${blok.programAdi}-${blok.altProgramAdi}`}
              blok={blok}
              yil={rapor.yil}
              gBaslik={gBaslik}
              mBaslik={mBaslik}
              tabloBaslik={gorunum.tabloBaslik}
            />
          ))}
        </>
      )}
    </div>
  )
}

const HUCRE = 'px-3 py-2.5 align-top text-slate-700'
const BASLIK = 'bg-slate-50/70 px-3 py-3 font-semibold text-slate-600'

function hucre(metin: string, className = '', anahtar?: string) {
  return <td key={anahtar} className={`${BASLIK} ${className}`}>{metin}</td>
}

function BlokTablo({
  blok,
  yil,
  gBaslik,
  mBaslik,
  tabloBaslik,
}: {
  blok: PpPerformansBlok
  yil: number
  gBaslik: string[]
  mBaslik: string[]
  tabloBaslik: string
}) {
  const toplam = mBaslik.map((_, i) => {
    const dolu = blok.faaliyetler.map(f => f.tutarlar[i]).filter((n): n is number => n != null)
    return dolu.length ? dolu.reduce((a, b) => a + b, 0) : null
  })
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="overflow-auto max-h-[min(70vh,720px)]">
      <table className="w-full min-w-[1100px] text-sm border-collapse">
        <tbody className="divide-y divide-slate-100/80">
          <tr>
            <td colSpan={9} className="bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700">{tabloBaslik}</td>
          </tr>
          <Bilgi etiket="BÜTÇE YILI:" deger={String(yil)} />
          <Bilgi etiket="PROGRAM ADI:" deger={blok.programAdi} />
          <Bilgi etiket="İDARE/BİRİM ADI:" deger={blok.veriKaynagi} />
          <Bilgi etiket="ALT PROGRAM ADI:" deger={blok.altProgramAdi} />
          <Bilgi etiket="GEREKÇE ve AÇIKLAMALAR" deger={blok.gerekce} />
          <Bilgi etiket="ALT PROGRAMIN HEDEFİ" deger={blok.hedef} />
          <Bilgi etiket="VERİNİN KAYNAĞI/ SORUMLU BİRİM" deger={blok.veriKaynagi} />
          <tr>
            <td colSpan={9} className="bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700">PERFORMANS GÖSTERGELERİ</td>
          </tr>
          <tr>
            <td colSpan={2} className={`${BASLIK} text-left`}>Performans Göstergesi</td>
            {hucre('Ölçü Birimi', 'text-center', 'olcu')}
            {gBaslik.map((b, i) => hucre(b, 'text-center', `g-${i}`))}
          </tr>
          {blok.gostergeler.length === 0 ? (
            <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">Gösterge yok. (Sonraki adımda performans faaliyeti göstergeleri buraya gelecek.)</td></tr>
          ) : blok.gostergeler.map(g => (
            <GostergeGrup key={`${g.kod}-${g.ad}`} g={g} />
          ))}
          <tr>
            <td colSpan={9} className="bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700">ALT PROGRAM KAPSAMINDA YÜRÜTÜLECEK FAALİYET MALİYETLERİ</td>
          </tr>
          <tr>
            <td colSpan={2} className={`${BASLIK} text-left`}>Faaliyetler</td>
            {mBaslik.slice(0, 4).map((b, i) => hucre(b, 'text-center', `m-${i}`))}
            <td colSpan={2} className={`${BASLIK} text-center`}>{mBaslik[4]}</td>
            {hucre(mBaslik[5], 'text-center', 'm-5')}
          </tr>
          {blok.faaliyetler.length === 0 ? (
            <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Faaliyet yok. (Sonraki adımda performans faaliyetleri buraya gelecek.)</td></tr>
          ) : blok.faaliyetler.map(f => (
            <Fragment key={`${f.kod}-${f.ad}`}>
              <MaliyetSatir ad={`${f.kod} ${f.ad}`.trim()} tutarlar={f.tutarlar} />
              <MaliyetSatir ad="Bütçe İçi" tutarlar={f.tutarlar} />
            </Fragment>
          ))}
          <MaliyetSatir ad="Toplam" tutarlar={toplam} kalin />
          <MaliyetSatir ad="Bütçe Dışı" tutarlar={[null, null, null, null, null, null]} />
          <tr>
            <td colSpan={9} className="bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700">Faaliyetlere İlişkin Açıklamalar</td>
          </tr>
          {blok.faaliyetler.map((f, i) => (
            <tr key={`${f.kod}-acik`} className="hover:bg-slate-50/80">
              <td colSpan={2} className={`${HUCRE} font-medium text-slate-800`}>{i + 1}- Faaliyet Adı:</td>
              <td colSpan={7} className={HUCRE}>{`PH ${f.kod} ${f.ad}`.trim()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <tr>
      <td colSpan={2} className={`${HUCRE} font-semibold text-slate-700 whitespace-nowrap`}>{etiket}</td>
      <td colSpan={7} className={`${HUCRE} whitespace-pre-wrap text-slate-800`}>{deger}</td>
    </tr>
  )
}

function GostergeGrup({ g }: { g: PpPerformansBlok['gostergeler'][number] }) {
  return (
    <>
      <tr className="hover:bg-slate-50/80">
        <td rowSpan={4} className={`${HUCRE} font-mono text-xs align-middle`}>{g.kod}</td>
        <td className={`${HUCRE} text-slate-800`}>{g.ad}</td>
        <td className={`${HUCRE} text-center`}>{g.birim}</td>
        {g.degerler.map((d, i) => <td key={i} className={`${HUCRE} text-right tabular-nums`}>{ppRaporGosterge(d)}</td>)}
      </tr>
      <tr className="hover:bg-slate-50/80">
        <td className={HUCRE}>Göstergeye İlişkin Açıklama:</td>
        <td colSpan={7} className={HUCRE}>{g.aciklama}</td>
      </tr>
      <tr className="hover:bg-slate-50/80">
        <td className={HUCRE}>Hesaplama Yöntemi:</td>
        <td colSpan={7} className={HUCRE}>{g.hesaplama}</td>
      </tr>
      <tr className="hover:bg-slate-50/80">
        <td className={HUCRE}>Sorumlu İdare:</td>
        <td colSpan={7} className={HUCRE}>{g.sorumlu}</td>
      </tr>
    </>
  )
}

function MaliyetSatir({ ad, tutarlar, kalin = false }: { ad: string; tutarlar: (number | null)[]; kalin?: boolean }) {
  const cls = `${HUCRE} text-right tabular-nums ${kalin ? 'font-semibold text-slate-800' : ''}`
  return (
    <tr className={kalin ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/80'}>
      <td colSpan={2} className={`${HUCRE} ${kalin ? 'font-semibold text-slate-800' : ''}`}>{ad}</td>
      {tutarlar.slice(0, 4).map((t, i) => <td key={i} className={cls}>{ppRaporPara(t)}</td>)}
      <td colSpan={2} className={cls}>{ppRaporPara(tutarlar[4])}</td>
      <td className={cls}>{ppRaporPara(tutarlar[5])}</td>
    </tr>
  )
}
