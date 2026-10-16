import { readFile } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import type { IckDb } from '@/lib/ick/erisim'
import { ickSablonAciklama, ickSablonXmlDoldur, type IckSablonSatir } from '@/lib/ick/plan-sablon'
import { ickPlanEylemleri, ickTumMudurlukHaritasi, type IckEylemListeSatir } from '@/lib/ick/yukle'

const SABLON = path.join(process.cwd(), 'src/lib/ick/sablon/ikep-plan.docx')

export function ickPlanWordAdi(basYil: number, bitYil: number): string {
  return `İKEP_${String(basYil).slice(-2)}${String(bitYil).slice(-2)}.docx`
}

function isbirligi(e: IckEylemListeSatir): string {
  if (e.isbirligi_metin.trim()) return e.isbirligi_metin.trim()
  if (e.isbirligi_kapsam === 'tum_mudurlukler') return 'Tüm Müdürlükler'
  return ''
}

function satirlar(eylemler: IckEylemListeSatir[], mevcut: string, aciklama: string, guvence: string | null): IckSablonSatir {
  const acik = eylemler.filter(e => e.durum !== 'devredildi')
  const birlestir = (al: (e: IckEylemListeSatir) => string) => acik.map(al).filter(Boolean).join('\n')
  if (!acik.length) {
    return {
      mevcut: mevcut.trim() ? mevcut.trim() : null,
      eylemKod: '',
      eylem: '',
      sorumlu: '',
      isbirligi: '',
      cikti: '',
      termin: '',
      aciklama: ickSablonAciklama(false, aciklama, guvence),
    }
  }
  return {
    mevcut: mevcut.trim() ? mevcut.trim() : null,
    eylemKod: birlestir(e => e.kod_norm),
    eylem: birlestir(e => e.ongorulen_eylem),
    sorumlu: birlestir(e => e.sorumlu),
    isbirligi: birlestir(isbirligi),
    cikti: birlestir(e => e.cikti),
    termin: birlestir(e => e.terminGoster || e.termin_metin),
    aciklama: birlestir(e => (e.durum === 'iptal' ? 'İptal edildi.' : ickSablonAciklama(true, e.aciklama, null))),
  }
}

export async function ickPlanWordUret(db: IckDb, planId: number): Promise<{ buffer: Buffer; dosyaAdi: string } | { hata: string }> {
  const { data: plan } = await db.from('ick_plan').select('id, bas_yil, bit_yil, surum_id').eq('id', planId).maybeSingle()
  if (!plan) return { hata: 'Plan bulunamadı.' }
  const mudAd = await ickTumMudurlukHaritasi(db)
  const [{ satirlar: eylemler, hata }, gsR, degR] = await Promise.all([
    ickPlanEylemleri(db, planId, mudAd),
    db.from('ick_genel_sart').select('id, kod').eq('surum_id', plan.surum_id),
    db.from('ick_genel_sart_degerlendirme').select('genel_sart_id, mevcut_durum, guvence, aciklama').eq('plan_id', planId),
  ])
  if (hata) return { hata }

  const kod = new Map(((gsR.data as { id: number; kod: string }[] | null) ?? []).map(g => [g.id, g.kod]))
  const deg = new Map(
    ((degR.data as { genel_sart_id: number; mevcut_durum: string; guvence: string; aciklama: string }[] | null) ?? []).map(d => [kod.get(d.genel_sart_id) ?? '', d]),
  )
  const grup = new Map<string, IckEylemListeSatir[]>()
  for (const e of eylemler) {
    const k = e.genelSartKod
    grup.set(k, [...(grup.get(k) ?? []), e])
  }
  const veri = new Map<string, IckSablonSatir>()
  const kodlar = new Set<string>([...deg.keys(), ...grup.keys()])
  for (const k of kodlar) {
    if (!/^\d+\.\d+$/.test(k)) continue
    const d = deg.get(k)
    veri.set(k, satirlar(grup.get(k) ?? [], d?.mevcut_durum ?? '', d?.aciklama ?? '', d?.guvence ?? null))
  }

  const zip = await JSZip.loadAsync(await readFile(SABLON))
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) return { hata: 'Plan şablonu okunamadı.' }
  zip.file('word/document.xml', ickSablonXmlDoldur(xml, veri))
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return { buffer, dosyaAdi: ickPlanWordAdi(Number(plan.bas_yil), Number(plan.bit_yil)) }
}
