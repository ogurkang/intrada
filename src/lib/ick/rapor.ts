import type { IckDb } from '@/lib/ick/erisim'
import { ICK_EYLEM_DURUM_ETIKET, ickKodBilesen, ickKodSiralama, ickTarihMetni, ickTerminGoster, ICK_BILESEN_SIRA, type IckEylemDurum } from '@/lib/ick/tanim'
import { ICK_EYLEM_KOLON, ickSorumluAdi, ickTumMudurlukHaritasi, type IckEylemKayit } from '@/lib/ick/yukle'

export type IckRaporSatir = {
  kod: string
  bilesen: string
  genelSartKod: string
  genelSartMetin: string
  ongorulenEylem: string
  sorumlu: string
  cikti: string
  termin: string
  durum: IckEylemDurum
  durumEtiket: string
  ilerleme: number
  donemdeTerminli: boolean
  kumulatifKapsam: boolean
  gecikti: boolean
  calisma: string
  kanit: string
  degerlendirme: string
  sonuc: string
  kanitSayisi: number
}

export type IckRaporOzet = { eylem: number; tamamlanan: number; devam: number; baslanmadi: number; oran: number }

export type IckRaporVerisi = {
  planAd: string
  planDonem: string
  donemBaslik: string
  donemAralik: string
  kilitli: boolean
  kilitTarihi: string
  satirlar: IckRaporSatir[]
  donemOzet: IckRaporOzet
  kumulatifOzet: IckRaporOzet
  bilesenOzet: { bilesen: string; toplam: number; tamamlanan: number; devam: number; baslanmadi: number; iptal: number; geciken: number }[]
}

type Donem = { id: number; plan_id: number; yil: number; yari: number; bas: string; bit: string; durum: string; kilit_at: string | null }
type Anlik = {
  eylem_id: number
  durum: string
  ilerleme: number
  donemde_terminli: boolean
  gecikti: boolean
  calisma: string
  kanit_aciklama: string
  degerlendirme: string
  sonuc: string
  kanit_sayisi: number
}
type Ger = { id: number; eylem_id: number; donem_yili: number | null; beyan_durum: string; beyan_ilerleme: number; calisma: string; kanit_aciklama: string; degerlendirme: string; sonuc: string; karar_at: string | null; akis: string }

function ayindaMi(tarih: string | null, yil: number, bas: string, bit: string): { gun: string; icinde: boolean } | null {
  if (!tarih) return null
  const ay = Number(tarih.slice(5, 7))
  const ayBas = `${yil}-${String(ay).padStart(2, '0')}-01`
  const sonGun = new Date(Date.UTC(yil, ay, 0)).getUTCDate()
  const aySon = `${yil}-${String(ay).padStart(2, '0')}-${String(sonGun).padStart(2, '0')}`
  return { gun: aySon, icinde: ayBas >= `${bas.slice(0, 7)}-01` && ayBas <= bit }
}

function ozet(liste: IckRaporSatir[]): IckRaporOzet {
  const tamamlanan = liste.filter(s => s.durum === 'tamamlandi').length
  const devam = liste.filter(s => s.durum === 'devam').length
  const baslanmadi = liste.filter(s => s.durum === 'baslanmadi').length
  return { eylem: liste.length, tamamlanan, devam, baslanmadi, oran: liste.length ? Math.round((tamamlanan / liste.length) * 100) : 0 }
}

