import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppAccess } from '@/lib/app-access'
import { loadTanitimMetni } from '@/lib/intrada-asistan-bilgi'
import {
  type AsistanMesaj,
  izinOzetMetni,
  personelIzinSorgula,
  secimListesiMetni,
  soruIzinIleIlgili,
} from '@/lib/intrada-asistan-veri'

export type { AsistanMesaj }

const MODEL = 'gpt-4o-mini'

function sistemPrompt(veriEk: string): string {
  return `Sen INTRADA belediye personel yönetim uygulamasının Türkçe yardım asistanısın.

Kurallar:
- Yalnızca Intrada, personel, izin, rapor, kadro ve menü kullanımı hakkında konuş.
- Aşağıdaki "Güncel veri" bloğunu izin/personel sayıları için doğru kabul et; uydurma sayı üretme.
- Kişi bulunamazsa nazikçe söyle; İzin Hakları veya personel aramasını öner.
- Kısa, net, madde işaretli cevaplar ver; mümkünse ilgili menü yolunu yaz (/izin, /personel vb.).
- Hukuki karar verme; resmi işlem için ilgili ekrana yönlendir.

Uygulama rehberi (tanitim.md):
${loadTanitimMetni()}

${veriEk ? `\n--- Güncel veri (bu oturum) ---\n${veriEk}\n---\n` : ''}`
}

function basitYardimCevabi(mesaj: string, veriEk: string): string {
  const m = mesaj.toLocaleLowerCase('tr-TR')
  if (veriEk) {
    return `İzin bilgisi:\n\n${veriEk}\n\nDüzenleme için **İzin Hakları** (\`/izin/haklar\`) veya personel kartı → İzin sekmesini kullanın.`
  }
  if (/izin.*(nasıl|nerede|aç|ekle|yeni)/i.test(m)) {
    return 'Yeni izin kaydı: **İzin Yönetimi → İzin Hareketleri** (`/izin`) veya doğrudan `/izin/yeni`. Onay bekleyenler ana sayfadaki **Bekleyen Talepler** kartında görünür.'
  }
  if (/excel|indir/i.test(m)) {
    return 'Excel çıktısı: ilgili **Rapor Yönetimi** sayfasına gidin, yıl/sekme seçin, **Excel İndir** düğmesine basın.'
  }
  if (/rapor/i.test(m)) {
    return 'Tüm raporlar: sol menü **Rapor Yönetimi** veya `/rapor` genel bakış. Arama kutusuna rapor adının bir kısmını yazabilirsiniz.'
  }
  if (soruIzinIleIlgili(mesaj) && !veriEk) {
    return 'İzin hakkı için adın bir kısmını yazmanız yeterli (ör. "Gürkan kaç gün izni var"). Birden fazla eşleşme varsa listeden seçmenizi isteyeceğim.'
  }
  return 'INTRADA kullanımı hakkında sorularınızı Türkçe sorabilirsiniz. Örnek: "İzin nasıl girilir?", "Rapor Excel nerede?", veya "Gürkan kaç gün izni var".'
}

async function openaiCevap(
  sistem: string,
  gecmis: AsistanMesaj[],
  kullanici: string,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        { role: 'system', content: sistem },
        ...gecmis.slice(-8).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: kullanici },
      ],
    }),
  })

  if (!res.ok) {
    console.error('ASISTAN_OPENAI', res.status, await res.text().catch(() => ''))
    return null
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return json.choices?.[0]?.message?.content?.trim() ?? null
}

export async function intradaAsistanCevapla(input: {
  supabase: SupabaseClient
  access: AppAccess
  mesaj: string
  gecmis: AsistanMesaj[]
}): Promise<{ cevap: string; veriKullanildi: boolean }> {
  const mesaj = input.mesaj.trim()
  if (!mesaj) return { cevap: 'Lütfen bir soru yazın.', veriKullanildi: false }

  const yil = new Date().getFullYear()
  let veriEk = ''

  const kendiSorusu =
    input.access.mode === 'kullanici' &&
    /\b(benim|bende|kendi|bana)\b/i.test(mesaj)

  const izinSorusu = soruIzinIleIlgili(mesaj) || kendiSorusu

  if (izinSorusu) {
    let yalnizcaSicil: string | undefined
    if (input.access.mode === 'kullanici') {
      yalnizcaSicil = input.access.sicilNo
    } else if (kendiSorusu && input.access.mode === 'blocked') {
      yalnizcaSicil = input.access.sicilNo ?? undefined
    }

    const sonuc = await personelIzinSorgula(input.supabase, mesaj, yil, {
      yalnizcaSicil,
      gecmis: input.gecmis,
    })

    if (sonuc?.tur === 'secim') {
      return {
        cevap: secimListesiMetni(sonuc.adaylar, sonuc.aranan),
        veriKullanildi: false,
      }
    }

    if (sonuc?.tur === 'bulunamadi') {
      return {
        cevap: `"${sonuc.aranan}" ile eşleşen aktif personel bulunamadı. Farklı bir ad/soyad deneyin veya /personel listesinden tam adı kontrol edin.`,
        veriKullanildi: false,
      }
    }

    if (sonuc?.tur === 'ozet') {
      if (
        input.access.mode === 'kullanici' &&
        sonuc.ozet.sicil_no !== input.access.sicilNo
      ) {
        return {
          cevap:
            'Başka personelin izin bilgisini görme yetkiniz yok. Kendi izniniz için "benim kaç gün iznim var" diye sorabilirsiniz.',
          veriKullanildi: false,
        }
      }
      veriEk = izinOzetMetni(sonuc.ozet)
      const sistem = sistemPrompt(veriEk)
      const llm = await openaiCevap(sistem, input.gecmis, mesaj)
      if (llm) return { cevap: llm, veriKullanildi: true }
      return { cevap: basitYardimCevabi(mesaj, veriEk), veriKullanildi: true }
    }
  }

  const sistem = sistemPrompt(veriEk)
  const llm = await openaiCevap(sistem, input.gecmis, mesaj)
  if (llm) return { cevap: llm, veriKullanildi: !!veriEk }

  return { cevap: basitYardimCevabi(mesaj, veriEk), veriKullanildi: !!veriEk }
}
