import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppHarcamaYetkilileriExcelOlustur } from '@/lib/pp-harcama-yetkilileri-excel'
import {
  ppHarcamaYetkilileriEkranYukle,
  type PpHarcamaYetkilileriSirala,
  type PpHarcamaYetkilileriYon,
} from '@/lib/pp-harcama-yetkilileri-rapor'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const url = new URL(req.url)
  const sirala: PpHarcamaYetkilileriSirala = url.searchParams.get('sirala') === 'birim' ? 'birim' : 'yetkili'
  const yon: PpHarcamaYetkilileriYon = url.searchParams.get('yon') === 'desc' ? 'desc' : 'asc'

  const rapor = await ppHarcamaYetkilileriEkranYukle(supabase)
  const buf = await ppHarcamaYetkilileriExcelOlustur(rapor, { sirala, yon })
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Harcama_Birim_Yetkilileri.xlsx"',
    },
  })
}
