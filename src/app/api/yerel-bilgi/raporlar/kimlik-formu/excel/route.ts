import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'

function str(v: unknown) {
  const s = String(v ?? '').trim()
  return s || '—'
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const idQ = Number(req.nextUrl.searchParams.get('id') ?? '')
  const sb = supabase as any
  const q = sb.from('yerel_bilgi_belediye_kimlik_formu').select('*')
  const { data: row } = Number.isFinite(idQ) && idQ > 0
    ? await q.eq('id', idQ).maybeSingle()
    : await q.eq('aktif', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()

  if (!row) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  const rows: (string | number)[][] = [
    ['Alan', 'Değer'],
    ['Form Adı', str(row.form_adi)],
    ['Kayıt Tarihi', str(row.kayit_tarihi)],
    ['İşlem Yapan', str(row.islem_yapan)],
    ['Durumu', row.aktif ? 'Aktif' : 'Pasif'],
    ['Belediye Kuruluş Yılı', row.belediye_kurulus_tarihi ? String(row.belediye_kurulus_tarihi).slice(0, 4) : '—'],
    ['Belediye Başkanı Adı', str(row.baskan_adi)],
    ['Belediye Başkanı Soyadı', str(row.baskan_soyadi)],
    ['Belediye Başkanı Cinsiyeti', str(row.baskan_cinsiyeti)],
    ['Belediye Başkanı Seçime Girdiği Parti', str(row.baskan_secime_girdigi_parti)],
    ['Belediye Başkanı Mevcut Parti', str(row.baskan_mevcut_parti)],
    ['Belediye Başkanı Dönemi', str(row.baskan_donem)],
    ['Belediye Başkanı Cep Telefonu', str(row.baskan_cep_telefonu)],
    ['Belediye WEB Adresi', str(row.belediye_web_adresi)],
    ['Belediye E-Posta', str(row.belediye_e_posta)],
    ['Belediye Telefon Numarası', str(row.belediye_telefon_numarasi)],
    ['Belediye Faks Numarası', str(row.belediye_faks_numarasi)],
    ['Belediye Çağrı Merkezi', str(row.belediye_cagri_merkezi)],
    ['Onaylı Sosyal Medya Hesabı', str(row.belediye_onayli_sosyal_medya_hesabi)],
    ['Belediye Açık Adresi', str(row.belediye_acik_adresi)],
    ['Mahalle Sayısı', row.mahalle_sayisi == null ? '—' : String(row.mahalle_sayisi)],
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Kimlik Formu')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Kimlik_Form_Raporu.xlsx"',
    },
  })
}
