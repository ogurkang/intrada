'use server'

import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { revalidatePath } from 'next/cache'
import {
  fetchKesintiDonemAuditRow,
  kesintiDonemAuditSnapshot,
  writeKesintiDonemAuditLogSafe,
} from '@/lib/kesinti-donem-audit'
import {
  performansAcikDonemVarMi,
  performansDonemAcilisKontrolu,
  siradakiPerformansDonemSiraNo,
} from '@/lib/performans-donem'
import { performansDonemPersonelSeedle } from '@/app/(dashboard)/performans/actions'

const PATH = '/performans/degerlendirme'
const REF_TABLE = 'performans_donem'
const MODUL = 'PERF'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, hata: 'Oturum gerekli.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { supabase, hata: 'Bu işlem için yetkiniz yok.' as const }
  return { supabase, hata: null as null, user }
}

function revalidatePerformansPaths() {
  revalidatePath(PATH)
  revalidatePath('/performans')
}

export async function performansDonemEkle(fd: FormData): Promise<{ hata?: string; id?: number }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase, user } = gate

  const yil = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const acik = await performansAcikDonemVarMi(supabase as Sb)
  if (acik) {
    return { hata: `Önce ${acik.donem_adi ?? `#${acik.id}`} açık dönemini kapatın.` }
  }

  const sira_no = await siradakiPerformansDonemSiraNo(supabase as Sb, yil)
  const donem_adi = str(fd, 'donem_adi') ?? `${yil} Performans Dönemi`

  const payload = {
    yil,
    sira_no,
    donem_adi,
    baslangic_tarihi,
    bitis_tarihi,
    durum: 'Açık' as const,
    created_by: user!.id,
  }

  const { data: inserted, error } = await (supabase as Sb)
    .from('performans_donem')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE,
    modul: MODUL,
    donemId: inserted.id,
    islem: 'Ekle',
    ozet: `${donem_adi} eklendi.`,
    sonraki: kesintiDonemAuditSnapshot(payload as Record<string, unknown>),
  })

  const seed = await performansDonemPersonelSeedle(inserted.id)
  if (seed.hata) {
    return { hata: `Dönem açıldı fakat personel listesi: ${seed.hata}`, id: inserted.id }
  }

  revalidatePerformansPaths()
  return { id: inserted.id }
}

export async function performansDonemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase } = gate

  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)

  const { data: mevcut } = await (supabase as Sb)
    .from('performans_donem')
    .select('durum')
    .eq('id', id)
    .maybeSingle()
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }
  if (mevcut.durum === 'Yayınlandı') return { hata: 'Yayınlanmış dönem düzenlenemez.' }

  const yil = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const payload = {
    yil,
    donem_adi: str(fd, 'donem_adi') ?? undefined,
    baslangic_tarihi,
    bitis_tarihi,
    updated_at: new Date().toISOString(),
  }

  const { error } = await (supabase as Sb).from('performans_donem').update(payload).eq('id', id)
  if (error) return { hata: error.message }

  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE,
    modul: MODUL,
    donemId: id,
    islem: 'Güncelle',
    ozet: `${payload.donem_adi ?? onceki?.donem_adi ?? 'Dönem'} güncellendi.`,
    onceki,
    sonraki: kesintiDonemAuditSnapshot({ ...onceki, ...payload }),
  })

  revalidatePerformansPaths()
  return {}
}

export async function performansDonemKapat(id: number): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase } = gate

  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)

  const { data: mevcut } = await (supabase as Sb)
    .from('performans_donem')
    .select('durum')
    .eq('id', id)
    .maybeSingle()
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }
  if (mevcut.durum === 'Yayınlandı') return { hata: 'Yayınlanmış dönem kapatılamaz.' }

  const { error } = await (supabase as Sb)
    .from('performans_donem')
    .update({
      durum: 'Kapalı',
      kapatildi_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { hata: error.message }

  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE,
    modul: MODUL,
    donemId: id,
    islem: 'Kapat',
    ozet: `${String(onceki?.donem_adi ?? id)} dönemi kapatıldı.`,
    onceki,
    sonraki: { ...onceki, durum: 'Kapalı' },
  })

  revalidatePerformansPaths()
  return {}
}

export async function performansDonemAc(id: number): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase } = gate

  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)

  const kontrolHata = await performansDonemAcilisKontrolu(supabase as Sb, id)
  if (kontrolHata) return { hata: kontrolHata }

  const { error } = await (supabase as Sb)
    .from('performans_donem')
    .update({
      durum: 'Açık',
      kapatildi_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { hata: error.message }

  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE,
    modul: MODUL,
    donemId: id,
    islem: 'Aç',
    ozet: `${String(onceki?.donem_adi ?? id)} dönemi tekrar açıldı.`,
    onceki,
    sonraki: { ...onceki, durum: 'Açık' },
  })

  revalidatePerformansPaths()
  return {}
}
