'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchKesintiDonemAuditRow,
  kesintiDonemAuditSnapshot,
  writeKesintiDonemAuditLogSafe,
} from '@/lib/kesinti-donem-audit'

const PATH = '/kesintiler/arazi'
const REF_TABLE = 'arazi_donem'
const MODUL = 'ARZ'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function araziDonemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil              = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi     = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const payload = {
    yil, baslangic_tarihi, bitis_tarihi,
    sira_no:   str(fd, 'sira_no'),
    donem_adi: str(fd, 'donem_adi'),
    durum:     'Açık' as const,
  }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase.from('arazi_donem').insert(payload).select('id').single()

  if (error) return { hata: error.message }
  if (inserted?.id) {
    await writeKesintiDonemAuditLogSafe(supabase, {
      refTable: REF_TABLE, modul: MODUL, donemId: inserted.id,
      islem: 'Ekle', ozet: `${payload.donem_adi ?? 'Dönem'} eklendi.`,
      sonraki: kesintiDonemAuditSnapshot(payload as Record<string, unknown>),
    })
  }
  revalidatePath(PATH)
  return {}
}

export async function araziDonemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)
  const payload = {
    yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
    sira_no:          str(fd, 'sira_no') ?? undefined,
    donem_adi:        str(fd, 'donem_adi') ?? undefined,
    baslangic_tarihi: str(fd, 'baslangic_tarihi') ?? undefined,
    bitis_tarihi:     str(fd, 'bitis_tarihi') ?? undefined,
  }
  const { error } = await supabase.from('arazi_donem').update(payload).eq('id', id)

  if (error) return { hata: error.message }
  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE, modul: MODUL, donemId: id,
    islem: 'Güncelle', ozet: `${payload.donem_adi ?? onceki?.donem_adi ?? 'Dönem'} güncellendi.`,
    onceki, sonraki: kesintiDonemAuditSnapshot({ ...onceki, ...payload }),
  })
  revalidatePath(PATH)
  return {}
}

export async function araziDonemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)
  const { error } = await supabase.from('arazi_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: error.message }
  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE, modul: MODUL, donemId: id,
    islem: 'Kapat', ozet: `${String(onceki?.donem_adi ?? id)} dönemi kapatıldı.`,
    onceki, sonraki: { ...onceki, durum: 'Kapalı' },
  })
  revalidatePath(PATH)
  return {}
}

export async function araziDonemAc(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)
  const { error } = await supabase.from('arazi_donem').update({ durum: 'Açık' }).eq('id', id)
  if (error) return { hata: error.message }
  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE, modul: MODUL, donemId: id,
    islem: 'Aç', ozet: `${String(onceki?.donem_adi ?? id)} dönemi tekrar açıldı.`,
    onceki, sonraki: { ...onceki, durum: 'Açık' },
  })
  revalidatePath(PATH)
  return {}
}
