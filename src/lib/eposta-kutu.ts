import { ImapFlow } from 'imapflow'
import type { EpostaAyarRow } from '@/lib/eposta-ayar'
import { EPOSTA_VARSAYILAN } from '@/lib/eposta-ayar'
import type { EpostaEkBilgi, EpostaKutu, EpostaMesaj, EpostaOzet } from '@/lib/eposta-tipler'

export type { EpostaEkBilgi, EpostaKutu, EpostaMesaj, EpostaOzet }

const LISTE_ADET = 30

function hataMetni(err: unknown): string {
  const mesaj = err instanceof Error ? err.message : 'E-posta sunucusuna ulaşılamadı.'
  if (/auth|invalid credentials|authentication/i.test(mesaj)) return 'Kullanıcı adı veya şifre kabul edilmedi.'
  if (/timeout|ETIMEDOUT|ENOTFOUND|ECONNREFUSED/i.test(mesaj)) return 'E-posta sunucusuna ulaşılamadı.'
  return mesaj
}

function istemci(row: EpostaAyarRow): ImapFlow {
  return new ImapFlow({
    host: String(row.imap_host || EPOSTA_VARSAYILAN.imapHost).trim(),
    port: Number(row.imap_port) || EPOSTA_VARSAYILAN.imapPort,
    secure: true,
    auth: { user: String(row.adres).trim(), pass: String(row.sifre ?? '') },
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  })
}

function klasorAdi(path: string): string {
  const parca = path.split(/[./]/).pop() ?? path
  return parca.toLocaleLowerCase('tr-TR')
}

function klasorSec(kutular: { path: string; specialUse?: string; name?: string }[], kutu: EpostaKutu): string | null {
  if (kutu === 'gelen') {
    return (
      kutular.find(k => k.specialUse === '\\Inbox')?.path ??
      kutular.find(k => k.path.toUpperCase() === 'INBOX')?.path ??
      'INBOX'
    )
  }
  const ozel = kutu === 'giden' ? '\\Sent' : '\\Junk'
  const hazir = kutular.find(k => k.specialUse === ozel)
  if (hazir) return hazir.path
  const adlar =
    kutu === 'giden'
      ? ['sent', 'sent items', 'sent messages', 'gönderilmiş', 'gonderilmis', 'gönderilen', 'gönderilmiş öğeler', 'gonderilmis ogeler']
      : ['spam', 'junk', 'junk e-mail', 'junk email', 'gereksiz', 'istenmeyen', 'bulk mail']
  const bulunan = kutular.find(k => adlar.includes(klasorAdi(k.path)) || adlar.includes(String(k.name ?? '').toLocaleLowerCase('tr-TR')))
  return bulunan?.path ?? null
}

async function baglan<T>(row: EpostaAyarRow, is: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = istemci(row)
  await client.connect()
  try {
    return await is(client)
  } finally {
    try {
      await client.logout()
    } catch {
      client.close()
    }
  }
}

function adresYazi(adres: { name?: string; address?: string } | undefined): string {
  if (!adres) return ''
  const ad = String(adres.name ?? '').trim()
  const mail = String(adres.address ?? '').trim()
  if (ad && mail) return `${ad} <${mail}>`
  return ad || mail
}

function tarihYazi(d: Date | string | undefined): string {
  if (!d) return ''
  const tarih = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(tarih.getTime())) return ''
  return tarih.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export async function epostaKlasorListele(row: EpostaAyarRow, kutu: EpostaKutu): Promise<{ satirlar: EpostaOzet[]; hata?: string; klasorYok?: boolean }> {
  try {
    return await baglan(row, async client => {
      const kutular = await client.list()
      const yol = klasorSec(kutular, kutu)
      if (!yol) return { satirlar: [], klasorYok: true }
      const kilit = await client.getMailboxLock(yol)
      try {
        const mevcut = client.mailbox && typeof client.mailbox === 'object' ? client.mailbox.exists : 0
        if (!mevcut) return { satirlar: [] }
        const bas = Math.max(1, mevcut - LISTE_ADET + 1)
        const satirlar: EpostaOzet[] = []
        for await (const msg of client.fetch(`${bas}:*`, { envelope: true, flags: true, uid: true })) {
          const from = msg.envelope?.from?.[0]
          const tarih = msg.envelope?.date
          satirlar.push({
            uid: String(msg.uid),
            kim: adresYazi(from) || '(adres yok)',
            konu: String(msg.envelope?.subject ?? '').trim() || '(konu yok)',
            tarih: tarihYazi(tarih),
            okunmadi: !msg.flags?.has('\\Seen'),
          })
        }
        satirlar.reverse()
        return { satirlar }
      } finally {
        kilit.release()
      }
    })
  } catch (err) {
    return { satirlar: [], hata: hataMetni(err) }
  }
}

