import { NextResponse } from 'next/server'
import { anketFormPdfBuffer } from '@/lib/anket-form-pdf'
import { anketKodTemizle, type AnketSoruTipi } from '@/lib/anket'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ kod: string }> }) {
  try {
    const { kod: kodHam } = await ctx.params
    const kod = anketKodTemizle(kodHam)
    const sb = tryCreateServiceRoleClient()
    if (!sb || !kod) return NextResponse.json({ error: 'Anket bulunamadı.' }, { status: 404 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = sb as any
    const { data: anket } = await db.from('anketler').select('id, baslik, aciklama, durum').eq('kod', kod).maybeSingle()
    if (!anket || anket.durum !== 'yayinda') {
      return NextResponse.json({ error: 'Anket bulunamadı.' }, { status: 404 })
    }
    const { data: soruData } = await db
      .from('anket_sorulari')
      .select('sira, metin, tip, secenekler')
      .eq('anket_id', anket.id)
      .order('sira')
    const sorular = ((soruData ?? []) as { sira: number; metin: string; tip: string; secenekler: string[] | null }[])
      .map(s => ({
        sira: Number(s.sira),
        metin: String(s.metin),
        tip: s.tip as AnketSoruTipi,
        secenekler: s.tip === 'evet_hayir'
          ? ['Evet', 'Hayır']
          : (Array.isArray(s.secenekler) ? s.secenekler.map(String).map(x => x.trim()).filter(Boolean) : []),
      }))
      .sort((a, b) => a.sira - b.sira)

    const pdf = await anketFormPdfBuffer({
      baslik: String(anket.baslik),
      aciklama: String(anket.aciklama ?? ''),
      sorular,
    })
    const filename = `Anket_Sorulari_${kod}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error('[anket form pdf]', e)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
