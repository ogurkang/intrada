'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  EGITIM_DONEM_AUDIT_SELECT,
  egitimDonemAuditSnapshot,
  writeEgitimDonemAuditLogSafe,
} from '@/lib/egitim-donem-audit'
import { TERFI_DONEM_ALAN_ETIKETLERI } from '@/lib/terfi-donem-audit'
import { alanDegisiklikleriHesapla, degisiklikOzeti, degisiklikPayload } from '@/lib/personel-audit'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function egitimDonemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil      = parseInt(String(fd.get('yil') ?? '0'), 10)
  const donem_adi = str(fd, 'donem_adi')
  const bas       = str(fd, 'baslangic_tarihi')
  const bit       = str(fd, 'bitis_tarihi')
  if (!yil || !donem_adi || !bas || !bit) return { hata: 'Yıl, dönem adı ve tarihler zorunludur.' }
  if (bit < bas) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('egitim_takvimi_donem')
    .insert({
      yil, donem_adi, baslangic_tarihi: bas, bitis_tarihi: bit,
      sira_no: str(fd, 'sira_no'),
      durum:   'Açık',
    })
    .select(`id, ${EGITIM_DONEM_AUDIT_SELECT}`)
    .single()

  if (error) return { hata: error.message }
  if (inserted) {
    await writeEgitimDonemAuditLogSafe(supabase, {
      donemId: inserted.id,
      islem: 'Dönem Ekle',
      ozet: `Yeni eğitim dönemi: ${inserted.donem_adi ?? `${inserted.yil} Dönemi`}`,
      onceki: null,
      sonraki: egitimDonemAuditSnapshot(inserted),
    })
  }
  revalidatePath('/egitim')
  return {}
}

export async function egitimDonemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: mevcut, error: mevcutErr } = await supabase
    .from('egitim_takvimi_donem')
    .select(EGITIM_DONEM_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (mevcutErr) return { hata: mevcutErr.message }
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }

  const oncekiSnap = egitimDonemAuditSnapshot(mevcut)
  const sonrakiSnap = egitimDonemAuditSnapshot({
    yil: parseInt(String(fd.get('yil') ?? '0'), 10),
    sira_no: str(fd, 'sira_no'),
    donem_adi: str(fd, 'donem_adi'),
    baslangic_tarihi: str(fd, 'baslangic_tarihi'),
    bitis_tarihi: str(fd, 'bitis_tarihi'),
    durum: mevcut.durum,
  })

  const { error } = await supabase.from('egitim_takvimi_donem').update({
    yil:              sonrakiSnap.yil as number,
    donem_adi:        str(fd, 'donem_adi') ?? undefined,
    sira_no:          str(fd, 'sira_no') ?? undefined,
    baslangic_tarihi: str(fd, 'baslangic_tarihi') ?? undefined,
    bitis_tarihi:     str(fd, 'bitis_tarihi') ?? undefined,
  }).eq('id', id)

  if (error) return { hata: error.message }

  const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, TERFI_DONEM_ALAN_ETIKETLERI)
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writeEgitimDonemAuditLogSafe(supabase, {
      donemId: id,
      islem: 'Dönem Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'Eğitim dönemi güncellendi'),
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  revalidatePath('/egitim')
  return {}
}

export async function egitimDonemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: mevcut, error: mevcutErr } = await supabase
    .from('egitim_takvimi_donem')
    .select(EGITIM_DONEM_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (mevcutErr) return { hata: mevcutErr.message }
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }

  const oncekiSnap = egitimDonemAuditSnapshot(mevcut)
  const sonrakiSnap = { ...oncekiSnap, durum: 'Kapalı' }

  const { error } = await supabase.from('egitim_takvimi_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: error.message }

  await writeEgitimDonemAuditLogSafe(supabase, {
    donemId: id,
    islem: 'Dönem Kapat',
    ozet: 'Eğitim dönemi kapatıldı',
    onceki: oncekiSnap,
    sonraki: sonrakiSnap,
  })

  revalidatePath('/egitim')
  return {}
}