function htmlTemizle(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
}

export async function epostaMesajOku(row: EpostaAyarRow, kutu: EpostaKutu, uid: string): Promise<{ mesaj?: EpostaMesaj; hata?: string }> {
  const no = Number(uid)
  if (!Number.isFinite(no) || no <= 0) return { hata: 'Mektup bulunamadı.' }
  try {
    const { simpleParser } = await import('mailparser')
    return await baglan(row, async client => {
      const kutular = await client.list()
      const yol = klasorSec(kutular, kutu)
      if (!yol) return { hata: 'Klasör bulunamadı.' }
      const kilit = await client.getMailboxLock(yol)
      try {
        const msg = await client.fetchOne(String(no), { source: true, envelope: true }, { uid: true })
        if (!msg || !msg.source) return { hata: 'Mektup bulunamadı.' }
        const parsed = await simpleParser(msg.source)
        const ekler = (parsed.attachments ?? [])
          .filter(a => a.filename || a.contentDisposition === 'attachment')
          .map((a, sira) => ({
            sira,
            ad: a.filename || `ek-${sira + 1}`,
            boyut: a.size || a.content?.length || 0,
          }))
        await client.messageFlagsAdd(String(no), ['\\Seen'], { uid: true })
        return {
          mesaj: {
            uid: String(no),
            kim: parsed.from?.text || adresYazi(msg.envelope?.from?.[0]) || '',
            kime: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to.text) : '',
            konu: parsed.subject || '(konu yok)',
            tarih: tarihYazi(parsed.date ?? msg.envelope?.date),
            metin: parsed.text || '',
            html: parsed.html ? htmlTemizle(parsed.html) : '',
            messageId: parsed.messageId || '',
            ekler,
          },
        }
      } finally {
        kilit.release()
      }
    })
  } catch (err) {
    return { hata: hataMetni(err) }
  }
}

export async function epostaEkIndir(
  row: EpostaAyarRow,
  kutu: EpostaKutu,
  uid: string,
  sira: number,
): Promise<{ ad: string; icerik: Buffer; tip: string } | { hata: string }> {
  const no = Number(uid)
  if (!Number.isFinite(no) || no <= 0 || sira < 0) return { hata: 'Ek bulunamadı.' }
  try {
    const { simpleParser } = await import('mailparser')
    return await baglan(row, async client => {
      const kutular = await client.list()
      const yol = klasorSec(kutular, kutu)
      if (!yol) return { hata: 'Klasör bulunamadı.' }
      const kilit = await client.getMailboxLock(yol)
      try {
        const msg = await client.fetchOne(String(no), { source: true }, { uid: true })
        if (!msg || !msg.source) return { hata: 'Mektup bulunamadı.' }
        const parsed = await simpleParser(msg.source)
        const ekler = (parsed.attachments ?? []).filter(a => a.filename || a.contentDisposition === 'attachment')
        const ek = ekler[sira]
        if (!ek) return { hata: 'Ek bulunamadı.' }
        return { ad: ek.filename || `ek-${sira + 1}`, icerik: ek.content, tip: ek.contentType || 'application/octet-stream' }
      } finally {
        kilit.release()
      }
    })
  } catch (err) {
    return { hata: hataMetni(err) }
  }
}
