import type { SupabaseClient } from '@supabase/supabase-js'
import { trNormalize } from '@/lib/turkce-search'
import {
  type AsistanMesaj,
  type PersonelAday,
  type PersonelKonu,
  adaylariNetlestir,
  konuBul,
  mesajBuKisiMi,
  olasiAramaTerimleri,
  personelAdaylariBul,
  secimListesiMetni,
  secimdenSicilBul,
  sonSecimListesi,
} from '@/lib/intrada-asistan-veri'

const KANLAR: { etiket: string; izler: string[] }[] = [
  { etiket: 'AB Rh-', izler: ['ab rh-', 'ab-', 'ab rh negatif'] },
  { etiket: 'AB Rh+', izler: ['ab rh+', 'ab+', 'ab rh pozitif'] },
  { etiket: 'A Rh-', izler: ['a rh-', 'a-', 'a rh negatif'] },
  { etiket: 'A Rh+', izler: ['a rh+', 'a+', 'a rh pozitif'] },
  { etiket: 'B Rh-', izler: ['b rh-', 'b-', 'b rh negatif'] },
  { etiket: 'B Rh+', izler: ['b rh+', 'b+', 'b rh pozitif'] },
  { etiket: '0 Rh-', izler: ['0 rh-', '0-', 'o rh-', 'o-'] },
  { etiket: '0 Rh+', izler: ['0 rh+', '0+', 'o rh+', 'o+'] },
]

function seciliSatir(ad: string, sicil: string) {
  return `Seçili personel: ${ad} — sicil ${sicil}`
}

function seciliOku(metin: string): { ad: string; sicil: string } | null {
  const m = metin.match(/Seçili personel:\s*(.+?)\s+—\s+sicil\s+(\S+)/)
  if (!m) return null
  return { ad: m[1].trim(), sicil: m[2].replace(/[).,]+$/g, '') }
}

function sonAsistan(gecmis: AsistanMesaj[]): string {
  return [...gecmis].reverse().find(m => m.role === 'assistant')?.content ?? ''
}

function listeOncesiSoru(gecmis: AsistanMesaj[]): string {
  const idx = [...gecmis].reverse().findIndex(
    m => m.role === 'assistant' && /Hangisini kastediyorsunuz/i.test(m.content),
  )
  if (idx < 0) return ''
  const gercek = gecmis.length - 1 - idx
  for (let i = gercek - 1; i >= 0; i--) {
    if (gecmis[i].role === 'user') return gecmis[i].content
  }
  return ''
}

export function kullanimCevabi(mesaj: string): string | null {
  const n = trNormalize(mesaj)
  if (/izin/.test(n) && /iptal/.test(n)) {
    return [
      'İzin kaydını iptal etmek için İzin Yönetimi → İzin Hareketleri ekranını açın (/izin).',
      'İlgili satırdaki kalem ile kaydı açın. Durum alanını İptal Edildi yapıp Kaydet deyin.',
      'Formun altındaki İptal düğmesi kaydı silmez; kaydetmeden listeye döner.',
      'İptal Edildi durumundaki gün, kalan izinden düşülmez.',
    ].join('\n')
  }
  if (/mudurl/.test(n) && /iptal|kaldir|bosalt|degis|cikar|sil/.test(n)) {
    return [
      'Personelin müdürlüğü Kadro Hareketleri ekranından değişir (/kadro).',
      'Kişinin dolu kadro satırını açıp kalem ile düzenleyin.',
      'Görev Müdürlüğü fiili birimdir; alanı başka müdürlük yapın veya boşaltıp kaydedin.',
      'Kadro Müdürlüğü kadronun bağlı olduğu birimdir; o da aynı ekrandadır.',
      'Görevden ayrılış için aynı kayıtta ayrılış tarihi ve ayrılış nedeni girilir.',
    ].join('\n')
  }
  return null
}

