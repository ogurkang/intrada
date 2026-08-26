import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import {
  malBildirimSablonHucreEslestir,
  type MalExcelExportModu,
  type MalExcelPersonelBilgi,
} from '@/lib/mal-bildirim-excel'
import { parseMalBildirimRouteParam } from '@/lib/mal-bildirim-route'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')
    const modRaw = (searchParams.get('mod') ?? '').trim().toLowerCase()
    const mod: MalExcelExportModu = modRaw === 'coksatir' ? 'coksatir' : 'varsayilan'
    if (!idParam?.trim()) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const parsedId = parseMalBildirimRouteParam(idParam)
    if (!parsedId.ok) {
      return NextResponse.json({ error: 'Geçersiz kayıt anahtarı' }, { status: 400 })
    }

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'mal_bildirimi.xlsx')
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Şablon bulunamadı: public/templates/mal_bildirimi.xlsx' },
        { status: 404 },
      )
    }

    const supabase = await createClient()
    let q = supabase.from('mal_bildirimi').select('*, calisan(ad_soyad, tckn)')
    q = parsedId.by === 'public_id' ? q.eq('public_id', parsedId.public_id) : q.eq('id', parsedId.id)
    const { data: kayit, error } = await q.single()

    if (error || !kayit) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    }

    const cal = kayit.calisan as { ad_soyad?: string | null; tckn?: string | null } | null
    let kadroUnvani = ''
    let gorevUnvani = ''
    const { data: khList } = await fetchAllKadroHareketleri(supabase, 'gorev_unvani, kadro_unvani, statu, durumu, asil', q => q.eq('durumu', 'Dolu').eq('asil', kayit.sicil_no))
    const memurKadro = (khList ?? []).find(
      k => String((k as { statu?: string }).statu ?? '').trim().toLowerCase() === 'memur',
    ) as { gorev_unvani?: string; kadro_unvani?: string } | undefined
    if (memurKadro) {
      gorevUnvani = memurKadro.gorev_unvani ?? ''
      kadroUnvani = memurKadro.kadro_unvani ?? memurKadro.gorev_unvani ?? ''
    }

    const p: MalExcelPersonelBilgi = {
      adSoyad: cal?.ad_soyad ?? '',
      tckn: cal?.tckn ?? '',
      kadroUnvani,
      gorevUnvani,
    }

    const buf = fs.readFileSync(templatePath)
    const workbook = new ExcelJS.Workbook()
    // @ts-expect-error exceljs Buffer tipi ile @types/node Buffer uyumsuz
    await workbook.xlsx.load(buf)

    const ws = workbook.worksheets[0]
    if (!ws) {
      return NextResponse.json({ error: 'Şablonda sayfa yok' }, { status: 500 })
    }

    malBildirimSablonHucreEslestir(ws, kayit, p, 1, mod)

    const outBuf = await workbook.xlsx.writeBuffer()
    const adSoyad = cal?.ad_soyad ?? kayit.sicil_no
    const modSuffix = mod === 'coksatir' ? '_CokSatirli' : ''
    const filename = `Mal_Bildirimi${modSuffix}_${String(adSoyad).replace(/[/\\?*:\[\]]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    // Tarayıcılar çoğunlukla ilk `filename=` değerini kullanır; sabit "Mal_Bildirimi.xlsx" yüzünden hep o isim görünüyordu.
    // Türkçe vb. için ASCII yedek (RFC 5987'de filename* tam isim verir).
    const filenameAscii = filename.replace(/[\r\n"]/g, '').replace(/[^\x20-\x7E]/g, '_')

    return new NextResponse(Buffer.from(outBuf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Sondaki fazladan " kaldırıldı — yanlış Content-Disposition bazı tarayıcılarda indirmeyi bozuyordu.
        'Content-Disposition': `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('MAL_EXCEL_API_HATASI:', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı' }, { status: 500 })
  }
}
