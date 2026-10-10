'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { anketKodUret, anketSoruDogrula, type AnketSoruGirdi } from '@/lib/anket'
import { anketDemografiEksikler, anketDemografiSorulariOlustur } from '@/lib/anket-demografi-sablon'

type Sb = {
  from: (tablo: string) => {
    select: (kolon: string) => Sorgu
    insert: (satir: Record<string, unknown> | Record<string, unknown>[]) => Sorgu
    update: (satir: Record<string, unknown>) => Sorgu
    delete: () => Sorgu
  }
}

type Sorgu = Promise<{ data: unknown; error: { message: string } | null }> & {
  select: (kolon: string) => Sorgu
  eq: (kolon: string, deger: unknown) => Sorgu
  in: (kolon: string, deger: unknown[]) => Sorgu
  order: (kolon: string, opt?: { ascending: boolean }) => Sorgu
  limit: (n: number) => Sorgu
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
  single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
}

async function baglam(): Promise<
  { hata: string } | { sb: Sb; userId: string; yapanAd: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Bu işlem yalnızca yönetici hesaplarındadır.' }
  const { data: profil } = await supabase
    .from('app_profiles')
    .select('ad_soyad, kullanici_adi')
    .eq('id', user.id)
    .maybeSingle()
  const yapanAd = (profil?.ad_soyad || profil?.kullanici_adi || user.email || 'Yönetici').trim()
  return { sb: supabase as unknown as Sb, userId: user.id, yapanAd }
}

function tabloYok(mesaj: string): boolean {
  return mesaj.includes('anket') && (mesaj.includes('schema cache') || mesaj.includes('does not exist'))
}

async function logYaz(
  sb: Sb,
  satir: { anket_id: string; soru_id?: string | null; islem: string; ozet: string; yapan_id: string; yapan_ad: string },
) {
  await sb.from('anket_log').insert({
    anket_id: satir.anket_id,
    soru_id: satir.soru_id ?? null,
    islem: satir.islem,
    ozet: satir.ozet,
    yapan_id: satir.yapan_id,
    yapan_ad: satir.yapan_ad,
  })
}

function tazele(anketId?: string) {
  revalidatePath('/anket-yonetimi/anketler')
  revalidatePath('/anket-yonetimi/raporlar')
  if (anketId) {
    revalidatePath(`/anket-yonetimi/anketler/${anketId}`)
    revalidatePath(`/anket-yonetimi/raporlar/${anketId}`)
  }
}

async function benzersizKod(sb: Sb): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const kod = anketKodUret()
    const { data } = await sb.from('anketler').select('id').eq('kod', kod).maybeSingle()
    if (!data) return kod
  }
  return anketKodUret() + anketKodUret().slice(0, 2)
}

