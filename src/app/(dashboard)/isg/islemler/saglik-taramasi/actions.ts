'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  ISG_SAGLIK_DONEM_ALAN_ETIKETLERI,
  ISG_SAGLIK_DONEM_AUDIT_SELECT,
  isgSaglikDonemAuditSnapshot,
  writeIsgSaglikDonemAuditLogSafe,
} from '@/lib/isg-saglik-taramasi-donem-audit'
import { alanDegisiklikleriHesapla, degisiklikOzeti, degisiklikPayload } from '@/lib/personel-audit'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

async function sonrakiSiraNo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data } = await sb
    .from('isg_saglik_taramasi_donem')
    .select('sira_no')
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  const maks = Number(data?.sira_no ?? 0)
  return (Number.isFinite(maks) ? maks : 0) + 1
}

function revalidateSaglikTaramasi() {
  revalidatePath('/isg/islemler/saglik-taramasi')
}

export async function isgSaglikTaramasiDonemEkle(fd: FormData): Promise<{ hata?: string }> {
  const donem_adi = str(fd, 'donem_adi')
  const bas = str(fd, 'baslangic_tarihi')
  const bit = str(fd, 'bitis_tarihi')
  if (!donem_adi || !bas || !bit) return { hata: 'Dönem adı ve tarih aralığı zorunludur.' }
  if (bit < bas) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const sira_no = await sonrakiSiraNo(supabase)

  const { data: inserted, error } = await sb
    .from('isg_saglik_taramasi_donem')
    .insert({
      sira_no,
      donem_adi,
      baslangic_tarihi: bas,
      bitis_tarihi: bit,
    })
    .select(`id, ${ISG_SAGLIK_DONEM_AUDIT_SELECT}`)
    .single()

  if (error) return { hata: error.message }
  if (inserted) {
    await writeIsgSaglikDonemAuditLogSafe(supabase, {
      donemId: inserted.id,
      islem: 'Dönem Ekle',
      ozet: `Sağlık taraması dönemi oluşturuldu: ${inserted.donem_adi}`,
      onceki: null,
      sonraki: isgSaglikDonemAuditSnapshot(inserted),
    })
  }

  revalidateSaglikTaramasi()
  return {}
}

export async function isgSaglikTaramasiDonemGuncelle(
  id: number,
  fd: FormData,
): Promise<{ hata?: string }> {
  const donem_adi = str(fd, 'donem_adi')
  const bas = str(fd, 'baslangic_tarihi')
  const bit = str(fd, 'bitis_tarihi')
  if (!donem_adi || !bas || !bit) return { hata: 'Dönem adı ve tarih aralığı zorunludur.' }
  if (bit < bas) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: mevcut, error: mevcutErr } = await sb
    .from('isg_saglik_taramasi_donem')
    .select(`id, ${ISG_SAGLIK_DONEM_AUDIT_SELECT}`)
    .eq('id', id)
    .maybeSingle()
  if (mevcutErr) return { hata: mevcutErr.message }
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }

  const oncekiSnap = isgSaglikDonemAuditSnapshot(mevcut)
  const sonrakiSnap = isgSaglikDonemAuditSnapshot({
    sira_no: mevcut.sira_no,
    donem_adi,
    baslangic_tarihi: bas,
    bitis_tarihi: bit,
  })

  const { error } = await sb
    .from('isg_saglik_taramasi_donem')
    .update({
      donem_adi,
      baslangic_tarihi: bas,
      bitis_tarihi: bit,
    })
    .eq('id', id)
  if (error) return { hata: error.message }

  const degisiklikler = alanDegisiklikleriHesapla(
    oncekiSnap,
    sonrakiSnap,
    ISG_SAGLIK_DONEM_ALAN_ETIKETLERI,
  )
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writeIsgSaglikDonemAuditLogSafe(supabase, {
      donemId: id,
      islem: 'Dönem Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'Sağlık taraması dönemi güncellendi'),
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  revalidateSaglikTaramasi()
  revalidatePath(`/isg/islemler/saglik-taramasi/${id}`)
  return {}
}
