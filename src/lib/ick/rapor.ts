import type { IckDb } from '@/lib/ick/erisim'
import {
  ICK_EYLEM_DURUM_ETIKET,
  ickDonemBaslik,
  ickKodBilesen,
  ickKodSiralama,
  ickTarihMetni,
  ickTerminGoster,
  ICK_BILESEN_SIRA,
  ICK_VEKALET_IBARE,
  type IckEylemDurum,
} from '@/lib/ick/tanim'
import { ICK_EYLEM_KOLON, ickEylemKisileri, ickSorumluAdi, ickTumMudurlukHaritasi, type IckEylemKayit } from '@/lib/ick/yukle'

export type IckRaporSatir = {
  kod: string
  bilesen: string
  genelSartKod: string
  genelSartMetin: string
  ongorulenEylem: string
  sorumlu: string
  /** Müdürlük koordinatörleri (muhatap) */
  muhatap: string
  cikti: string
  termin: string
  durum: IckEylemDurum
  durumEtiket: string
  /** Gecikmiş / gecikmeli tamamlandı / sürekli / önceki plandan notları */
  not: string
  ilerleme: number
  donemdeTerminli: boolean
  kumulatifKapsam: boolean
  devreden: boolean
  oranDisi: boolean
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

type Donem = { id: number; plan_id: number; yil: number; yari: number; siklik: number; bas: string; bit: string; durum: string; kilit_at: string | null }

/** ick_donem_hesapla ve ick_izleme_anlik ortak satırı */
type HesapSatir = {
  eylem_id: number
  tekrar_yili: number | null
  durum: string
  ilerleme: number
  kapsam: boolean
  kumulatif: boolean
  devreden: boolean
  gecikti: boolean
  gecikmeli_tamamlandi: boolean
  oran_disi: boolean
  gerceklesme_id: number | null
  calisma: string
  kanit_aciklama: string
  degerlendirme: string
  sonuc: string
  kanit_sayisi: number
}

function ozet(liste: IckRaporSatir[]): IckRaporOzet {
  const l = liste.filter(s => !s.oranDisi)
  const tamamlanan = l.filter(s => s.durum === 'tamamlandi').length
  const devam = l.filter(s => s.durum === 'devam').length
  const baslanmadi = l.filter(s => s.durum === 'baslanmadi').length
  return { eylem: l.length, tamamlanan, devam, baslanmadi, oran: l.length ? Math.round((tamamlanan / l.length) * 100) : 0 }
}

export async function ickRaporVerisi(db: IckDb, donemId: number): Promise<{ veri?: IckRaporVerisi; hata?: string }> {
  const { data: dRaw } = await db
    .from('ick_izleme_donemi')
    .select('id, plan_id, yil, yari, siklik, bas, bit, durum, kilit_at')
    .eq('id', donemId)
    .maybeSingle()
  if (!dRaw) return { hata: 'İzleme dönemi bulunamadı.' }
  const d = dRaw as Donem
  const kilitli = d.durum === 'kilitli'

  const hesapR = kilitli
    ? await db
        .from('ick_izleme_anlik')
        .select(
          'eylem_id, tekrar_yili, durum, ilerleme, kapsam:donemde_terminli, kumulatif, devreden, gecikti, gecikmeli_tamamlandi, oran_disi, gerceklesme_id, calisma, kanit_aciklama, degerlendirme, sonuc, kanit_sayisi',
        )
        .eq('donem_id', d.id)
    : await db.rpc('ick_donem_hesapla', { p_donem_id: d.id })
  if (hesapR.error) return { hata: hesapR.error.message }
  const hesap = (hesapR.data as HesapSatir[] | null) ?? []

  const [planR, eylemR, gsR, mudAd] = await Promise.all([
    db.from('ick_plan').select('ad, bas_yil, bit_yil').eq('id', d.plan_id).maybeSingle(),
    db.from('ick_eylem').select(ICK_EYLEM_KOLON).eq('plan_id', d.plan_id),
    db.from('ick_genel_sart').select('id, kod, metin'),
    ickTumMudurlukHaritasi(db),
  ])
  if (eylemR.error) return { hata: eylemR.error.message }
  const eylemler = new Map(((eylemR.data as IckEylemKayit[] | null) ?? []).map(e => [Number(e.id), e]))
  const kisiler = await ickEylemKisileri(db, [...eylemler.keys()])
  const gerIdleri = [...new Set(hesap.map(h => Number(h.gerceklesme_id)).filter(x => x > 0))]
  const vekalet = new Map<number, { dogrudan: boolean }>()
  for (let i = 0; i < gerIdleri.length; i += 300) {
    const { data } = await db.from('ick_gerceklesme').select('id, dogrudan').in('id', gerIdleri.slice(i, i + 300)).eq('vekaleten', true)
    for (const r of (data as { id: number; dogrudan: boolean }[] | null) ?? []) vekalet.set(Number(r.id), { dogrudan: Boolean(r.dogrudan) })
  }
  const gs = new Map(((gsR.data as { id: number; kod: string; metin: string }[] | null) ?? []).map(g => [g.id, g]))

  const satirlar: IckRaporSatir[] = hesap
    .map(h => {
      const e = eylemler.get(Number(h.eylem_id))
      if (!e) return null
      const g = gs.get(e.genel_sart_id)
      const durum = h.durum as IckEylemDurum
      const ilerleme = Number(h.ilerleme)
      const notlar: string[] = []
      if (h.tekrar_yili) notlar.push(`${h.tekrar_yili} yılı`)
      if (h.devreden && durum !== 'tamamlandi') notlar.push(`Gecikmiş, ilk tamamlanma tarihi: ${ickTarihMetni(e.termin_ilk)}`)
      if (h.gecikmeli_tamamlandi) notlar.push('Gecikmeli tamamlandı')
      if (h.oran_disi) notlar.push('Sürekli eylem; orana katılmaz')
      if (e.onceki_eylem_id) notlar.push(e.devir_notu || 'Önceki eylem planından')
      const v = h.gerceklesme_id ? vekalet.get(Number(h.gerceklesme_id)) : undefined
      if (v) notlar.push(v.dogrudan ? `${ICK_VEKALET_IBARE}; doğrudan işlendi` : ICK_VEKALET_IBARE)
      const not = notlar.join(' · ')
      const temelEtiket = durum === 'devam' ? `Devam ediyor (%${Math.round(ilerleme)})` : ICK_EYLEM_DURUM_ETIKET[durum] ?? durum
      return {
        kod: h.tekrar_yili ? `${e.kod_norm} (${h.tekrar_yili})` : e.kod_norm,
        bilesen: ickKodBilesen(e.kod_norm),
        genelSartKod: g?.kod ?? '',
        genelSartMetin: g?.metin ?? '',
        ongorulenEylem: e.ongorulen_eylem,
        sorumlu: ickSorumluAdi(e, mudAd),
        muhatap: (kisiler.get(e.id)?.koordinatorler ?? []).map(k => k.ad).join(', '),
        cikti: e.cikti,
        termin: ickTerminGoster(e),
        durum,
        durumEtiket: not ? `${temelEtiket} — ${not}` : temelEtiket,
        not,
        ilerleme,
        donemdeTerminli: Boolean(h.kapsam),
        kumulatifKapsam: Boolean(h.kumulatif),
        devreden: Boolean(h.devreden),
        oranDisi: Boolean(h.oran_disi),
        gecikti: Boolean(h.gecikti),
        calisma: h.calisma ?? '',
        kanit: h.kanit_aciklama ?? '',
        degerlendirme: h.degerlendirme ?? '',
        sonuc: h.sonuc ?? '',
        kanitSayisi: Number(h.kanit_sayisi ?? 0),
      }
    })
    .filter((s): s is IckRaporSatir => s !== null)
    .sort((a, b) => ickKodSiralama(a.kod, b.kod) || a.kod.localeCompare(b.kod, 'tr'))

  const plan = planR.data as { ad: string; bas_yil: number; bit_yil: number } | null
  const kapsamdaki = satirlar.filter(s => s.donemdeTerminli || s.kumulatifKapsam)
  const bilesenOzet = ICK_BILESEN_SIRA.map(b => {
    const l = kapsamdaki.filter(s => s.bilesen === b)
    return {
      bilesen: b,
      toplam: l.length,
      tamamlanan: l.filter(s => s.durum === 'tamamlandi').length,
      devam: l.filter(s => s.durum === 'devam').length,
      baslanmadi: l.filter(s => s.durum === 'baslanmadi').length,
      iptal: satirlar.filter(s => s.bilesen === b && s.durum === 'iptal').length,
      geciken: l.filter(s => s.gecikti).length,
    }
  }).filter(b => b.toplam > 0)

  return {
    veri: {
      planAd: plan?.ad ?? '',
      planDonem: plan ? `${plan.bas_yil}-${plan.bit_yil}` : '',
      donemBaslik: ickDonemBaslik(d.yil, d.yari, d.siklik ?? 2),
      donemAralik: `${ickTarihMetni(d.bas)} – ${ickTarihMetni(d.bit)}`,
      kilitli,
      kilitTarihi: d.kilit_at ? new Date(d.kilit_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : '',
      satirlar: satirlar.filter(s => s.donemdeTerminli || s.kumulatifKapsam || s.durum === 'iptal' || s.durum === 'devredildi'),
      donemOzet: ozet(satirlar.filter(s => s.donemdeTerminli)),
      kumulatifOzet: ozet(satirlar.filter(s => s.kumulatifKapsam)),
      bilesenOzet,
    },
  }
}

export const ICK_RAPOR_ACIKLAMA = [
  'Gerçekleşme oranı eylem sayısına göre hesaplanır: tamamlanan eylem sayısı / kapsamdaki eylem sayısı. Sürekli eylemler listelenir, orana katılmaz.',
  'Dönem kapsamı: tamamlanma tarihi bu izleme döneminde olan eylemler ile tamamlanma tarihi geçtiği hâlde tamamlanmayan eylemler. Geciken eylem tamamlanana dek her dönemde "Gecikmiş" notuyla yer alır; tamamlandığı dönemde "Gecikmeli tamamlandı" olarak görünür.',
  'Her yıl tekrarlanan eylemlerin her yılki gerçekleşmesi ayrı satırdır. Altı aylık izlemeli eylemler o yılın her döneminde yer alır.',
  'Kümülatif kapsam: tamamlanma tarihi dönem sonuna kadar gelmiş tüm eylemler. İptal edilen ve yeni plana devredilen eylemler kapsam dışıdır.',
  'Durum, koordinatörün kesinleştirdiği son bildirimden gelir; incelemedeki bildirimler rapora girmez.',
]
