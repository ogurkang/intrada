/**
 * mesajpaketi.com SMS API entegrasyonu.
 * Doküman: https://www.mesajpaketi.com/api_dokuman.php
 *
 * Gönderim: POST {base}/api/mesaj_gonder  (form-urlencoded, data=<xml>)
 * Başarılı yanıt: "ID: 345678"  → mesajId
 * Hata: 01..10 kodları (bkz. SMS_HATA_KODLARI)
 */

export interface SmsAyarConfig {
  apiBaseUrl: string
  kullaniciAdi: string
  sifre: string
  originator: string
  turkceKarakter: boolean
}

export interface SmsGonderSonuc {
  ok: boolean
  mesajId?: string
  hataKodu?: string
  hata?: string
  ham?: string
}

export const SMS_HATA_KODLARI: Record<string, string> = {
  '01': 'Hatalı kullanıcı adı ya da şifre.',
  '02': 'Numara tanımlanmamış.',
  '03': 'Tanımsız action parametresi.',
  '04': 'Yetersiz kredi.',
  '05': 'XML düğümü eksik ya da hatalı.',
  '06': 'Tanımsız originator (gönderici başlığı).',
  '07': 'Mesaj kodu (ID) yok.',
  '09': 'Tarih alanları hatalı.',
  '10': 'SMS gönderilemedi.',
}

/** Türk GSM numarasını 10 haneye (5XXXXXXXXX) normalize eder; geçersizse null. */
export function gsmNormalize(raw: string | null | undefined): string | null {
  const sade = String(raw ?? '').replace(/\D+/g, '')
  if (!sade) return null
  let n = sade
  if (n.startsWith('0090')) n = n.slice(4)
  else if (n.startsWith('90') && n.length === 12) n = n.slice(2)
  else if (n.startsWith('0') && n.length === 11) n = n.slice(1)
  if (n.length === 10 && n.startsWith('5')) return n
  return null
}

/**
 * Doğum gününe göre zamanlama tarihi (SDate, biçim GGAAYYYYSSdd) üretir.
 * dogumTarihi: YYYY-MM-DD. Bugünse anında gönderim için boş sdate döner.
 * Geçmiş bir güne denk gelirse gelecek yıla planlanır.
 */
export function dogumGunuSDate(dogumTarihi: string, saat = '0900'): { sdate: string; bugun: boolean } | null {
  const mm = String(dogumTarihi ?? '').slice(5, 7)
  const dd = String(dogumTarihi ?? '').slice(8, 10)
  if (mm.length !== 2 || dd.length !== 2) return null
  const now = new Date()
  const ay = String(now.getMonth() + 1).padStart(2, '0')
  const gun = String(now.getDate()).padStart(2, '0')
  const bugunStr = `${now.getFullYear()}-${ay}-${gun}`
  let yil = now.getFullYear()
  const buYilStr = `${yil}-${mm}-${dd}`
  if (buYilStr === bugunStr) return { sdate: '', bugun: true }
  if (buYilStr < bugunStr) yil += 1
  return { sdate: `${dd}${mm}${yil}${saat}`, bugun: false }
}

