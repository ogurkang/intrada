'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ggAayyyyToIso } from '@/lib/tarih'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function mezuniyetFromForm(val: string | null | undefined): string | null {
  if (!val?.trim()) return null
  return ggAayyyyToIso(val.trim().replace(/\//g, '.'))
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

async function digerVarsayilanlariKapat(supabase: SupabaseServer, sicil_no: string, haricId: number | null) {
  let q = supabase.from('calisan_ogrenim').update({ varsayilan: false, aktif: false }).eq('sicil_no', sicil_no)
  if (haricId != null) q = q.neq('id', haricId)
  await q
}

export async function ogrenimEkle(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  const varsayilan = fd.get('varsayilan') === 'true' || fd.get('varsayilan') === 'on'
  const supabase = await createClient()

  if (varsayilan) await digerVarsayilanlariKapat(supabase, sicil_no, null)

  const { error } = await supabase.from('calisan_ogrenim').insert({
    sicil_no,
    ogrenim_turu: str(fd, 'ogrenim_turu'),
    okul_adi: str(fd, 'okul_adi'),
    bolum: str(fd, 'bolum'),
    meslegi: str(fd, 'meslegi'),
    mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
    mezuniyet_tarihi: mezuniyetFromForm(str(fd, 'mezuniyet_tarihi')),
    varsayilan,
    aktif: varsayilan,
  })
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/ogrenim')
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function ogrenimGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: row } = await supabase.from('calisan_ogrenim').select('sicil_no').eq('id', id).single()
  const sicil_no = row?.sicil_no
  if (!sicil_no) return { hata: 'Kayıt bulunamadı.' }

  const varsayilan = fd.get('varsayilan') === 'true' || fd.get('varsayilan') === 'on'
  if (varsayilan) await digerVarsayilanlariKapat(supabase, sicil_no, id)

  const { error } = await supabase
    .from('calisan_ogrenim')
    .update({
      ogrenim_turu: str(fd, 'ogrenim_turu'),
      okul_adi: str(fd, 'okul_adi'),
      bolum: str(fd, 'bolum'),
      meslegi: str(fd, 'meslegi'),
      mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
      mezuniyet_tarihi: mezuniyetFromForm(str(fd, 'mezuniyet_tarihi')),
      varsayilan,
      aktif: varsayilan,
    })
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/ogrenim')
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function ogrenimSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: row } = await supabase.from('calisan_ogrenim').select('sicil_no').eq('id', id).single()
  const { error } = await supabase.from('calisan_ogrenim').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/ogrenim')
  if (row?.sicil_no) revalidatePath(`/personel/${row.sicil_no}`)
  return {}
}

export type OgrenimSatirInput = {
  ogrenim_turu: string
  okul_adi: string | null
  bolum: string | null
  mezuniyet_tarihi: string | null
  meslegi: string | null
  varsayilan: boolean
}

export async function ogrenimSatirlariEkle(
  sicil_no: string,
  satirlar: OgrenimSatirInput[]
): Promise<{ hata?: string }> {
  if (!sicil_no.trim()) return { hata: 'Sicil no zorunludur.' }
  const supabase = await createClient()

  for (const s of satirlar) {
    if (s.varsayilan) await digerVarsayilanlariKapat(supabase, sicil_no, null)
    const { error } = await supabase.from('calisan_ogrenim').insert({
      sicil_no,
      ogrenim_turu: s.ogrenim_turu || null,
      okul_adi: s.okul_adi,
      bolum: s.bolum,
      meslegi: s.meslegi,
      mezuniyet_yili: null,
      mezuniyet_tarihi: mezuniyetFromForm(s.mezuniyet_tarihi),
      varsayilan: s.varsayilan,
      aktif: s.varsayilan,
    })
    if (error) return { hata: error.message }
  }

  revalidatePath('/bildirim/ogrenim')
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}
