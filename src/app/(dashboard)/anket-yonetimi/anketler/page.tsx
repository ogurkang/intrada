import Link from 'next/link'
import AnketListeClient from '@/components/anket/AnketListeClient'
import { anketListeYukle } from '@/lib/anket-yukle'

export default async function AnketlerPage() {
  const { hata, satirlar } = await anketListeYukle()
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Anketler</h1>
        <Link href="/anket-yonetimi/anketler/yeni" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap">
          Anket oluştur
        </Link>
      </div>
      <div className="max-w-3xl space-y-3 text-sm leading-6 text-slate-600">
        <p>
          Anketi yönetici oluşturur. Ad, açıklama ve sorular yazılır. Kayıt durdurulmuş açılır. İşlemler sütunundaki yayın düğmesi anketi açar; aynı düğme yayını kaldırır. Yayındaki anket, paylaşım linki veya giriş ekranındaki anket kodu ile açılır. Cevaplamak için oturum gerekmez.
        </p>
        <p>
          Cevap isimsizdir. Ad, sicil ve kullanıcı kimliği tutulmaz. Aynı tarayıcıdaki çerez ikinci gönderimi keser. Az sayıda kişi cevapladığında grafik bir kişiyi belli edebilir; bu uyarı ankete başlamadan önce gösterilir. Kurumda aynı çıkış hattı kullanıldığı için ikinci cevabı IP adresi ile kesmeyiz. IP saklamak isimsizliği bozar.
        </p>
        <p>
          Raporda her sorunun dağılımı okunur. Tek seçim, çoklu seçim ve evet/hayır pasta dilimi, puan renkli çubuk, serbest metin liste olarak durur. Yorum, sorunun metnini ve cevap dağılımını birlikte okur. Puan ölçeği 1 çok kötü, 5 çok iyidir. Yönetici raporu PDF indirir. Anket linkini açan kişi soruların boş PDF’ini indirebilir.
        </p>
        <p>
          Yaş, cinsiyet, öğrenim veya statü tek seçim olarak duruyorsa rapor, cevaplayan grupları yazar. Örnek: anketi cevaplayan kadınlar, anketi cevaplayan memurların 18-25 yaş olanları. Bu dağılım, bugün kadroda duran asıl personel ve ayrılmamış ADABEL personeli ile yan yana konur. Yakınlık, kurumun genelinin düşüncesi demek değildir. Cevaplar linki açan kişilere aittir. Bu dört soru, oluşturma ve düzenleme ekranında kayıtlı tanımlardan tek düğmeyle eklenir. İstenmeyen soru işaretlenip çıkarılır.
        </p>
        <p>
          Cevapları sıfırlamak soruları silmez, yalnızca verilen cevapları siler. Cevabı olan bir soruyu silmek veya düzenlemek sonucu etkiler; ekran bunu sorar. Log, işlemi ve işlemi yapanı tutar. Anket yönetimi yalnızca yönetici hesaplarındadır.
        </p>
      </div>
      {hata ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{hata}</p> : null}
      <AnketListeClient satirlar={satirlar} tur="anket" />
    </div>
  )
}