export function kanGrubuRaporCevabi(mesaj: string): string | null {
  const n = trNormalize(mesaj)
  if (!n.includes('kan')) return null
  const liste = /olan|liste|lazim|personel|kimler|rapor|bilgi/.test(n)
  const isimler = olasiAramaTerimleri(mesaj).filter(t => !/kan|grup|rh/.test(trNormalize(t)))
  if (isimler.length > 0 && !liste) return null
  if (!liste) return null
  const grup = KANLAR.find(k => k.izler.some(iz => n.includes(iz)))
  if (grup) {
    const k = encodeURIComponent(grup.etiket)
    return [
      `${grup.etiket} personel için hazır liste var.`,
      'Rapor Yönetimi → Kan Grubuna Göre Personel Listesi.',
      `Doğrudan süzülmüş liste: /rapor/kan-grubuna-gore-personel-liste?k=${k}`,
      'Ekranda Kan Grubu düğmesinden grubu işaretleyip Uygula deyin. Excel İndir, ekranda görünen süzgeci indirir.',
    ].join('\n')
  }
  return [
    'Kan grubuna göre liste: Rapor Yönetimi → Kan Grubuna Göre Personel Listesi (/rapor/kan-grubuna-gore-personel-liste).',
    'Sağdaki Kan Grubu düğmesinden grubu işaretleyip Uygula deyin. Excel İndir aynı süzgeci indirir.',
  ].join('\n')
}

async function bilgiMetni(
  supabase: SupabaseClient,
  sicil: string,
  ad: string,
  konu: Exclude<PersonelKonu, 'yok' | 'izin_belirsiz'>,
  yil: number,
): Promise<string> {
  const [{ data: calisan }, { data: ozet }, { data: hak }] = await Promise.all([
    supabase.from('calisan').select('ad_soyad, kan_grubu').eq('sicil_no', sicil).maybeSingle(),
    supabase
      .from('personel_kadro_ozet')
      .select('gorev_mudurlugu, kadro_mudurlugu, gorev_unvani')
      .eq('sicil_no', sicil)
      .maybeSingle(),
    supabase
      .from('izin_haklari')
      .select('kalan_gun, kullanilan_gun, hak_edilen_gun, devreden_gun')
      .eq('sicil_no', sicil)
      .eq('yil', yil)
      .maybeSingle(),
  ])
  const adSoyad = calisan?.ad_soyad ?? ad
  const satir = seciliSatir(adSoyad, sicil)
  if (konu === 'kan') {
    const kan = String(calisan?.kan_grubu ?? '').trim() || 'kayıtlı değil'
    return `${adSoyad} kan grubu: ${kan}.\n\n${satir}`
  }
  if (konu === 'mudurluk') {
    return [
      `${adSoyad}`,
      `Görev müdürlüğü: ${ozet?.gorev_mudurlugu?.trim() || '—'}`,
      `Kadro müdürlüğü: ${ozet?.kadro_mudurlugu?.trim() || '—'}`,
      `Görev unvanı: ${ozet?.gorev_unvani?.trim() || '—'}`,
      '',
      satir,
    ].join('\n')
  }
  if (konu === 'kalan_izin') {
    return [
      `${adSoyad} — ${yil} kalan izin: ${hak?.kalan_gun ?? 0} gün.`,
      `Devreden ${hak?.devreden_gun ?? 0}, hak edilen ${hak?.hak_edilen_gun ?? 0}, kullanılan ${hak?.kullanilan_gun ?? 0}.`,
      'Ayrıntı: /izin/haklar',
      '',
      satir,
    ].join('\n')
  }
  return [
    `${adSoyad} — ${yil} kullanılan izin: ${hak?.kullanilan_gun ?? 0} gün.`,
    `Kalan ${hak?.kalan_gun ?? 0} gün. Hareket dökümü: /izin`,
    '',
    satir,
  ].join('\n')
}

