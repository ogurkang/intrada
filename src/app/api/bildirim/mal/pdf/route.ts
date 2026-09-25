import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { malBildirimPdfBuffer } from '@/lib/mal-bildirim-pdf'
import type { MalBildirimFormKayit, MalExcelPersonelBilgi } from '@/lib/mal-bildirim-excel'
import { parseMalBildirimRouteParam } from '@/lib/mal-bildirim-route'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const idParam = new URL(request.url).searchParams.get('id')
    if (!idParam?.trim()) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const parsedId = parseMalBildirimRouteParam(idParam)
    if (!parsedId.ok) {
      return NextResponse.json({ error: 'Geçersiz kayıt anahtarı' }, { status: 400 })
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
    const { data: khList } = await fetchAllKadroHareketleri(
      supabase,
      'gorev_unvani, kadro_unvani, statu, durumu, asil',
      filtre => filtre.eq('durumu', 'Dolu').eq('asil', kayit.sicil_no),
    )
    const memurKadro = (khList ?? []).find(
      k => String((k as { statu?: string }).statu ?? '').trim().toLowerCase() === 'memur',
    ) as { gorev_unvani?: string; kadro_unvani?: string } | undefined
    if (memurKadro) {
      gorevUnvani = memurKadro.gorev_unvani ?? ''
      kadroUnvani = memurKadro.kadro_unvani ?? memurKadro.gorev_unvani ?? ''
    }

    const personel: MalExcelPersonelBilgi = {
      adSoyad: cal?.ad_soyad ?? '',
      tckn: cal?.tckn ?? '',
      kadroUnvani,
      gorevUnvani,
    }

    const pdf = await malBildirimPdfBuffer(kayit as MalBildirimFormKayit, personel)
    const adSoyad = cal?.ad_soyad ?? kayit.sicil_no
    const filename = `Mal_Bildirimi_${String(adSoyad).replace(/[/\\?*:\[\]]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
    const filenameAscii = filename.replace(/[\r\n"]/g, '').replace(/[^\x20-\x7E]/g, '_')

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err) {
    console.error('MAL_PDF_API_HATASI:', err)
    return NextResponse.json({ error: 'PDF oluşturulamadı' }, { status: 500 })
  }
}
