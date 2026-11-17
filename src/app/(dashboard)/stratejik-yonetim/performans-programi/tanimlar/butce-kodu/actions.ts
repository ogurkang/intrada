'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function txt(v: FormDataEntryValue | null): string {
  return String(v ?? '').trim()
}

function kodParca(v: FormDataEntryValue | null): string {
  const s = txt(v).replace(/[^\d]/g, '')
  return s.padStart(2, '0').slice(0, 2)
}

type Sb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (t: string) => any
}

function satirOzet(yil: unknown, mudurluk: unknown, ad?: string | null): string {
  const parcalar = [
    ad?.trim() || null,
    yil != null && yil !== '' ? String(yil) : null,
    mudurluk != null && String(mudurluk).trim() ? String(mudurluk).trim() : null,
  ].filter(Boolean)
  return parcalar.join(' · ') || 'kayıt'
}

async function butceKoduKullanimYerleri(sb: Sb, id: number): Promise<string[]> {
  const yerler: string[] = []
  const limit = 8

  const { data: fb, error: fbHata } = await sb
    .from('performans_programi_faaliyet_butce')
    .select('faaliyet_id, yil, mudurluk')
    .eq('butce_kodu_id', id)
    .limit(limit)
  if (!fbHata && (fb?.length ?? 0) > 0) {
    const ids = [...new Set((fb as { faaliyet_id: number }[]).map(r => Number(r.faaliyet_id)).filter(Number.isFinite))]
    const adMap = new Map<number, string>()
    if (ids.length) {
      const { data: adlar } = await sb.from('performans_programi_faaliyet').select('id, faaliyet_adi').in('id', ids)
      for (const a of adlar ?? []) adMap.set(Number(a.id), String(a.faaliyet_adi ?? ''))
    }
    for (const r of fb as { faaliyet_id: number; yil: number; mudurluk: string }[]) {
      yerler.push(`Faaliyet maliyeti / bütçe girişi: ${satirOzet(r.yil, r.mudurluk, adMap.get(Number(r.faaliyet_id)))}`)
    }
    if ((fb as unknown[]).length >= limit) yerler.push('Faaliyet maliyeti / bütçe girişi: … diğer kayıtlar')
  }

  const { data: ob, error: obHata } = await sb
    .from('performans_programi_ozel_faaliyet_butce')
    .select('ozel_faaliyet_id, yil, mudurluk')
    .eq('butce_kodu_id', id)
    .limit(limit)
  if (!obHata && (ob?.length ?? 0) > 0) {
    const ids = [...new Set((ob as { ozel_faaliyet_id: number }[]).map(r => Number(r.ozel_faaliyet_id)).filter(Number.isFinite))]
    const adMap = new Map<number, string>()
    if (ids.length) {
      const { data: adlar } = await sb.from('performans_programi_ozel_faaliyet').select('id, faaliyet_adi').in('id', ids)
      for (const a of adlar ?? []) adMap.set(Number(a.id), String(a.faaliyet_adi ?? ''))
    }
    for (const r of ob as { ozel_faaliyet_id: number; yil: number; mudurluk: string }[]) {
      yerler.push(`Özel faaliyet maliyeti: ${satirOzet(r.yil, r.mudurluk, adMap.get(Number(r.ozel_faaliyet_id)))}`)
    }
    if ((ob as unknown[]).length >= limit) yerler.push('Özel faaliyet maliyeti: … diğer kayıtlar')
  }

  const { data: fo, error: foHata } = await sb
    .from('performans_programi_faaliyet_odenek')
    .select('faaliyet_id, yil, mudurluk')
    .eq('butce_kodu_id', id)
    .limit(limit)
  if (!foHata && (fo?.length ?? 0) > 0) {
    const ids = [...new Set((fo as { faaliyet_id: number }[]).map(r => Number(r.faaliyet_id)).filter(Number.isFinite))]
    const adMap = new Map<number, string>()
    if (ids.length) {
      const { data: adlar } = await sb.from('performans_programi_faaliyet').select('id, faaliyet_adi').in('id', ids)
      for (const a of adlar ?? []) adMap.set(Number(a.id), String(a.faaliyet_adi ?? ''))
    }
    for (const r of fo as { faaliyet_id: number; yil: number; mudurluk: string }[]) {
      yerler.push(`Faaliyet ödenek kaydı: ${satirOzet(r.yil, r.mudurluk, adMap.get(Number(r.faaliyet_id)))}`)
    }
    if ((fo as unknown[]).length >= limit) yerler.push('Faaliyet ödenek kaydı: … diğer kayıtlar')
  }

  const { data: pf, error: pfHata } = await sb
    .from('performans_programi_pf_odenek')
    .select('pf_faaliyet_id')
    .eq('butce_kodu_id', id)
    .limit(limit)
  if (!pfHata && (pf?.length ?? 0) > 0) {
    const ids = [...new Set((pf as { pf_faaliyet_id: number }[]).map(r => Number(r.pf_faaliyet_id)).filter(Number.isFinite))]
    const adMap = new Map<number, string>()
    if (ids.length) {
      const { data: adlar } = await sb.from('performans_programi_pf_faaliyet').select('id, faaliyet_adi').in('id', ids)
      for (const a of adlar ?? []) adMap.set(Number(a.id), String(a.faaliyet_adi ?? ''))
    }
    for (const fid of ids) {
      yerler.push(`Performans faaliyeti ödenek teklifi: ${adMap.get(fid) || `#${fid}`}`)
    }
    if ((pf as unknown[]).length >= limit) yerler.push('Performans faaliyeti ödenek teklifi: … diğer kayıtlar')
  }

  const { data: mm, error: mmHata } = await sb.from('hesaplama_memur_maas').select('belge').eq('id', 1).maybeSingle()
  if (!mmHata && mm?.belge && typeof mm.belge === 'object') {
    const satirlar = (mm.belge as { satirlar?: Record<string, unknown> }).satirlar
    if (satirlar && typeof satirlar === 'object') {
      const anahtar = `||${id}`
      const eslesen = Object.keys(satirlar).filter(k => k.endsWith(anahtar))
      if (eslesen.length) {
        const ornek = eslesen.slice(0, 3).map(k => {
          const [mud, unvan] = k.split('||')
          return [mud, unvan].filter(Boolean).join(' / ')
        })
        yerler.push(
          `Memur Maaş Hesaplama: ${ornek.join('; ')}${eslesen.length > 3 ? ` (+${eslesen.length - 3})` : ''}`,
        )
      }
    }
  }

  return yerler
}

export async function butceKoduEkle(fd: FormData): Promise<{ hata?: string }> {
  const adim_1 = kodParca(fd.get('adim_1'))
  const adim_2 = kodParca(fd.get('adim_2'))
  const adim_3 = kodParca(fd.get('adim_3'))
  const adim_4 = kodParca(fd.get('adim_4'))
  const hesap_adi = txt(fd.get('hesap_adi'))
  if (!adim_1 || !adim_2 || !adim_3 || !adim_4 || !hesap_adi) {
    return { hata: 'Adım 1-4 ve Hesap Adı zorunludur.' }
  }
  const ekonomik_kod = `${adim_1}.${adim_2}.${adim_3}.${adim_4}`

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_butce_kodu').insert({
    adim_1,
    adim_2,
    adim_3,
    adim_4,
    hesap_adi,
    ekonomik_kod,
    aktif: true,
  })
  if (error) return { hata: error.message }

  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar')
  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar/butce-kodu')
  return {}
}

