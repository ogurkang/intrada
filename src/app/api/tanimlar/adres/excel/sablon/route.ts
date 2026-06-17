import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adresMahalleSablonBuffer } from '@/lib/tanim-adres-excel'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })

  const buf = adresMahalleSablonBuffer()
  const encoded = encodeURIComponent('Adres_Mahalle_Sablonu.xlsx')

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Adres_Mahalle_Sablonu.xlsx"; filename*=UTF-8''${encoded}`,
    },
  })
}
