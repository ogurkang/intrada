import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ickYetkiYukle, type IckDb } from '@/lib/ick/erisim'
import { ICK_EYLEM_DURUM_ETIKET, ickGenelSartSiralama } from '@/lib/ick/tanim'
import { ickPlanEylemleri, ickTumMudurlukHaritasi } from '@/lib/ick/yukle'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const planId = Number(id)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum yok.' }, { status: 401 })
  const db = supabase as IckDb
  const { yetki } = await ickYetkiYukle(db, user.id, user.email)
  if (!yetki.okuyabilir) return NextResponse.json({ hata: 'Yetki yok.' }, { status: 403 })

  const { data: plan } = await db.from('ick_plan').select('id, ad, bas_yil, bit_yil, surum_id').eq('id', planId).maybeSingle()
  if (!plan) return NextResponse.json({ hata: 'Plan bulunamadı.' }, { status: 404 })
  const mudAd = await ickTumMudurlukHaritasi(db)
  const [{ satirlar }, gsR, degR, isbR] = await Promise.all([
    ickPlanEylemleri(db, planId, mudAd),
    db.from('ick_genel_sart').select('id, kod').eq('surum_id', plan.surum_id),
    db.from('ick_genel_sart_degerlendirme').select('genel_sart_id, mevcut_durum, guvence, aciklama').eq('plan_id', planId),
    db.from('ick_eylem_isbirligi').select('eylem_id, mudurluk_id'),
  ])
  const gsKod = new Map(((gsR.data as { id: number; kod: string }[] | null) ?? []).map(g => [g.id, g.kod]))
  const isb = new Map<number, string[]>()
  for (const r of (isbR.data as { eylem_id: number; mudurluk_id: number }[] | null) ?? []) {
    isb.set(r.eylem_id, [...(isb.get(r.eylem_id) ?? []), mudAd.get(r.mudurluk_id) ?? ''])
  }

  const wb = new ExcelJS.Workbook()
  const gs = wb.addWorksheet('GenelSartlar')
  gs.columns = [
    { header: 'Genel Şart Kodu', key: 'kod', width: 14 },
    { header: 'Mevcut Durum', key: 'mevcut', width: 80 },
    { header: 'Güvence', key: 'guvence', width: 16 },
    { header: 'Açıklama', key: 'aciklama', width: 50 },
  ]
  const degerler = ((degR.data as { genel_sart_id: number; mevcut_durum: string; guvence: string; aciklama: string }[] | null) ?? [])
    .map(d => ({ kod: gsKod.get(d.genel_sart_id) ?? '', mevcut: d.mevcut_durum, guvence: d.guvence === 'makul_guvence' ? 'Makul güvence' : 'Eylem gerekli', aciklama: d.aciklama }))
    .sort((a, b) => ickGenelSartSiralama(a.kod, b.kod))
  degerler.forEach(d => gs.addRow(d))

  const ey = wb.addWorksheet('Eylemler')
  ey.columns = [
    { header: 'Genel Şart Kodu', key: 'gs', width: 14 },
    { header: 'Eylem Kodu', key: 'kod', width: 12 },
    { header: 'Öngörülen Eylem', key: 'eylem', width: 70 },
    { header: 'Sorumlu Birim', key: 'sorumlu', width: 36 },
    { header: 'İşbirliği Yapılacak Birim', key: 'isbirligi', width: 50 },
    { header: 'Çıktı / Sonuç', key: 'cikti', width: 40 },
    { header: 'Tamamlanma Tarihi', key: 'termin', width: 24 },
    { header: 'Açıklama', key: 'aciklama', width: 30 },
    { header: 'Durum', key: 'durum', width: 16 },
    { header: 'İlerleme', key: 'ilerleme', width: 10 },
    { header: 'Bağlı İşbirliği Müdürlükleri', key: 'isbBagli', width: 50 },
  ]
  for (const e of satirlar) {
    ey.addRow({
      gs: e.genelSartKod,
      kod: e.kod_norm,
      eylem: e.ongorulen_eylem,
      sorumlu: e.sorumlu,
      isbirligi: e.isbirligi_metin,
      cikti: e.cikti,
      termin: e.terminGoster,
      aciklama: e.aciklama,
      durum: ICK_EYLEM_DURUM_ETIKET[e.durum],
      ilerleme: e.ilerleme,
      isbBagli: (isb.get(e.id) ?? []).join('; '),
    })
  }
  for (const s of [gs, ey]) {
    s.getRow(1).font = { bold: true }
    s.eachRow(r => r.eachCell(c => (c.alignment = { wrapText: true, vertical: 'top' })))
    s.views = [{ state: 'frozen', ySplit: 1 }]
  }
  const buffer = Buffer.from(await wb.xlsx.writeBuffer())
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ic_kontrol_eylem_plani_${plan.bas_yil}-${plan.bit_yil}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