export async function ickRaporVerisi(db: IckDb, donemId: number): Promise<{ veri?: IckRaporVerisi; hata?: string }> {
  const { data: dRaw } = await db.from('ick_izleme_donemi').select('id, plan_id, yil, yari, bas, bit, durum, kilit_at').eq('id', donemId).maybeSingle()
  if (!dRaw) return { hata: 'İzleme dönemi bulunamadı.' }
  const d = dRaw as Donem
  const [planR, eylemR, gsR, mudAd] = await Promise.all([
    db.from('ick_plan').select('ad, bas_yil, bit_yil').eq('id', d.plan_id).maybeSingle(),
    db.from('ick_eylem').select(`${ICK_EYLEM_KOLON}, son_kesin_gerceklesme_id`).eq('plan_id', d.plan_id),
    db.from('ick_genel_sart').select('id, kod, metin'),
    ickTumMudurlukHaritasi(db),
  ])
  if (eylemR.error) return { hata: eylemR.error.message }
  const eylemler = (eylemR.data as (IckEylemKayit & { son_kesin_gerceklesme_id: number | null })[] | null) ?? []
  const gs = new Map(((gsR.data as { id: number; kod: string; metin: string }[] | null) ?? []).map(g => [g.id, g]))
  const ids = eylemler.map(e => e.id)
  const kilitli = d.durum === 'kilitli'

  const anlik = new Map<number, Anlik>()
  const gerceklesme = new Map<number, Ger>()
  const kanitSay = new Map<number, number>()
  if (kilitli) {
    const { data } = await db
      .from('ick_izleme_anlik')
      .select('eylem_id, durum, ilerleme, donemde_terminli, gecikti, calisma, kanit_aciklama, degerlendirme, sonuc, kanit_sayisi')
      .eq('donem_id', d.id)
    for (const a of (data as Anlik[] | null) ?? []) anlik.set(a.eylem_id, a)
  } else if (ids.length) {
    const [gR, bR] = await Promise.all([
      db
        .from('ick_gerceklesme')
        .select('id, eylem_id, donem_yili, beyan_durum, beyan_ilerleme, calisma, kanit_aciklama, degerlendirme, sonuc, karar_at, akis')
        .in('eylem_id', ids)
        .eq('akis', 'kesinlesti')
        .order('karar_at', { ascending: false }),
      db.from('ick_belge').select('eylem_id, gerceklesme_id').eq('aktif', true),
    ])
    const gList = (gR.data as Ger[] | null) ?? []
    for (const e of eylemler) {
      const tekrar = e.termin_tipi === 'yillik' || e.termin_tipi === 'alti_aylik'
      const g = tekrar ? gList.find(x => x.eylem_id === e.id && x.donem_yili === d.yil) : gList.find(x => x.id === e.son_kesin_gerceklesme_id)
      if (g) gerceklesme.set(e.id, g)
    }
    for (const b of (bR.data as { eylem_id: number | null; gerceklesme_id: number | null }[] | null) ?? []) {
      for (const e of eylemler) {
        if (b.eylem_id === e.id || (b.gerceklesme_id != null && b.gerceklesme_id === gerceklesme.get(e.id)?.id)) {
          kanitSay.set(e.id, (kanitSay.get(e.id) ?? 0) + 1)
        }
      }
    }
  }

  const satirlar: IckRaporSatir[] = eylemler
    .map(e => {
      const g = gs.get(e.genel_sart_id)
      const tekrar = e.termin_tipi === 'yillik' || e.termin_tipi === 'alti_aylik'
      let durum: IckEylemDurum
      let ilerleme: number
      let donemdeTerminli: boolean
      let gecikti: boolean
      let calisma = ''
      let kanit = ''
      let degerlendirme = ''
      let sonuc = ''
      let kanitSayisi = 0
      const a = anlik.get(e.id)
      if (kilitli && a) {
        durum = a.durum as IckEylemDurum
        ilerleme = Number(a.ilerleme)
        donemdeTerminli = a.donemde_terminli
        gecikti = a.gecikti
        calisma = a.calisma
        kanit = a.kanit_aciklama
        degerlendirme = a.degerlendirme
        sonuc = a.sonuc
        kanitSayisi = a.kanit_sayisi
      } else {
        const ger = gerceklesme.get(e.id)
        durum = tekrar ? ((ger?.beyan_durum as IckEylemDurum) ?? 'baslanmadi') : e.durum
        if (e.durum === 'iptal') durum = 'iptal'
        ilerleme = tekrar ? Number(ger?.beyan_ilerleme ?? 0) : Number(e.ilerleme)
        const ay = ayindaMi(e.termin_ilk, d.yil, d.bas, d.bit)
        if (e.termin_tipi === 'tek') donemdeTerminli = Boolean(e.termin_guncel && e.termin_guncel >= d.bas && e.termin_guncel <= d.bit)
        else if (e.termin_tipi === 'yillik') donemdeTerminli = Boolean(ay?.icinde)
        else donemdeTerminli = e.termin_tipi === 'alti_aylik'
        if (durum === 'iptal') gecikti = false
        else if (e.termin_tipi === 'tek') gecikti = Boolean(e.termin_guncel && e.termin_guncel <= d.bit && durum !== 'tamamlandi')
        else if (e.termin_tipi === 'yillik') gecikti = Boolean(ay && ay.gun <= d.bit && durum !== 'tamamlandi')
        else gecikti = false
        calisma = ger?.calisma ?? ''
        kanit = ger?.kanit_aciklama ?? ''
        degerlendirme = ger?.degerlendirme ?? ''
        sonuc = ger?.sonuc ?? ''
        kanitSayisi = kanitSay.get(e.id) ?? 0
      }
      const kumulatifKapsam =
        durum !== 'iptal' && (donemdeTerminli || (e.termin_tipi === 'tek' && Boolean(e.termin_guncel && e.termin_guncel <= d.bit)))
      return {
        kod: e.kod_norm,
        bilesen: ickKodBilesen(e.kod_norm),
        genelSartKod: g?.kod ?? '',
        genelSartMetin: g?.metin ?? '',
        ongorulenEylem: e.ongorulen_eylem,
        sorumlu: ickSorumluAdi(e, mudAd),
        cikti: e.cikti,
        termin: ickTerminGoster(e),
        durum,
        durumEtiket: durum === 'devam' ? `Devam ediyor (%${Math.round(ilerleme)})` : ICK_EYLEM_DURUM_ETIKET[durum],
        ilerleme,
        donemdeTerminli: durum !== 'iptal' && donemdeTerminli,
        kumulatifKapsam,
        gecikti,
        calisma,
        kanit,
        degerlendirme,
        sonuc,
        kanitSayisi,
      }
    })
    .sort((a, b) => ickKodSiralama(a.kod, b.kod))

  const plan = planR.data as { ad: string; bas_yil: number; bit_yil: number } | null
  const bilesenOzet = ICK_BILESEN_SIRA.map(b => {
    const l = satirlar.filter(s => s.bilesen === b)
    return {
      bilesen: b,
      toplam: l.length,
      tamamlanan: l.filter(s => s.durum === 'tamamlandi').length,
      devam: l.filter(s => s.durum === 'devam').length,
      baslanmadi: l.filter(s => s.durum === 'baslanmadi').length,
      iptal: l.filter(s => s.durum === 'iptal').length,
      geciken: l.filter(s => s.gecikti).length,
    }
  }).filter(b => b.toplam > 0)

  return {
    veri: {
      planAd: plan?.ad ?? '',
      planDonem: plan ? `${plan.bas_yil}-${plan.bit_yil}` : '',
      donemBaslik: `${d.yil} Yılı ${d.yari === 1 ? 'Birinci' : 'İkinci'} Altı Aylık İzleme Raporu`,
      donemAralik: `${ickTarihMetni(d.bas)} – ${ickTarihMetni(d.bit)}`,
      kilitli,
      kilitTarihi: d.kilit_at ? new Date(d.kilit_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : '',
      satirlar,
      donemOzet: ozet(satirlar.filter(s => s.donemdeTerminli)),
      kumulatifOzet: ozet(satirlar.filter(s => s.kumulatifKapsam)),
      bilesenOzet,
    },
  }
}

export const ICK_RAPOR_ACIKLAMA = [
  'Gerçekleşme oranı eylem sayısına göre hesaplanır: tamamlanan eylem sayısı / kapsamdaki eylem sayısı.',
  'Dönem kapsamı: termini bu izleme döneminde olan eylemler (her yıl tekrarlanan eylemlerde terminin ayı dönem içindeyse; altı aylık izlemeli eylemler her dönem).',
  'Kümülatif kapsam: termini dönem sonuna kadar gelmiş tüm eylemler. İptal edilen eylemler kapsam dışıdır.',
  'Durum, koordinatörün kesinleştirdiği son bildirimden gelir; incelemedeki bildirimler rapora girmez.',
]