/** XML değerini bozabilecek karakterleri kaçışlar. */
function xmlEscape(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Zamanlanmış gönderim için SDate; boş/undefined ise anında gönderilir. Biçim: GGAAYYYYSSdd */
function sdateNode(sdate?: string | null): string {
  return `<SDate>${xmlEscape(String(sdate ?? '').trim())}</SDate>`
}

function singleTextXml(cfg: SmsAyarConfig, mesaj: string, numaralar: string[], sdate?: string | null): string {
  const action = cfg.turkceKarakter ? 2 : 1
  return [
    '<SingleTextSMS>',
    `<UserName>${xmlEscape(cfg.kullaniciAdi)}</UserName>`,
    `<PassWord>${xmlEscape(cfg.sifre)}</PassWord>`,
    `<Action>${action}</Action>`,
    `<Mesgbody>${xmlEscape(mesaj)}</Mesgbody>`,
    `<Numbers>${numaralar.join(',')}</Numbers>`,
    `<Originator>${xmlEscape(cfg.originator)}</Originator>`,
    sdateNode(sdate),
    '</SingleTextSMS>',
  ].join('')
}

function multiTextXml(cfg: SmsAyarConfig, ciftler: { telefon: string; mesaj: string }[], sdate?: string | null): string {
  const action = cfg.turkceKarakter ? 22 : 11
  const mesajlar = ciftler
    .map(c => `<Message><Mesgbody>${xmlEscape(c.mesaj)}</Mesgbody><Number>${c.telefon}</Number></Message>`)
    .join('')
  return [
    '<MultiTextSMS>',
    `<UserName>${xmlEscape(cfg.kullaniciAdi)}</UserName>`,
    `<PassWord>${xmlEscape(cfg.sifre)}</PassWord>`,
    `<Action>${action}</Action>`,
    `<Messages>${mesajlar}</Messages>`,
    `<Originator>${xmlEscape(cfg.originator)}</Originator>`,
    sdateNode(sdate),
    '</MultiTextSMS>',
  ].join('')
}

function yanitYorumla(text: string): SmsGonderSonuc {
  const ham = String(text ?? '').trim()
  const idMatch = ham.match(/ID\s*:\s*(\d+)/i)
  if (idMatch) {
    return { ok: true, mesajId: idMatch[1], ham }
  }
  const koduMatch = ham.match(/\b(0[1-9]|10)\b/)
  if (koduMatch) {
    const kod = koduMatch[1]
    return { ok: false, hataKodu: kod, hata: SMS_HATA_KODLARI[kod] ?? `Sağlayıcı hata kodu: ${kod}`, ham }
  }
  return { ok: false, hata: ham ? `Beklenmeyen yanıt: ${ham}` : 'Sağlayıcıdan boş yanıt alındı.', ham }
}

async function xmlPost(cfg: SmsAyarConfig, path: string, xml: string): Promise<string> {
  const base = cfg.apiBaseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(xml)}`,
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Sağlayıcı HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return text
}

/** Aynı mesajı bir veya birden çok normalize edilmiş numaraya gönderir. */
export async function smsGonderTekMetin(
  cfg: SmsAyarConfig,
  mesaj: string,
  numaralar: string[],
  sdate?: string | null,
): Promise<SmsGonderSonuc> {
  if (!cfg.kullaniciAdi || !cfg.sifre || !cfg.originator) {
    return { ok: false, hata: 'SMS ayarları eksik (kullanıcı adı, şifre veya originator).' }
  }
  if (!mesaj.trim()) return { ok: false, hata: 'Mesaj boş olamaz.' }
  if (!numaralar.length) return { ok: false, hata: 'Geçerli alıcı numarası yok.' }

  try {
    const xml = singleTextXml(cfg, mesaj, numaralar, sdate)
    const text = await xmlPost(cfg, '/api/mesaj_gonder', xml)
    return yanitYorumla(text)
  } catch (err) {
    return { ok: false, hata: err instanceof Error ? err.message : 'SMS gönderimi başarısız.' }
  }
}

/** Her numaraya farklı (kişiselleştirilmiş) metin gönderir. */
export async function smsGonderCokluMetin(
  cfg: SmsAyarConfig,
  ciftler: { telefon: string; mesaj: string }[],
  sdate?: string | null,
): Promise<SmsGonderSonuc> {
  if (!cfg.kullaniciAdi || !cfg.sifre || !cfg.originator) {
    return { ok: false, hata: 'SMS ayarları eksik (kullanıcı adı, şifre veya originator).' }
  }
  const gecerli = ciftler.filter(c => c.telefon && c.mesaj.trim())
  if (!gecerli.length) return { ok: false, hata: 'Geçerli alıcı/mesaj yok.' }

  try {
    const xml = multiTextXml(cfg, gecerli, sdate)
    const text = await xmlPost(cfg, '/api/mesaj_gonder', xml)
    return yanitYorumla(text)
  } catch (err) {
    return { ok: false, hata: err instanceof Error ? err.message : 'SMS gönderimi başarısız.' }
  }
}

export interface SmsKrediSonuc {
  ok: boolean
  kredi?: string
  hata?: string
}

/** Kalan SMS kredisini sorgular. */
export async function smsKrediSorgula(cfg: SmsAyarConfig): Promise<SmsKrediSonuc> {
  if (!cfg.kullaniciAdi || !cfg.sifre) {
    return { ok: false, hata: 'Kullanıcı adı veya şifre tanımlı değil.' }
  }
  try {
    const base = cfg.apiBaseUrl.replace(/\/+$/, '')
    const url = `${base}/api/kredi_raporu?UserName=${encodeURIComponent(cfg.kullaniciAdi)}&PassWord=${encodeURIComponent(cfg.sifre)}`
    const res = await fetch(url, { cache: 'no-store' })
    const text = (await res.text()).trim()
    if (!res.ok) return { ok: false, hata: `Sağlayıcı HTTP ${res.status}` }
    const hataKodu = text.match(/^\s*(0[1-9]|10)\s*$/)
    if (hataKodu) {
      const kod = hataKodu[1]
      return { ok: false, hata: SMS_HATA_KODLARI[kod] ?? `Hata kodu: ${kod}` }
    }
    return { ok: true, kredi: text }
  } catch (err) {
    return { ok: false, hata: err instanceof Error ? err.message : 'Kredi sorgulanamadı.' }
  }
}
