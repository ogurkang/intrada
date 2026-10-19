'use server'

import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { epostaAyarHazirMi, fetchEpostaAyar } from '@/lib/eposta-ayar'
import { epostaImzaOlustur } from '@/lib/eposta-imza'
import { epostaAdresleri, epostaGonder } from '@/lib/eposta-gonder'
import { epostaKlasorListele, epostaMesajOku } from '@/lib/eposta-kutu'
import type { EpostaKutu, EpostaMesaj, EpostaOzet } from '@/lib/eposta-tipler'
import { EPOSTA_EK_LIMIT_BAYT, EPOSTA_EK_LIMIT_YAZI, epostaBoyutYazi } from '@/lib/eposta-limit'

async function yetki() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Bu kutu için yetki yok.' as const }
  const ayar = await fetchEpostaAyar(supabase)
  if (!epostaAyarHazirMi(ayar) || !ayar) return { hata: 'E-posta ayarı eksik. Tanımlar ekranından şifreyi kaydedip kutuyu açın.' as const }
  return { supabase, user, ayar }
}

function kutuMu(v: string): v is EpostaKutu {
  return v === 'gelen' || v === 'giden' || v === 'spam'
}

export async function epostaListeAction(kutu: string): Promise<{ satirlar?: EpostaOzet[]; hata?: string; klasorYok?: boolean }> {
  if (!kutuMu(kutu)) return { hata: 'Klasör yok.' }
  const g = await yetki()
  if ('hata' in g) return { hata: g.hata }
  return epostaKlasorListele(g.ayar, kutu)
}

export async function epostaOkuAction(kutu: string, uid: string): Promise<{ mesaj?: EpostaMesaj; hata?: string }> {
  if (!kutuMu(kutu)) return { hata: 'Klasör yok.' }
  const g = await yetki()
  if ('hata' in g) return { hata: g.hata }
  return epostaMesajOku(g.ayar, kutu, uid)
}

export async function epostaGonderAction(fd: FormData): Promise<{ ok?: true; hata?: string }> {
  const g = await yetki()
  if ('hata' in g) return { hata: g.hata }

  const kime = epostaAdresleri(String(fd.get('kime') ?? ''))
  if (kime.hata) return { hata: kime.hata }
  if (!kime.adresler.length) return { hata: 'En az bir alıcı yazın.' }
  const bilgi = epostaAdresleri(String(fd.get('bilgi') ?? ''))
  if (bilgi.hata) return { hata: bilgi.hata }
  const gizli = epostaAdresleri(String(fd.get('gizli') ?? ''))
  if (gizli.hata) return { hata: gizli.hata }

  const konu = String(fd.get('konu') ?? '').trim()
  const metin = String(fd.get('metin') ?? '').replace(/\r\n/g, '\n')
  const alinti = String(fd.get('alinti') ?? '').replace(/\r\n/g, '\n').trim()
  const mod = String(fd.get('mod') ?? 'yeni')
  if (mod === 'yeni' && !metin.trim()) return { hata: 'Mektup metni boş olamaz.' }
  if (!konu) return { hata: 'Konu boş olamaz.' }

  const yollar = fd.getAll('ek_yol').map(v => String(v))
  const adlar = fd.getAll('ek_ad').map(v => String(v))
  if (yollar.length !== adlar.length) return { hata: 'Ek listesi bozuk.' }
  const onek = `${g.user.id}/`
  if (yollar.some(yol => !yol.startsWith(onek) || yol.includes('..'))) return { hata: 'Ek yolu geçersiz.' }

  const ekler: { ad: string; icerik: Buffer }[] = []
  try {
    for (let i = 0; i < yollar.length; i++) {
      const { data, error } = await g.supabase.storage.from('eposta-ek').download(yollar[i])
      if (error || !data) return { hata: 'Ek okunamadı. E-posta ek kovası için SQL henüz çalışmamış olabilir.' }
      ekler.push({ ad: adlar[i] || 'ek', icerik: Buffer.from(await data.arrayBuffer()) })
    }
    const toplam = ekler.reduce((s, e) => s + e.icerik.length, 0)
    if (toplam > EPOSTA_EK_LIMIT_BAYT) {
      return { hata: `Ekler ${epostaBoyutYazi(toplam)}. Sınır ${EPOSTA_EK_LIMIT_YAZI}. Daha küçük dosya seçin veya bazı ekleri çıkarın.` }
    }

    const imza = await epostaImzaOlustur(g.supabase, g.user.id, g.ayar.imza_metin)
    const govde = [metin.trim(), imza.metin, alinti].filter(Boolean).join('\n\n')
    return await epostaGonder({
    ayar: g.ayar,
    kime: kime.adresler,
    bilgi: bilgi.adresler,
    gizli: gizli.adresler,
    konu,
    metin: govde,
    ekler,
      inReplyTo: String(fd.get('messageId') ?? '').trim() || undefined,
      references: String(fd.get('messageId') ?? '').trim() || undefined,
    })
  } finally {
    if (yollar.length) await g.supabase.storage.from('eposta-ek').remove(yollar)
  }
}

export async function epostaEkAdresiAction(
  dosyaAdi: string,
  boyut: number,
): Promise<{ path?: string; token?: string; hata?: string }> {
  const g = await yetki()
  if ('hata' in g) return { hata: g.hata }
  if (!(boyut > 0)) return { hata: 'Dosya seçin.' }
  if (boyut > EPOSTA_EK_LIMIT_BAYT) {
    return { hata: `Ek ${epostaBoyutYazi(boyut)}. Sınır ${EPOSTA_EK_LIMIT_YAZI}.` }
  }
  const ad = String(dosyaAdi || 'ek').replace(/[\\/]/g, '_').slice(0, 120)
  const yol = `${g.user.id}/${crypto.randomUUID()}/${ad}`
  const { data, error } = await g.supabase.storage.from('eposta-ek').createSignedUploadUrl(yol)
  if (error || !data) return { hata: error?.message ?? 'Yükleme adresi oluşturulamadı.' }
  return { path: data.path, token: data.token }
}
