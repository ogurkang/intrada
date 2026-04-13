import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { data: rows } = await supabase
    .from('yerel_bilgi_arac')
    .select('sira_no, plaka_no, sasi_no, aktif, mudurluk_id')
    .eq('aktif', true)
    .order('sira_no', { ascending: true })

  const aoa: (string | number)[][] = [['Sıra No', 'Plaka', 'Şasi', 'Durum']]
  for (const r of rows ?? []) aoa.push([r.sira_no ?? r.mudurluk_id ?? 0, (r.plaka_no ?? '').trim(), (r.sasi_no ?? '').trim(), 'Aktif'])

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Arac Bilgileri')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': "attachment; filename=\"Arac_Bilgileri_Raporu.xlsx\"" } })
}
