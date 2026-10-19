/**
 * İletimX SMS gateway.
 * Örnek: docs/sms/XMLOrnek.php ve Form1.cs
 * Adres: http://g3.iletimx.com/?anabayi=1
 * Gövde: ham XML, Content-Type text/xml. Kullanıcı adı: kullanici-bayikodu.
 * Tek metin Action 0, Türkçe 12. Kişisel metin Action 1, Türkçe 13.
 * Kredi Action 4, iletim raporu Action 3 (MainReportRoot).
 * Başarılı yanıt: "ID: 27765"
 */

export const SMS_GATEWAY_ADRESI = 'http://g3.iletimx.com/?anabayi=1'

/** Eski adres kayıtlıysa bu hesabın gateway kapısına çevirir. g3 olduğu gibi kalır. */
export function smsGatewayAdresi(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim()
  if (!s || /mesajpaketi\.com/i.test(s) || /^https?:\/\/g\.iletimx\.com/i.test(s)) return SMS_GATEWAY_ADRESI
  return s
}

export interface SmsAyarConfig {
  apiBaseUrl: string
  kullaniciAdi: string
  bayiKodu: string
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
  '01': 'Hatalı kullanıcı adı, şifre ya da bayi kodu.',
  '02': 'Yetersiz kredi veya ödenmemiş fatura.',
  '03': 'Tanımsız action parametresi.',
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

/** Örneklerdeki kullanıcı adı: kullaniciadi-bayikodu. Bayi ayrıysa sona eklenir. */
export function smsGatewayKullanici(cfg: SmsAyarConfig): string | null {
  const ad = cfg.kullaniciAdi.trim()
  const bayi = cfg.bayiKodu.trim()
  if (!ad) return null
  if (bayi) return ad.endsWith(`-${bayi}`) ? ad : `${ad}-${bayi}`
  if (ad.includes('-')) return ad
  return null
}

function cdata(v: string): string {
  return `<![CDATA[${String(v ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

function mesgbody(cfg: SmsAyarConfig, mesaj: string): string {
  return cfg.turkceKarakter ? cdata(mesaj) : xmlEscape(mesaj)
}

function singleTextXml(cfg: SmsAyarConfig, kullanici: string, mesaj: string, numaralar: string[], sdate?: string | null): string {
  const action = cfg.turkceKarakter ? 12 : 0
  return [
    '<MainmsgBody>',
    `<UserName>${xmlEscape(kullanici)}</UserName>`,
    `<PassWord>${xmlEscape(cfg.sifre)}</PassWord>`,
    `<Action>${action}</Action>`,
    `<Mesgbody>${mesgbody(cfg, mesaj)}</Mesgbody>`,
    `<Numbers>${numaralar.join(',')}</Numbers>`,
    `<Originator>${xmlEscape(cfg.originator)}</Originator>`,
    sdateNode(sdate),
    '</MainmsgBody>',
  ].join('')
}

function multiTextXml(cfg: SmsAyarConfig, kullanici: string, ciftler: { telefon: string; mesaj: string }[], sdate?: string | null): string {
  const action = cfg.turkceKarakter ? 13 : 1
  const mesajlar = ciftler
    .map(c => `<Message><Mesgbody>${mesgbody(cfg, c.mesaj)}</Mesgbody><Number>${c.telefon}</Number></Message>`)
    .join('')
  return [
    '<MainmsgBody>',
    `<UserName>${xmlEscape(kullanici)}</UserName>`,
    `<PassWord>${xmlEscape(cfg.sifre)}</PassWord>`,
    `<Action>${action}</Action>`,
    `<Messages>${mesajlar}</Messages>`,
    `<Originator>${xmlEscape(cfg.originator)}</Originator>`,
    sdateNode(sdate),
    '</MainmsgBody>',
  ].join('')
}

function raporXml(kullanici: string, sifre: string, action: 3 | 4, mesajId?: string): string {
  return [
    '<MainReportRoot>',
    `<UserName>${xmlEscape(kullanici)}</UserName>`,
    `<PassWord>${xmlEscape(sifre)}</PassWord>`,
    `<Action>${action}</Action>`,
    mesajId ? `<MsgID>${xmlEscape(mesajId)}</MsgID>` : '',
    '</MainReportRoot>',
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

async function xmlPost(cfg: SmsAyarConfig, xml: string): Promise<string> {
  const res = await fetch(smsGatewayAdresi(cfg.apiBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: xml,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Sağlayıcı HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return text
}

function ayarEksik(cfg: SmsAyarConfig): string | null {
  if (!cfg.sifre.trim()) return 'SMS ayarları eksik (şifre).'
  if (!smsGatewayKullanici(cfg)) return 'Kullanıcı adı ve bayi kodu gerekli. Biçim: kullaniciadi-bayikodu.'
  return null
}

/** Aynı mesajı bir veya birden çok normalize edilmiş numaraya gönderir. */
export async function smsGonderTekMetin(
  cfg: SmsAyarConfig,
  mesaj: string,
  numaralar: string[],
  sdate?: string | null,
): Promise<SmsGonderSonuc> {
  const eksik = ayarEksik(cfg)
  if (eksik) return { ok: false, hata: eksik }
  if (!cfg.originator.trim()) return { ok: false, hata: 'Gönderici başlığı (originator) tanımlı değil.' }
  if (!mesaj.trim()) return { ok: false, hata: 'Mesaj boş olamaz.' }
  if (!numaralar.length) return { ok: false, hata: 'Geçerli alıcı numarası yok.' }

  try {
    const xml = singleTextXml(cfg, smsGatewayKullanici(cfg)!, mesaj, numaralar, sdate)
    const text = await xmlPost(cfg, xml)
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
  const eksik = ayarEksik(cfg)
  if (eksik) return { ok: false, hata: eksik }
  if (!cfg.originator.trim()) return { ok: false, hata: 'Gönderici başlığı (originator) tanımlı değil.' }
  const gecerli = ciftler.filter(c => c.telefon && c.mesaj.trim())
  if (!gecerli.length) return { ok: false, hata: 'Geçerli alıcı/mesaj yok.' }

  try {
    const xml = multiTextXml(cfg, smsGatewayKullanici(cfg)!, gecerli, sdate)
    const text = await xmlPost(cfg, xml)
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

export interface SmsMesajDurumSonuc {
  ok: boolean
  /** 1 iletildi, 2 beklemede, 3 zaman aşımı, 4 iletilmedi. 0 eski yanıtlar için beklemede. */
  durumKodu?: '0' | '1' | '2' | '3' | '4'
  telefon?: string
  hata?: string
  ham?: string
}

/** SDate (GGAAYYYYSSdd) → ISO zaman damgası (yerel). */
export function sdateToPlanlananAt(sdate: string): string | null {
  const s = String(sdate ?? '').trim()
  if (s.length < 12) return null
  const gun = parseInt(s.slice(0, 2), 10)
  const ay = parseInt(s.slice(2, 4), 10)
  const yil = parseInt(s.slice(4, 8), 10)
  const saat = parseInt(s.slice(8, 10), 10)
  const dakika = parseInt(s.slice(10, 12), 10)
  if (![gun, ay, yil, saat, dakika].every(n => Number.isFinite(n))) return null
  const d = new Date(yil, ay - 1, gun, saat, dakika, 0, 0)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/**
 * datetime-local değerinden SDate (GGAAYYYYSSdd) üretir.
 * Geçmiş veya 1 dk içindeyse anında gönderim (boş sdate) döner.
 */
export function planliGonderimSDate(
  tarihSaatYerel: string,
): { sdate: string; aninda: boolean; planlananAt: string | null } | null {
  const ham = String(tarihSaatYerel ?? '').trim()
  if (!ham) return null
  const d = new Date(ham)
  if (Number.isNaN(d.getTime())) return null

  const simdi = Date.now()
  if (d.getTime() <= simdi + 60_000) {
    return { sdate: '', aninda: true, planlananAt: null }
  }

  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yil = d.getFullYear()
  const saat = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
  const sdate = `${dd}${mm}${yil}${saat}`
  return { sdate, aninda: false, planlananAt: sdateToPlanlananAt(sdate) }
}

type RaporSatiri = { telefon: string; durumKodu: '0' | '1' | '2' | '3' | '4' }

function sonOnHane(tel: string): string {
  const n = String(tel ?? '').replace(/\D+/g, '')
  return n.length >= 10 ? n.slice(-10) : n
}

/** Gateway raporu: her satır "905321234567 1". 1 iletildi, 2 beklemede, 3 zaman aşımı, 4 iletilmedi. */
function mesajRaporuYorumla(text: string, telefon?: string): RaporSatiri | null {
  const ham = String(text ?? '').trim()
  const satirlar: RaporSatiri[] = []
  for (const satir of ham.split(/\r?\n/)) {
    const m = satir.trim().match(/^(\d{10,12})[\s\-]+([0-4])$/)
    if (!m) continue
    satirlar.push({ telefon: m[1], durumKodu: m[2] as RaporSatiri['durumKodu'] })
  }
  if (!satirlar.length) return null
  if (satirlar.length === 1) return satirlar[0]
  const hedef = sonOnHane(telefon ?? '')
  if (hedef) {
    const bulunan = satirlar.find(s => sonOnHane(s.telefon) === hedef)
    if (bulunan) return bulunan
  }
  return null
}

function hataKoduMu(text: string): string | null {
  return text.trim().match(/^(0[1-9]|10)$/)?.[1] ?? null
}

/** Sağlayıcı mesaj ID ile iletim durumu sorgular. telefon, pakette birden fazla numara varsa doğru satırı seçer. */
export async function smsMesajDurumSorgula(
  cfg: SmsAyarConfig,
  mesajId: string,
  telefon?: string,
): Promise<SmsMesajDurumSonuc> {
  const eksik = ayarEksik(cfg)
  if (eksik) return { ok: false, hata: eksik }
  const id = String(mesajId ?? '').trim()
  if (!id) return { ok: false, hata: 'Mesaj ID yok.' }

  try {
    const text = (await xmlPost(cfg, raporXml(smsGatewayKullanici(cfg)!, cfg.sifre, 3, id))).trim()
    const kod = hataKoduMu(text)
    if (kod) return { ok: false, hata: SMS_HATA_KODLARI[kod] ?? `Hata kodu: ${kod}`, ham: text }

    const rapor = mesajRaporuYorumla(text, telefon)
    if (rapor) return { ok: true, telefon: rapor.telefon, durumKodu: rapor.durumKodu, ham: text }
    return { ok: false, hata: `Beklenmeyen yanıt: ${text}`, ham: text }
  } catch (err) {
    return { ok: false, hata: err instanceof Error ? err.message : 'Durum sorgulanamadı.' }
  }
}

/** Kalan SMS kredisini sorgular. İlk satır kontör, sonrakiler originator başlıklarıdır. */
export async function smsKrediSorgula(cfg: SmsAyarConfig): Promise<SmsKrediSonuc> {
  const eksik = ayarEksik(cfg)
  if (eksik) return { ok: false, hata: eksik }
  try {
    const text = (await xmlPost(cfg, raporXml(smsGatewayKullanici(cfg)!, cfg.sifre, 4))).trim()
    const kod = hataKoduMu(text)
    if (kod) return { ok: false, hata: SMS_HATA_KODLARI[kod] ?? `Hata kodu: ${kod}` }
    const kredi = text.split(/\r?\n/).map(s => s.trim()).find(Boolean) ?? ''
    if (!kredi) return { ok: false, hata: 'Sağlayıcıdan boş yanıt alındı.' }
    return { ok: true, kredi }
  } catch (err) {
    return { ok: false, hata: err instanceof Error ? err.message : 'Kredi sorgulanamadı.' }
  }
}
