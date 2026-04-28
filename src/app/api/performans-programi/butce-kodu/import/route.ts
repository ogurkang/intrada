import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

function cellToText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(Math.trunc(v))
  return String(v).trim()
}

function cleanKod(v: unknown): string {
  const s = cellToText(v).replace(/[^\d]/g, '')
  if (!s) return ''
  return s.padStart(2, '0')
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excel dosyası seçiniz.' }, { status: 400 })
    }
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array' })
    const first = wb.SheetNames[0]
    if (!first) return NextResponse.json({ error: 'Excel sayfası bulunamadı.' }, { status: 400 })
    const ws = wb.Sheets[first]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, raw: true, defval: null })

    const payload: Array<{
      adim_1: string
      adim_2: string
      adim_3: string
      adim_4: string
      hesap_adi: string
      ekonomik_kod: string
      aktif: boolean
    }> = []

    for (const r of rows) {
      const ad1 = cleanKod(r?.[0])
      const ad2 = cleanKod(r?.[1])
      const ad3 = cleanKod(r?.[2])
      const ad4 = cleanKod(r?.[3])
      const hesap = cellToText(r?.[4])
      if (!ad1 || !ad2 || !ad3 || !ad4 || !hesap) continue
      payload.push({
        adim_1: ad1,
        adim_2: ad2,
        adim_3: ad3,
        adim_4: ad4,
        hesap_adi: hesap,
        ekonomik_kod: `${ad1}.${ad2}.${ad3}.${ad4}`,
        aktif: true,
      })
    }

    if (!payload.length) {
      return NextResponse.json(
        { error: 'Geçerli satır bulunamadı. İlk 4 sütun kod, 5. sütun hesap adı olmalı.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { error } = await sb
      .from('performans_programi_butce_kodu')
      .upsert(payload, { onConflict: 'ekonomik_kod' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, kaydedilen: payload.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'İçe aktarma hatası.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
