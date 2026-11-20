'use client'

import { Fragment } from 'react'
import type { PpPerformansBlok } from '@/lib/pp-mudurluk-rapor'
import { ppGostergeBaslik, ppMaliyetBaslik, ppRaporGosterge, ppRaporPara } from '@/lib/pp-mudurluk-rapor'

const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-3 font-bold text-slate-900'
const ETIKET = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 font-bold text-slate-900'
const DEGER = 'border border-slate-300 bg-[#F2F2F2] px-3 py-2.5 text-slate-800'
const SATIR = 'border border-slate-300 bg-[#F2F2F2] px-3 py-2.5 text-slate-800'
const TOPLAM = 'border border-slate-300 bg-[#C6EFCE] px-3 py-2.5 font-bold text-slate-900'

function hucre(metin: string, className = '', anahtar?: string) {
  return <td key={anahtar} className={`${BASLIK} ${className}`}>{metin}</td>
}

export default function PpPerformansBlokTablo({
  blok,
  yil,
  tabloBaslik = 'İDARE PERFORMANS BİLGİSİ',
}: {
  blok: PpPerformansBlok
  yil: number
  tabloBaslik?: string
}) {
  const gBaslik = ppGostergeBaslik(yil)
  const mBaslik = ppMaliyetBaslik(yil)
  const toplam = mBaslik.map((_, i) => {
    const dolu = blok.faaliyetler
      .filter(f => !f.kurumIci)
      .map(f => f.tutarlar[i])
      .filter((n): n is number => n != null)
    return dolu.length ? dolu.reduce((a, b) => a + b, 0) : null
  })
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
          <tbody>
            <tr>
              <td colSpan={9} className={`${BASLIK} text-center`}>{tabloBaslik}</td>
            </tr>
            <Bilgi etiket="BÜTÇE YILI:" deger={String(yil)} />
            <Bilgi etiket="PROGRAM ADI:" deger={blok.programAdi} />
            <Bilgi etiket="İDARE/BİRİM ADI:" deger={blok.veriKaynagi} />
            <Bilgi etiket="ALT PROGRAM ADI:" deger={blok.altProgramAdi} />
            <Bilgi etiket="GEREKÇE ve AÇIKLAMALAR" deger={blok.gerekce} />
            <Bilgi etiket="ALT PROGRAMIN HEDEFİ" deger={blok.hedef} />
            <Bilgi etiket="VERİNİN KAYNAĞI/ SORUMLU BİRİM" deger={blok.veriKaynagi} />
            <tr>
              <td colSpan={9} className={`${BASLIK} text-center`}>PERFORMANS GÖSTERGELERİ</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${BASLIK} text-left`}>Performans Göstergesi</td>
              {hucre('Ölçü Birimi', 'text-center', 'olcu')}
              {gBaslik.map((b, i) => hucre(b, 'text-center', `g-${i}`))}
            </tr>
            {blok.gostergeler.length === 0 ? (
              <tr><td colSpan={9} className={`${SATIR} py-10 text-center text-slate-500`}>Bu hedefe bağlı performans faaliyeti göstergesi yok.</td></tr>
            ) : blok.gostergeler.map(g => (
              <GostergeGrup key={`${g.kod}-${g.ad}`} g={g} />
            ))}
            <tr>
              <td colSpan={9} className={`${BASLIK} text-center`}>ALT PROGRAM KAPSAMINDA YÜRÜTÜLECEK FAALİYET MALİYETLERİ</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${BASLIK} text-left`}>Faaliyetler</td>
              {mBaslik.slice(0, 4).map((b, i) => hucre(b, 'text-center', `m-${i}`))}
              <td colSpan={2} className={`${BASLIK} text-center`}>{mBaslik[4]}</td>
              {hucre(mBaslik[5], 'text-center', 'm-5')}
            </tr>
            {blok.faaliyetler.length === 0 ? (
              <tr><td colSpan={9} className={`${SATIR} py-8 text-center text-slate-500`}>Bu hedefe bağlı performans faaliyeti yok.</td></tr>
            ) : blok.faaliyetler.map(f => (
              <Fragment key={`${f.kod}-${f.ad}`}>
                <MaliyetSatir ad={`${f.kod} ${f.ad}`.trim()} tutarlar={f.tutarlar} kurumIci={f.kurumIci} />
                <MaliyetSatir ad="Bütçe İçi" tutarlar={f.tutarlar} kurumIci={f.kurumIci} />
              </Fragment>
            ))}
            <MaliyetSatir ad="Toplam" tutarlar={toplam} kalin />
            <MaliyetSatir ad="Bütçe İçi Toplam" tutarlar={toplam} kalin />
            <tr>
              <td colSpan={9} className={`${BASLIK} text-center`}>Faaliyetlere İlişkin Açıklamalar</td>
            </tr>
            {blok.faaliyetler.map((f, i) => (
              <tr key={`${f.kod}-acik`}>
                <td colSpan={2} className={`${ETIKET}`}>{i + 1}- Faaliyet Adı:</td>
                <td colSpan={7} className={DEGER}>{`PH ${f.kod} ${f.ad}`.trim()}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  )
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <tr>
      <td colSpan={2} className={`${ETIKET} whitespace-nowrap`}>{etiket}</td>
      <td colSpan={7} className={`${DEGER} whitespace-pre-wrap`}>{deger}</td>
    </tr>
  )
}

function GostergeGrup({ g }: { g: PpPerformansBlok['gostergeler'][number] }) {
  return (
    <>
      <tr>
        <td rowSpan={4} className={`${ETIKET} font-mono text-xs align-middle`}>{g.kod}</td>
        <td className={`${SATIR}`}>{g.ad}</td>
        <td className={`${SATIR} text-center`}>{g.birim}</td>
        {g.degerler.map((d, i) => <td key={i} className={`${SATIR} text-right tabular-nums`}>{ppRaporGosterge(d)}</td>)}
      </tr>
      <tr>
        <td className={ETIKET}>Göstergeye İlişkin Açıklama:</td>
        <td colSpan={7} className={DEGER}>{g.aciklama}</td>
      </tr>
      <tr>
        <td className={ETIKET}>Hesaplama Yöntemi:</td>
        <td colSpan={7} className={DEGER}>{g.hesaplama}</td>
      </tr>
      <tr>
        <td className={ETIKET}>Sorumlu İdare:</td>
        <td colSpan={7} className={DEGER}>{g.sorumlu}</td>
      </tr>
    </>
  )
}

function MaliyetSatir({
  ad,
  tutarlar,
  kalin = false,
  kurumIci = false,
}: {
  ad: string
  tutarlar: (number | null)[]
  kalin?: boolean
  kurumIci?: boolean
}) {
  const adCls = kalin ? TOPLAM : ETIKET
  const sayCls = `${kalin ? TOPLAM : SATIR} text-right tabular-nums`
  const hucre = (t: number | null | undefined) => (kurumIci ? 'Kurum İçi' : ppRaporPara(t ?? null))
  return (
    <tr>
      <td colSpan={2} className={adCls}>{ad}</td>
      {tutarlar.slice(0, 4).map((t, i) => <td key={i} className={sayCls}>{hucre(t)}</td>)}
      <td colSpan={2} className={sayCls}>{hucre(tutarlar[4])}</td>
      <td className={sayCls}>{hucre(tutarlar[5])}</td>
    </tr>
  )
}
