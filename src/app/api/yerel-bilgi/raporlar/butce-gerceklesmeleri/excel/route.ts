import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { mudurlukIdFromAuthSession } from '@/lib/kadro-mudurluk-id'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const access = await getAppAccess(supabase, user.id)
  const mudId = await mudurlukIdFromAuthSession(supabase, user.id, access)
  if (mudId == null) return NextResponse.json({ error: 'Müdürlük bulunamadı' }, { status: 400 })

  const [{ data: mud }, { data: gider }, { data: gelir }, { data: islem }] = await Promise.all([
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('id', mudId).maybeSingle(),
    supabase.from('yerel_bilgi_butce_gider').select('id, tanim_adi').eq('aktif', true).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    supabase.from('yerel_bilgi_butce_gelir').select('id, tanim_adi').eq('aktif', true).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    supabase.from('yerel_bilgi_butce_gider_islem').select('*').eq('mudurluk_id', mudId),
  ])

  const giderMap = new Map<number, number | null>()
  const gelirMap = new Map<number, number | null>()
  for (const r of islem ?? []) {
    const row = r as { butce_gider_kalem_id?: number | null; butce_gelir_kalem_id?: number | null; tutar?: number | null }
    if (row.butce_gider_kalem_id != null) giderMap.set(row.butce_gider_kalem_id, row.tutar ?? null)
    if (row.butce_gelir_kalem_id != null) gelirMap.set(row.butce_gelir_kalem_id, row.tutar ?? null)
  }

  const rows: (string | number | null)[][] = [['Müdürlük', mud?.mudurluk_adi ?? '—'], [], ['Gider Kalemi', 'Gerçekleşme Tutarı']]
  for (const k of gider ?? []) rows.push([k.tanim_adi, giderMap.get(k.id) ?? 0])
  rows.push([], ['Gelir Kalemi', 'Gerçekleşme Tutarı'])
  for (const k of gelir ?? []) rows.push([k.tanim_adi, gelirMap.get(k.id) ?? 0])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Butce Gerceklesme')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': "attachment; filename=\"Butce_Gerceklesmeleri_Raporu.xlsx\"" } })
}
