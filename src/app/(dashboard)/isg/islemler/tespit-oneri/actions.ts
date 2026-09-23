'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { tespitOneriDurumMu, tespitOneriTarihIso } from '@/lib/isg-tespit-oneri'

type Kayit = {
  isyeri_mudurluk_id: number
  tespit_oneri: string
  sorumlu_mudurluk_id: number
  isbirligi_mudurluk_id: number | null
  durum: string
  son_tarih: string
}

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function mudurlukId(fd: FormData, key: string): number | null {
  const raw = str(fd, key)
  if (!raw) return null
  const id = Number.parseInt(raw, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function aktifMudurlukMu(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: number,
): Promise<boolean> {
  const { data } = await supabase
    .from('tanim_mudurluk')
    .select('id')
    .eq('id', id)
    .eq('aktif', true)
    .maybeSingle()
  return Boolean(data)
}

async function kayitOku(fd: FormData): Promise<{ hata: string } | { kayit: Kayit }> {
  const isyeri = mudurlukId(fd, 'isyeri_mudurluk_id')
  const sorumlu = mudurlukId(fd, 'sorumlu_mudurluk_id')
  const isbirligi = mudurlukId(fd, 'isbirligi_mudurluk_id')
  const tespit = str(fd, 'tespit_oneri')
  const durum = str(fd, 'durum')
  const sonTarih = tespitOneriTarihIso(str(fd, 'son_tarih'))

  if (!isyeri) return { hata: 'İşyeri unvanı seçilmelidir.' }
  if (!tespit) return { hata: 'Tespit öneri metni girilmelidir.' }
  if (!sorumlu) return { hata: 'Sorumlu müdürlük seçilmelidir.' }
  if (!tespitOneriDurumMu(durum)) return { hata: 'Durum seçilmelidir.' }
  if (!sonTarih) return { hata: 'Son tarih seçilmelidir.' }

  const supabase = await createClient()
  const secilenler = [isyeri, sorumlu, ...(isbirligi ? [isbirligi] : [])]
  for (const id of secilenler) {
    if (!(await aktifMudurlukMu(supabase, id))) {
      return { hata: 'Seçilen müdürlük aktif tanımlarda bulunamadı.' }
    }
  }

  return {
    kayit: {
      isyeri_mudurluk_id: isyeri,
      tespit_oneri: tespit,
      sorumlu_mudurluk_id: sorumlu,
      isbirligi_mudurluk_id: isbirligi,
      durum,
      son_tarih: sonTarih,
    },
  }
}

async function sonrakiSiraNo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data } = await sb
    .from('isg_tespit_oneri')
    .select('sira_no')
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  const maks = Number(data?.sira_no ?? 0)
  return (Number.isFinite(maks) ? maks : 0) + 1
}

function yollariYenile(id?: number) {
  revalidatePath('/isg/islemler/tespit-oneri')
  if (id) revalidatePath(`/isg/islemler/tespit-oneri/${id}`)
}

export async function tespitOneriEkle(fd: FormData): Promise<{ hata?: string }> {
  const okunan = await kayitOku(fd)
  if ('hata' in okunan) return okunan

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const sira_no = await sonrakiSiraNo(supabase)
  const { data, error } = await sb
    .from('isg_tespit_oneri')
    .insert({ sira_no, ...okunan.kayit })
    .select('id, sira_no')
    .single()
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    modul: 'isg tespit öneri',
    islem: 'Ekle',
    ozet: `Tespit/öneri kaydı eklendi (sıra ${data.sira_no}).`,
    ref_table: 'isg_tespit_oneri',
    ref_id: String(data.id),
    sonraki: { sira_no, ...okunan.kayit },
  })
  yollariYenile(data.id)
  return {}
}

export async function tespitOneriGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const okunan = await kayitOku(fd)
  if ('hata' in okunan) return okunan

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: onceki, error: oncekiHata } = await sb
    .from('isg_tespit_oneri')
    .select('id, sira_no, isyeri_mudurluk_id, tespit_oneri, sorumlu_mudurluk_id, isbirligi_mudurluk_id, durum, son_tarih')
    .eq('id', id)
    .maybeSingle()
  if (oncekiHata) return { hata: oncekiHata.message }
  if (!onceki) return { hata: 'Kayıt bulunamadı.' }

  const { error } = await sb.from('isg_tespit_oneri').update(okunan.kayit).eq('id', id)
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    modul: 'isg tespit öneri',
    islem: 'Güncelle',
    ozet: `Tespit/öneri kaydı güncellendi (sıra ${onceki.sira_no}).`,
    ref_table: 'isg_tespit_oneri',
    ref_id: String(id),
    onceki,
    sonraki: okunan.kayit,
  })
  yollariYenile(id)
  return {}
}
