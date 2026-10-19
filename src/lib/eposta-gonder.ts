import nodemailer from 'nodemailer'
import type { EpostaAyarRow } from '@/lib/eposta-ayar'
import { EPOSTA_VARSAYILAN } from '@/lib/eposta-ayar'

const ADRES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function epostaAdresleri(raw: string): { adresler: string[]; hata?: string } {
  const parca = String(raw ?? '')
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean)
  const bozuk = parca.filter(a => !ADRES.test(a))
  if (bozuk.length) return { adresler: [], hata: `Geçersiz adres: ${bozuk.join(', ')}` }
  return { adresler: parca }
}

function htmlKacis(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function metinHtml(metin: string): string {
  return htmlKacis(metin).replace(/\n/g, '<br>')
}

export async function epostaGonder(input: {
  ayar: EpostaAyarRow
  kime: string[]
  bilgi: string[]
  gizli: string[]
  konu: string
  metin: string
  ekler: { ad: string; icerik: Buffer }[]
  inReplyTo?: string
  references?: string
}): Promise<{ ok?: true; hata?: string }> {
  const adres = String(input.ayar.adres || EPOSTA_VARSAYILAN.adres).trim()
  const gorunen = String(input.ayar.gorunen_ad || EPOSTA_VARSAYILAN.gorunenAd).trim()
  const transporter = nodemailer.createTransport({
    host: String(input.ayar.smtp_host || EPOSTA_VARSAYILAN.smtpHost).trim(),
    port: Number(input.ayar.smtp_port) || EPOSTA_VARSAYILAN.smtpPort,
    secure: true,
    auth: { user: adres, pass: String(input.ayar.sifre ?? '') },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  })
  try {
    await transporter.sendMail({
      from: { name: gorunen, address: adres },
      to: input.kime,
      cc: input.bilgi.length ? input.bilgi : undefined,
      bcc: input.gizli.length ? input.gizli : undefined,
      subject: input.konu,
      text: input.metin,
      html: `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#1e293b">${metinHtml(input.metin)}</div>`,
      attachments: input.ekler.map(e => ({ filename: e.ad, content: e.icerik })),
      inReplyTo: input.inReplyTo || undefined,
      references: input.references || undefined,
    })
    return { ok: true }
  } catch (err) {
    const mesaj = err instanceof Error ? err.message : 'E-posta gönderilemedi.'
    if (/auth|invalid credentials|authentication/i.test(mesaj)) return { hata: 'Kullanıcı adı veya şifre kabul edilmedi.' }
    if (/timeout|ETIMEDOUT|ENOTFOUND|ECONNREFUSED/i.test(mesaj)) return { hata: 'Giden posta sunucusuna ulaşılamadı.' }
    return { hata: mesaj }
  }
}