export async function butceKoduGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const adim_1 = kodParca(fd.get('adim_1'))
  const adim_2 = kodParca(fd.get('adim_2'))
  const adim_3 = kodParca(fd.get('adim_3'))
  const adim_4 = kodParca(fd.get('adim_4'))
  const hesap_adi = txt(fd.get('hesap_adi'))
  if (!Number.isFinite(id)) return { hata: 'Geçersiz kayıt.' }
  if (!adim_1 || !adim_2 || !adim_3 || !adim_4 || !hesap_adi) {
    return { hata: 'Adım 1-4 ve Hesap Adı zorunludur.' }
  }
  const ekonomik_kod = `${adim_1}.${adim_2}.${adim_3}.${adim_4}`

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb
    .from('performans_programi_butce_kodu')
    .update({ adim_1, adim_2, adim_3, adim_4, hesap_adi, ekonomik_kod })
    .eq('id', id)
  if (error) return { hata: error.message }

  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar')
  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar/butce-kodu')
  return {}
}

export async function butceKoduSil(id: number): Promise<{ hata?: string; kullanim?: string[] }> {
  if (!Number.isFinite(id)) return { hata: 'Geçersiz kayıt.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const kullanim = await butceKoduKullanimYerleri(sb, id)
  if (kullanim.length) {
    return {
      hata: 'Bu ödenek kullanıldığı için silinemez.',
      kullanim,
    }
  }

  const { error } = await sb.from('performans_programi_butce_kodu').delete().eq('id', id)
  if (error) {
    const mesaj = String(error.message ?? '')
    if (/foreign key|violates|restrict|referenced/i.test(mesaj)) {
      return {
        hata: 'Bu ödenek başka kayıtlarda kullanıldığı için silinemez.',
        kullanim: ['Bağlı kayıt bulundu (ayrıntı alınamadı).'],
      }
    }
    return { hata: mesaj }
  }

  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar')
  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar/butce-kodu')
  return {}
}