export async function anketOlustur(girdi: {
  baslik: string
  aciklama: string
  sorular: AnketSoruGirdi[]
}): Promise<{ hata?: string; id?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const baslik = girdi.baslik.trim()
  const aciklama = girdi.aciklama.trim()
  if (baslik.length < 3) return { hata: 'Anket adı en az 3 karakter olmalı.' }
  if (baslik.length > 160) return { hata: 'Anket adı 160 karakteri geçemez.' }
  if (aciklama.length > 1000) return { hata: 'Açıklama 1000 karakteri geçemez.' }
  if (girdi.sorular.length < 1) return { hata: 'En az bir soru ekleyin.' }
  if (girdi.sorular.length > 40) return { hata: 'Bir ankette en fazla 40 soru olur.' }
  const sorular = []
  for (const ham of girdi.sorular) {
    const dogru = anketSoruDogrula(ham)
    if ('hata' in dogru) return { hata: dogru.hata }
    sorular.push(dogru)
  }
  const kod = await benzersizKod(ot.sb)
  const { data, error } = await ot.sb
    .from('anketler')
    .insert({ baslik, aciklama, kod, durum: 'durduruldu' })
    .select('id')
    .single()
  if (error || !data) {
    return { hata: error && tabloYok(error.message) ? 'Anket tabloları henüz yok. Migration çalıştırılmalı.' : (error?.message ?? 'Anket kaydı açılamadı.') }
  }
  const anketId = String(data.id)
  for (let i = 0; i < sorular.length; i += 1) {
    const soru = sorular[i]
    const { error: se } = await ot.sb.from('anket_sorulari').insert({
      anket_id: anketId,
      sira: i + 1,
      metin: soru.metin,
      tip: soru.tip,
      secenekler: soru.secenekler,
    })
    if (se) {
      await ot.sb.from('anketler').delete().eq('id', anketId)
      return { hata: se.message }
    }
  }
  await logYaz(ot.sb, {
    anket_id: anketId,
    islem: 'olusturuldu',
    ozet: `${baslik} oluşturuldu. ${sorular.length} soru eklendi. Durum: Durduruldu.`,
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return { id: anketId }
}

export async function anketBaslikGuncelle(
  anketId: string,
  baslikHam: string,
  aciklamaHam: string,
): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const baslik = baslikHam.trim()
  const aciklama = aciklamaHam.trim()
  if (baslik.length < 3) return { hata: 'Anket adı en az 3 karakter olmalı.' }
  if (baslik.length > 160) return { hata: 'Anket adı 160 karakteri geçemez.' }
  if (aciklama.length > 1000) return { hata: 'Açıklama 1000 karakteri geçemez.' }
  const { error } = await ot.sb
    .from('anketler')
    .update({ baslik, aciklama, updated_at: new Date().toISOString() })
    .eq('id', anketId)
  if (error) return { hata: error.message }
  await logYaz(ot.sb, {
    anket_id: anketId,
    islem: 'baslik_duzenlendi',
    ozet: `Başlık «${baslik}» olarak düzenlendi.`,
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export async function anketYayinDegistir(anketId: string, yayinla: boolean): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  if (yayinla) {
    const { data } = await ot.sb.from('anket_sorulari').select('id').eq('anket_id', anketId).limit(1).maybeSingle()
    if (!data) return { hata: 'Sorusu olmayan anket yayınlanamaz.' }
  }
  const durum = yayinla ? 'yayinda' : 'durduruldu'
  const { error } = await ot.sb
    .from('anketler')
    .update({ durum, updated_at: new Date().toISOString() })
    .eq('id', anketId)
  if (error) return { hata: error.message }
  await logYaz(ot.sb, {
    anket_id: anketId,
    islem: yayinla ? 'yayinlandi' : 'durduruldu',
    ozet: yayinla ? 'Anket yayına alındı. Link cevap kabul eder.' : 'Yayın kaldırıldı. Link yeni cevap almaz.',
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export async function anketDemografiSorulariEkle(anketId: string): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const [statuSorgu, ogrenimSorgu, mevcutSorgu] = await Promise.all([
    ot.sb.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    ot.sb.from('tanim_ogrenim').select('isim').eq('aktif', true),
    ot.sb.from('anket_sorulari').select('metin, sira').eq('anket_id', anketId).order('sira', { ascending: false }).limit(40),
  ])
  if (statuSorgu.error || ogrenimSorgu.error || mevcutSorgu.error) {
    return { hata: statuSorgu.error?.message ?? ogrenimSorgu.error?.message ?? mevcutSorgu.error?.message ?? 'Tanımlar okunamadı.' }
  }
  const mevcut = (mevcutSorgu.data as { metin: string; sira: number }[] | null) ?? []
  const eklenecek = anketDemografiEksikler(
    anketDemografiSorulariOlustur({
      statuler: (statuSorgu.data as { statu_adi: string; sira_no: number | null }[] | null) ?? [],
      ogrenimler: ((ogrenimSorgu.data as { isim: string }[] | null) ?? []).map(o => o.isim),
    }),
    mevcut.map(s => s.metin),
  )
  if (eklenecek.length === 0) return { hata: 'Bu demografik sorular ankette zaten var.' }
  if (mevcut.length + eklenecek.length > 40) return { hata: 'Bir ankette en fazla 40 soru olur.' }
  let sira = mevcut.reduce((m, s) => Math.max(m, Number(s.sira) || 0), 0)
  for (const soru of eklenecek) {
    sira += 1
    const dogru = anketSoruDogrula(soru)
    if ('hata' in dogru) return { hata: dogru.hata }
    const { data, error } = await ot.sb
      .from('anket_sorulari')
      .insert({
        anket_id: anketId,
        sira,
        metin: dogru.metin,
        tip: dogru.tip,
        secenekler: dogru.secenekler,
      })
      .select('id')
      .single()
    if (error || !data) return { hata: error?.message ?? 'Demografik soru eklenemedi.' }
    await logYaz(ot.sb, {
      anket_id: anketId,
      soru_id: String(data.id),
      islem: 'soru_eklendi',
      ozet: `Sıra ${sira}: ${dogru.metin}`,
      yapan_id: ot.userId,
      yapan_ad: ot.yapanAd,
    })
  }
  await ot.sb.from('anketler').update({ updated_at: new Date().toISOString() }).eq('id', anketId)
  tazele(anketId)
  return {}
}

export async function anketSoruEkle(anketId: string, girdi: AnketSoruGirdi): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const dogru = anketSoruDogrula(girdi)
  if ('hata' in dogru) return { hata: dogru.hata }
  const { data: mevcut } = await ot.sb
    .from('anket_sorulari')
    .select('sira')
    .eq('anket_id', anketId)
    .order('sira', { ascending: false })
    .limit(40)
  const liste = (mevcut as { sira?: number }[] | null) ?? []
  if (liste.length >= 40) return { hata: 'Bir ankette en fazla 40 soru olur.' }
  const sira = liste.reduce((m, s) => Math.max(m, Number(s.sira) || 0), 0) + 1
  const { data, error } = await ot.sb
    .from('anket_sorulari')
    .insert({
      anket_id: anketId,
      sira,
      metin: dogru.metin,
      tip: dogru.tip,
      secenekler: dogru.secenekler,
    })
    .select('id')
    .single()
  if (error || !data) return { hata: error?.message ?? 'Soru eklenemedi.' }
  await ot.sb.from('anketler').update({ updated_at: new Date().toISOString() }).eq('id', anketId)
  await logYaz(ot.sb, {
    anket_id: anketId,
    soru_id: String(data.id),
    islem: 'soru_eklendi',
    ozet: `Sıra ${sira}: ${dogru.metin}`,
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export async function anketSoruGuncelle(
  anketId: string,
  soruId: string,
  girdi: AnketSoruGirdi,
): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const dogru = anketSoruDogrula(girdi)
  if ('hata' in dogru) return { hata: dogru.hata }
  const { data: soru } = await ot.sb.from('anket_sorulari').select('sira').eq('id', soruId).maybeSingle()
  const { error } = await ot.sb
    .from('anket_sorulari')
    .update({
      metin: dogru.metin,
      tip: dogru.tip,
      secenekler: dogru.secenekler,
      updated_at: new Date().toISOString(),
    })
    .eq('id', soruId)
    .eq('anket_id', anketId)
  if (error) return { hata: error.message }
  await ot.sb.from('anketler').update({ updated_at: new Date().toISOString() }).eq('id', anketId)
  await logYaz(ot.sb, {
    anket_id: anketId,
    soru_id: soruId,
    islem: 'soru_duzenlendi',
    ozet: `Sıra ${soru?.sira ?? '—'}: ${dogru.metin}`,
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export async function anketSorulariTopluSil(anketId: string, soruIdler: string[]): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const idler = [...new Set(soruIdler.map(id => id.trim()).filter(Boolean))]
  if (idler.length === 0) return { hata: 'Silinecek soru seçin.' }
  const { data: hepsi } = await ot.sb.from('anket_sorulari').select('id, metin').eq('anket_id', anketId)
  const kayitlar = ((hepsi as { id: string; metin: string }[] | null) ?? [])
  const silinen = kayitlar.filter(s => idler.includes(String(s.id)))
  if (silinen.length === 0) return { hata: 'Silinecek soru bulunamadı.' }
  const { error } = await ot.sb.from('anket_sorulari').delete().in('id', silinen.map(s => s.id)).eq('anket_id', anketId)
  if (error) return { hata: error.message }
  const { data: kalan } = await ot.sb.from('anket_sorulari').select('id, sira').eq('anket_id', anketId).order('sira')
  const satirlar = ((kalan as { id: string; sira: number }[] | null) ?? []).slice().sort((a, b) => a.sira - b.sira)
  for (let i = 0; i < satirlar.length; i += 1) {
    if (satirlar[i].sira === i + 1) continue
    await ot.sb.from('anket_sorulari').update({ sira: i + 1 }).eq('id', satirlar[i].id)
  }
  await ot.sb.from('anketler').update({ updated_at: new Date().toISOString() }).eq('id', anketId)
  const ornek = silinen.slice(0, 3).map(s => s.metin).join(' · ')
  await logYaz(ot.sb, {
    anket_id: anketId,
    islem: 'soru_silindi',
    ozet: `${silinen.length} soru silindi. ${ornek}`.trim(),
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export async function anketSoruSil(anketId: string, soruId: string): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const { data: soru } = await ot.sb.from('anket_sorulari').select('sira, metin').eq('id', soruId).maybeSingle()
  const { error } = await ot.sb.from('anket_sorulari').delete().eq('id', soruId).eq('anket_id', anketId)
  if (error) return { hata: error.message }
  const { data: kalan } = await ot.sb.from('anket_sorulari').select('id, sira').eq('anket_id', anketId).order('sira')
  const satirlar = ((kalan as { id: string; sira: number }[] | null) ?? []).slice().sort((a, b) => a.sira - b.sira)
  for (let i = 0; i < satirlar.length; i += 1) {
    if (satirlar[i].sira === i + 1) continue
    await ot.sb.from('anket_sorulari').update({ sira: i + 1 }).eq('id', satirlar[i].id)
  }
  await ot.sb.from('anketler').update({ updated_at: new Date().toISOString() }).eq('id', anketId)
  await logYaz(ot.sb, {
    anket_id: anketId,
    islem: 'soru_silindi',
    ozet: `Sıra ${soru?.sira ?? '—'} silindi: ${soru?.metin ?? ''}`.trim(),
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export async function anketSoruTasi(
  anketId: string,
  soruId: string,
  yon: 'yukari' | 'asagi',
): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const { data: liste } = await ot.sb.from('anket_sorulari').select('id, sira, metin').eq('anket_id', anketId).order('sira')
  const satirlar = ((liste as { id: string; sira: number; metin: string }[] | null) ?? []).slice().sort((a, b) => a.sira - b.sira)
  const indeks = satirlar.findIndex(s => s.id === soruId)
  const komsu = yon === 'yukari' ? indeks - 1 : indeks + 1
  if (indeks < 0 || komsu < 0 || komsu >= satirlar.length) return {}
  const a = satirlar[indeks]
  const b = satirlar[komsu]
  const simdi = new Date().toISOString()
  const gecici = 1_000_000 + a.sira
  const bir = await ot.sb.from('anket_sorulari').update({ sira: gecici, updated_at: simdi }).eq('id', a.id)
  if (bir.error) return { hata: bir.error.message }
  const iki = await ot.sb.from('anket_sorulari').update({ sira: a.sira, updated_at: simdi }).eq('id', b.id)
  if (iki.error) return { hata: iki.error.message }
  const uc = await ot.sb.from('anket_sorulari').update({ sira: b.sira, updated_at: simdi }).eq('id', a.id)
  if (uc.error) return { hata: uc.error.message }
  await logYaz(ot.sb, {
    anket_id: anketId,
    soru_id: soruId,
    islem: 'soru_tasindi',
    ozet: `«${a.metin}» sırası ${a.sira} → ${b.sira}.`,
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export async function anketSifirla(anketId: string): Promise<{ hata?: string }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata }
  const { error } = await ot.sb.from('anket_katilim').delete().eq('anket_id', anketId)
  if (error) return { hata: error.message }
  await ot.sb.from('anketler').update({ updated_at: new Date().toISOString() }).eq('id', anketId)
  await logYaz(ot.sb, {
    anket_id: anketId,
    islem: 'sifirlandi',
    ozet: 'Anket cevapları silindi. Sorular ve anket adı duruyor.',
    yapan_id: ot.userId,
    yapan_ad: ot.yapanAd,
  })
  tazele(anketId)
  return {}
}

export type AnketLogSatir = {
  id: string
  soru_id: string | null
  islem: string
  ozet: string
  yapan_ad: string
  created_at: string
}

export async function anketLogGetir(anketId: string): Promise<{ hata?: string; satirlar: AnketLogSatir[] }> {
  const ot = await baglam()
  if ('hata' in ot) return { hata: ot.hata, satirlar: [] }
  const { data, error } = await ot.sb
    .from('anket_log')
    .select('id, soru_id, islem, ozet, yapan_ad, created_at')
    .eq('anket_id', anketId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return { hata: error.message, satirlar: [] }
  const satirlar = ((data as AnketLogSatir[] | null) ?? []).map(s => ({
    id: String(s.id),
    soru_id: s.soru_id ? String(s.soru_id) : null,
    islem: String(s.islem),
    ozet: String(s.ozet ?? ''),
    yapan_ad: String(s.yapan_ad ?? ''),
    created_at: String(s.created_at),
  }))
  return { satirlar }
}
