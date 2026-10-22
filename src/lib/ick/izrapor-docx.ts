import { readFile } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { ickIzraporXmlDoldur } from '@/lib/ick/izrapor-sablon'
import type { IckRaporVerisi } from '@/lib/ick/rapor'

const SABLON = path.join(process.cwd(), 'src/lib/ick/sablon/ikep-izrapor.docx')

export async function ickIzraporDocx(v: IckRaporVerisi): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(SABLON))
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) throw new Error('İzleme raporu şablonu okunamadı.')
  zip.file('word/document.xml', ickIzraporXmlDoldur(xml, v))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