function niyetMetni(aday: PersonelAday) {
  const yer = [aday.gorev_mudurlugu, aday.gorev_unvani].filter(Boolean).join(', ')
  const ek = yer ? ` (${yer})` : ''
  return [
    `${aday.ad_soyad}${ek} seçildi.`,
    '',
    'Ne öğrenmek istiyorsunuz? Örneğin kalan izin, kullanılan izin, kan grubu veya müdürlük.',
    '',
    seciliSatir(aday.ad_soyad, aday.sicil_no),
  ].join('\n')
}

function izinAltMetni(ad: string, sicil: string) {
  return [`${ad} için kalan izin mi, kullanılan izin mi?`, '', seciliSatir(ad, sicil)].join('\n')
}

async function adaydanDevam(
  supabase: SupabaseClient,
  aday: PersonelAday,
  konu: PersonelKonu,
  yil: number,
): Promise<string> {
  if (konu === 'yok') return niyetMetni(aday)
  if (konu === 'izin_belirsiz') return izinAltMetni(aday.ad_soyad, aday.sicil_no)
  return bilgiMetni(supabase, aday.sicil_no, aday.ad_soyad, konu, yil)
}

async function adaGore(
  supabase: SupabaseClient,
  mesaj: string,
  konu: PersonelKonu,
  yil: number,
): Promise<string | null> {
  const eslesme = await personelAdaylariBul(supabase, mesaj)
  if (!eslesme) return null
  const adaylar = adaylariNetlestir(eslesme.adaylar)
  if (adaylar.length === 0) {
    return `"${eslesme.aranan}" ile eşleşen personel bulunamadı. Adın başka bir parçasını yazın veya /personel listesine bakın.`
  }
  if (adaylar.length > 1) return secimListesiMetni(adaylar, eslesme.aranan)
  return adaydanDevam(supabase, adaylar[0], konu, yil)
}

export async function adminKonusma(input: {
  supabase: SupabaseClient
  mesaj: string
  gecmis: AsistanMesaj[]
  yil: number
}): Promise<string | null> {
  const { supabase, mesaj, gecmis, yil } = input
  const son = sonAsistan(gecmis)

  if (/Hangisini kastediyorsunuz/i.test(son)) {
    const adaylar = sonSecimListesi(gecmis) ?? []
    const sicil = secimdenSicilBul(mesaj, adaylar)
    if (!sicil) return 'Listeden numara yazın veya kişinin adını netleştirin.'
    const aday = adaylar.find(a => a.sicil_no === sicil) ?? {
      sicil_no: sicil,
      ad_soyad: mesaj.trim(),
      skor: 100,
    }
    return adaydanDevam(supabase, aday, konuBul(listeOncesiSoru(gecmis)), yil)
  }

  const secili = seciliOku(son)
  if (secili && mesajBuKisiMi(mesaj, secili.ad)) {
    if (/Kalan izin mi/i.test(son)) {
      const n = trNormalize(mesaj)
      if (/kalan/.test(n)) return bilgiMetni(supabase, secili.sicil, secili.ad, 'kalan_izin', yil)
      if (/kullan/.test(n)) return bilgiMetni(supabase, secili.sicil, secili.ad, 'kullanilan_izin', yil)
      return izinAltMetni(secili.ad, secili.sicil)
    }
    const konu = konuBul(mesaj)
    if (konu === 'izin_belirsiz') return izinAltMetni(secili.ad, secili.sicil)
    if (konu !== 'yok') return bilgiMetni(supabase, secili.sicil, secili.ad, konu, yil)
    if (/Ne öğrenmek istiyorsunuz/i.test(son)) {
      return niyetMetni({ sicil_no: secili.sicil, ad_soyad: secili.ad, skor: 100 })
    }
  }

  const konu = konuBul(mesaj)
  const terimVar = olasiAramaTerimleri(mesaj).length > 0
  if (!terimVar) return null
  if (konu === 'yok' && /nasil|nerede|iptal|excel|menu|rapor/.test(trNormalize(mesaj))) return null
  return adaGore(supabase, mesaj, konu, yil)
}
