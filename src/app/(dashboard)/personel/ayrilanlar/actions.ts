'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export async function personelAktifEt(formData: FormData): Promise<{ hata?: string }> {
  const sicil_no = String(formData.get('sicil_no') ?? '').trim()
  const giris    = String(formData.get('giris_tarihi') ?? '').trim()
  const neden    = String(formData.get('neden') ?? '').trim()

  if (!sicil_no) return { hata: 'Sicil no bulunamadı.' }
  if (!giris)    return { hata: 'Kuruma giriş tarihi zorunludur.' }

  const supabase = await createClient()

  // İlgili personelin son hareket kaydını bul (ayrılış satırı)
  const { data: son, error: selErr } = await supabase
    .from('personel_hareketleri')
    .select('id, hareket_tipi, aciklama')
    .eq('sicil_no', sicil_no)
    .order('yururluk_tarihi', { ascending: false })
    .order('kayit_zamani', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selErr) return { hata: selErr.message }
  if (!son)   return { hata: 'Personel hareket kaydı bulunamadı.' }

  const yeniAciklama = [
    son.aciklama ?? '',
    `Aktif Et: ${giris}${neden ? ' - ' + neden : ''}`,
  ].filter(Boolean).join(' | ')

  const { error: updErr } = await supabase
    .from('personel_hareketleri')
    .update({
      ayrilis_tarihi:     null,
      ayrilis_nedeni:     null,
      ise_baslama_tarihi: giris,
      hareket_tipi:       son.hareket_tipi ?? 'Göreve Başlama',
      aciklama:           yeniAciklama,
    })
    .eq('id', son.id)

  if (updErr) return { hata: updErr.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'personel',
    islem: 'Aktif Et',
    ozet: `Ayrılan personel aktif edildi (${giris}${neden ? ` - ${neden}` : ''}).`,
    ref_table: 'personel_hareketleri',
    ref_id: String(son.id),
    onceki: {
      aciklama: son.aciklama ?? null,
    },
    sonraki: {
      ayrilis_tarihi: null,
      ayrilis_nedeni: null,
      ise_baslama_tarihi: giris,
      hareket_tipi: son.hareket_tipi ?? 'Göreve Başlama',
      aciklama: yeniAciklama,
    },
  })

  // Ayrılanlar ve çalışan listeleri, hareketler vs. yenilensin
  revalidatePath('/personel/ayrilanlar')
  revalidatePath('/personel')
  revalidatePath('/personel-hareketleri')
  return {}
}

