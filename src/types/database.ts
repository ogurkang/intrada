/**
 * INTRADA v3 – Supabase Veritabanı TypeScript Tipleri
 * @supabase/supabase-js v2.x uyumlu format (Relationships + CompositeTypes dahil).
 * `npx supabase gen types typescript` ile otomatik üretilen sürüme geçilebilir.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ─────────────────── TANIMLAR ───────────────────
      tanim_ogrenim: {
        Row:    { id: number; isim: string; aktif: boolean; created_at: string }
        Insert: { id?: number; isim: string; aktif?: boolean; created_at?: string }
        Update: { id?: number; isim?: string; aktif?: boolean; created_at?: string }
        Relationships: []
      }
      tanim_gosterge: {
        Row: {
          id: number
          derece: number
          kademe: number
          gosterge: number
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          derece: number
          kademe: number
          gosterge: number
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          derece?: number
          kademe?: number
          gosterge?: number
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tanim_yerleske_adresi: {
        Row: {
          id: number
          sira_no: number | null
          yerleske_adi: string
          adres: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          yerleske_adi: string
          adres: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          yerleske_adi?: string
          adres?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tanim_adres_mahalle: {
        Row: {
          id: number
          il: string
          ilce: string
          mahalle_adi: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          il: string
          ilce: string
          mahalle_adi: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          il?: string
          ilce?: string
          mahalle_adi?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      iletisim_sms_ayar: {
        Row: {
          id: number
          saglayici: string
          api_base_url: string
          kullanici_adi: string | null
          sifre: string | null
          originator: string | null
          turkce_karakter: boolean
          aktif: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          saglayici?: string
          api_base_url?: string
          kullanici_adi?: string | null
          sifre?: string | null
          originator?: string | null
          turkce_karakter?: boolean
          aktif?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          saglayici?: string
          api_base_url?: string
          kullanici_adi?: string | null
          sifre?: string | null
          originator?: string | null
          turkce_karakter?: boolean
          aktif?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      iletisim_sms_log: {
        Row: {
          id: number
          actor_id: string | null
          actor_email: string | null
          alici_sicil: string | null
          alici_ad: string | null
          telefon: string
          mesaj: string
          originator: string | null
          durum: string
          saglayici_mesaj_id: string | null
          hata_kodu: string | null
          hata_mesaji: string | null
          created_at: string
        }
        Insert: {
          id?: number
          actor_id?: string | null
          actor_email?: string | null
          alici_sicil?: string | null
          alici_ad?: string | null
          telefon: string
          mesaj: string
          originator?: string | null
          durum?: string
          saglayici_mesaj_id?: string | null
          hata_kodu?: string | null
          hata_mesaji?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          actor_id?: string | null
          actor_email?: string | null
          alici_sicil?: string | null
          alici_ad?: string | null
          telefon?: string
          mesaj?: string
          originator?: string | null
          durum?: string
          saglayici_mesaj_id?: string | null
          hata_kodu?: string | null
          hata_mesaji?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tanim_kazanc_bilgisi: {
        Row: {
          id: number
          sira_no: number | null
          unvan_id: number
          ogrenim_id: number
          derece: number
          ek_gosterge: string | null
          ek_odeme: string | null
          oht: string | null
          yan_odeme: string | null
          sds_orani: string | null
          kazanc_grup_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          unvan_id: number
          ogrenim_id: number
          derece: number
          ek_gosterge?: string | null
          ek_odeme?: string | null
          oht?: string | null
          yan_odeme?: string | null
          sds_orani?: string | null
          kazanc_grup_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          unvan_id?: number
          ogrenim_id?: number
          derece?: number
          ek_gosterge?: string | null
          ek_odeme?: string | null
          oht?: string | null
          yan_odeme?: string | null
          sds_orani?: string | null
          kazanc_grup_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'tanim_kazanc_bilgisi_ogrenim_id_fkey'; columns: ['ogrenim_id']; isOneToOne: false; referencedRelation: 'tanim_ogrenim'; referencedColumns: ['id'] },
          { foreignKeyName: 'tanim_kazanc_bilgisi_unvan_id_fkey'; columns: ['unvan_id']; isOneToOne: false; referencedRelation: 'tanim_unvan'; referencedColumns: ['id'] },
        ]
      }
      tanim_unvan: {
        Row: {
          id: number; sira_no: number | null; unvan_kodu: string | null; unvan_adi: string
          sinif_adi: string | null; arazi: boolean | null; kat_sayi: number | null
          aktif: boolean; created_at: string
        }
        Insert: {
          id?: number; sira_no?: number | null; unvan_kodu?: string | null; unvan_adi: string
          sinif_adi?: string | null; arazi?: boolean | null; kat_sayi?: number | null
          aktif?: boolean; created_at?: string
        }
        Update: {
          id?: number; sira_no?: number | null; unvan_kodu?: string | null; unvan_adi?: string
          sinif_adi?: string | null; arazi?: boolean | null; kat_sayi?: number | null
          aktif?: boolean; created_at?: string
        }
        Relationships: []
      }
      tanim_mudurluk: {
        Row:    { id: number; sira_no: number | null; mudurluk_adi: string; tehlike_sinifi: string; aktif: boolean; created_at: string }
        Insert: { id?: number; sira_no?: number | null; mudurluk_adi: string; tehlike_sinifi?: string; aktif?: boolean; created_at?: string }
        Update: { id?: number; sira_no?: number | null; mudurluk_adi?: string; tehlike_sinifi?: string; aktif?: boolean; created_at?: string }
        Relationships: []
      }
      tanim_mudurluk_yerleske: {
        Row: {
          id: number
          mudurluk_id: number
          yerleske_adresi_id: number
          konum: string
          created_at: string
        }
        Insert: {
          id?: number
          mudurluk_id: number
          yerleske_adresi_id: number
          konum?: string
          created_at?: string
        }
        Update: {
          id?: number
          mudurluk_id?: number
          yerleske_adresi_id?: number
          konum?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'tanim_mudurluk_yerleske_mudurluk_id_fkey'; columns: ['mudurluk_id']; isOneToOne: false; referencedRelation: 'tanim_mudurluk'; referencedColumns: ['id'] },
          { foreignKeyName: 'tanim_mudurluk_yerleske_yerleske_adresi_id_fkey'; columns: ['yerleske_adresi_id']; isOneToOne: false; referencedRelation: 'tanim_yerleske_adresi'; referencedColumns: ['id'] },
        ]
      }
      tanim_sirket: {
        Row: { id: number; sirket_adi: string; aktif: boolean; created_at: string }
        Insert: { id?: number; sirket_adi: string; aktif?: boolean; created_at?: string }
        Update: { id?: number; sirket_adi?: string; aktif?: boolean; created_at?: string }
        Relationships: []
      }
      tanim_sirket_yerleske: {
        Row: {
          id: number
          sirket_id: number
          yerleske_adresi_id: number
          konum: string
          created_at: string
        }
        Insert: {
          id?: number
          sirket_id: number
          yerleske_adresi_id: number
          konum?: string
          created_at?: string
        }
        Update: {
          id?: number
          sirket_id?: number
          yerleske_adresi_id?: number
          konum?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'tanim_sirket_yerleske_sirket_id_fkey'; columns: ['sirket_id']; isOneToOne: false; referencedRelation: 'tanim_sirket'; referencedColumns: ['id'] },
          { foreignKeyName: 'tanim_sirket_yerleske_yerleske_adresi_id_fkey'; columns: ['yerleske_adresi_id']; isOneToOne: false; referencedRelation: 'tanim_yerleske_adresi'; referencedColumns: ['id'] },
        ]
      }
      tanim_statu: {
        Row:    { id: number; sira_no: number | null; statu_adi: string; aktif: boolean; created_at: string }
        Insert: { id?: number; sira_no?: number | null; statu_adi: string; aktif?: boolean; created_at?: string }
        Update: { id?: number; sira_no?: number | null; statu_adi?: string; aktif?: boolean; created_at?: string }
        Relationships: []
      }
      tanim_hareket_tanim: {
        Row: {
          id: number
          sira_no: number | null
          tur: string
          tip: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          tur: string
          tip: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          tur?: string
          tip?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      yerel_bilgi_arac_durum: {
        Row: {
          id: number
          sira_no: number | null
          tanim_adi: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          tanim_adi: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          tanim_adi?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      yerel_bilgi_arac_turu: {
        Row: {
          id: number
          sira_no: number | null
          tanim_adi: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          tanim_adi: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          tanim_adi?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      yerel_bilgi_arac_alt_tur: {
        Row: {
          id: number
          arac_turu_id: number
          sira_no: number | null
          tanim_adi: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          arac_turu_id: number
          sira_no?: number | null
          tanim_adi: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          arac_turu_id?: number
          sira_no?: number | null
          tanim_adi?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'yerel_bilgi_arac_alt_tur_arac_turu_id_fkey'
            columns: ['arac_turu_id']
            isOneToOne: false
            referencedRelation: 'yerel_bilgi_arac_turu'
            referencedColumns: ['id']
          },
        ]
      }
      yerel_bilgi_arac_sahiplik_durum: {
        Row: {
          id: number
          sira_no: number | null
          tanim_adi: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          tanim_adi: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          tanim_adi?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      yerel_bilgi_arac: {
        Row: {
          id: number
          sira_no: number
          sahiplik_durum_id: number
          arac_durum_id: number
          arac_turu_id: number
          arac_alt_tur_id: number
          plaka_no: string | null
          sasi_no: string | null
          mudurluk_id: number
          aktif: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number
          sahiplik_durum_id: number
          arac_durum_id: number
          arac_turu_id: number
          arac_alt_tur_id: number
          plaka_no?: string | null
          sasi_no?: string | null
          mudurluk_id: number
          aktif?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number
          sahiplik_durum_id?: number
          arac_durum_id?: number
          arac_turu_id?: number
          arac_alt_tur_id?: number
          plaka_no?: string | null
          sasi_no?: string | null
          mudurluk_id?: number
          aktif?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'yerel_bilgi_arac_sahiplik_durum_id_fkey'
            columns: ['sahiplik_durum_id']
            isOneToOne: false
            referencedRelation: 'yerel_bilgi_arac_sahiplik_durum'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'yerel_bilgi_arac_arac_durum_id_fkey'
            columns: ['arac_durum_id']
            isOneToOne: false
            referencedRelation: 'yerel_bilgi_arac_durum'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'yerel_bilgi_arac_arac_turu_id_fkey'
            columns: ['arac_turu_id']
            isOneToOne: false
            referencedRelation: 'yerel_bilgi_arac_turu'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'yerel_bilgi_arac_arac_alt_tur_id_fkey'
            columns: ['arac_alt_tur_id']
            isOneToOne: false
            referencedRelation: 'yerel_bilgi_arac_alt_tur'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'yerel_bilgi_arac_mudurluk_id_fkey'
            columns: ['mudurluk_id']
            isOneToOne: false
            referencedRelation: 'tanim_mudurluk'
            referencedColumns: ['id']
          },
        ]
      }
      yerel_bilgi_butce_gider: {
        Row: {
          id: number
          sira_no: number | null
          tanim_adi: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          tanim_adi: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          tanim_adi?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      yerel_bilgi_butce_gelir: {
        Row: {
          id: number
          sira_no: number | null
          tanim_adi: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number | null
          tanim_adi: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number | null
          tanim_adi?: string
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      yerel_bilgi_butce_tahmin_islem: {
        Row: {
          id: number
          sira_no: number
          mudurluk_id: number
          butce_gider_kalem_id: number | null
          butce_gelir_kalem_id: number | null
          tutar: number | null
          aktif: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number
          mudurluk_id: number
          butce_gider_kalem_id?: number | null
          butce_gelir_kalem_id?: number | null
          tutar?: number | null
          aktif?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number
          mudurluk_id?: number
          butce_gider_kalem_id?: number | null
          butce_gelir_kalem_id?: number | null
          tutar?: number | null
          aktif?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'yerel_bilgi_butce_tahmin_islem_mudurluk_id_fkey'
            columns: ['mudurluk_id']
            isOneToOne: false
            referencedRelation: 'tanim_mudurluk'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'yerel_bilgi_butce_tahmin_islem_kalem_fkey'
            columns: ['butce_gider_kalem_id']
            isOneToOne: false
            referencedRelation: 'yerel_bilgi_butce_gider'
            referencedColumns: ['id']
          },
        ]
      }
      yerel_bilgi_butce_gider_islem: {
        Row: {
          id: number
          sira_no: number
          mudurluk_id: number
          butce_gider_kalem_id: number | null
          butce_gelir_kalem_id: number | null
          tutar: number | null
          aktif: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sira_no?: number
          mudurluk_id: number
          butce_gider_kalem_id?: number | null
          butce_gelir_kalem_id?: number | null
          tutar?: number | null
          aktif?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sira_no?: number
          mudurluk_id?: number
          butce_gider_kalem_id?: number | null
          butce_gelir_kalem_id?: number | null
          tutar?: number | null
          aktif?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'yerel_bilgi_butce_gider_islem_mudurluk_id_fkey'
            columns: ['mudurluk_id']
            isOneToOne: false
            referencedRelation: 'tanim_mudurluk'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'yerel_bilgi_butce_gider_islem_kalem_fkey'
            columns: ['butce_gider_kalem_id']
            isOneToOne: false
            referencedRelation: 'yerel_bilgi_butce_gider'
            referencedColumns: ['id']
          },
        ]
      }
      tanim_izin_tur: {
        Row: {
          id: number; sira_no: number | null; tur_adi: string; kod: string | null
          izin_hakki_kullanimi: string | null; durum: boolean; created_at: string
        }
        Insert: {
          id?: number; sira_no?: number | null; tur_adi: string; kod?: string | null
          izin_hakki_kullanimi?: string | null; durum?: boolean; created_at?: string
        }
        Update: {
          id?: number; sira_no?: number | null; tur_adi?: string; kod?: string | null
          izin_hakki_kullanimi?: string | null; durum?: boolean; created_at?: string
        }
        Relationships: []
      }
      tanim_izin_hak: {
        Row: {
          id: number; sira_no: number | null; statu: string; en_az: number | null
          en_cok: number | null; hak_edilen_gun: number; gecerlilik_suresi_yil: number | null
          durum: boolean; created_at: string
        }
        Insert: {
          id?: number; sira_no?: number | null; statu: string; en_az?: number | null
          en_cok?: number | null; hak_edilen_gun: number; gecerlilik_suresi_yil?: number | null
          durum?: boolean; created_at?: string
        }
        Update: {
          id?: number; sira_no?: number | null; statu?: string; en_az?: number | null
          en_cok?: number | null; hak_edilen_gun?: number; gecerlilik_suresi_yil?: number | null
          durum?: boolean; created_at?: string
        }
        Relationships: []
      }
      tanim_izin_tatil: {
        Row: {
          id: number; sira_no: number | null; tatil_adi: string; tatil_turu: string | null
          tatil_yapisi: 'Yıllık Tatil' | 'Sabit Tatil' | null
          tatil_baslangici: string; tatil_bitisi: string; durum: boolean; created_at: string
        }
        Insert: {
          id?: number; sira_no?: number | null; tatil_adi: string; tatil_turu?: string | null
          tatil_yapisi?: 'Yıllık Tatil' | 'Sabit Tatil' | null
          tatil_baslangici: string; tatil_bitisi: string; durum?: boolean; created_at?: string
        }
        Update: {
          id?: number; sira_no?: number | null; tatil_adi?: string; tatil_turu?: string | null
          tatil_yapisi?: 'Yıllık Tatil' | 'Sabit Tatil' | null
          tatil_baslangici?: string; tatil_bitisi?: string; durum?: boolean; created_at?: string
        }
        Relationships: []
      }
      tanim_izin_tatil_tur: {
        Row: {
          id: number
          tur_adi: string
          sira_no: number | null
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          tur_adi: string
          sira_no?: number | null
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          tur_adi?: string
          sira_no?: number | null
          aktif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tanim_izin_kural: {
        Row: {
          id: number; sira_no: number | null; statu: string; cumartesi: boolean | null
          pazar: boolean | null; haftaici_tatil: boolean | null; tatil_haftasonu: boolean | null
          durum: boolean; created_at: string
        }
        Insert: {
          id?: number; sira_no?: number | null; statu: string; cumartesi?: boolean | null
          pazar?: boolean | null; haftaici_tatil?: boolean | null; tatil_haftasonu?: boolean | null
          durum?: boolean; created_at?: string
        }
        Update: {
          id?: number; sira_no?: number | null; statu?: string; cumartesi?: boolean | null
          pazar?: boolean | null; haftaici_tatil?: boolean | null; tatil_haftasonu?: boolean | null
          durum?: boolean; created_at?: string
        }
        Relationships: []
      }
      // ─────────────────── PERSONEL ───────────────────
      calisan: {
        Row: {
          sicil_no: string; public_id: string; ad_soyad: string; tckn: string | null; dogum_tarihi: string | null
          cinsiyet: string | null; kan_grubu: string | null; sgk_ssk_sicil_no: string | null; telefon: string | null
          e_posta: string | null; dogum_yeri: string | null; anne_adi: string | null
          baba_adi: string | null; adresi: string | null; mahalle_id: number | null; adres_detay: string | null; yakini: string | null
          yakini_telefonu: string | null; askerlik_durumu: string | null
          memuriyet_tarihi: string | null; kuruma_giris_tarihi: string | null
          hizmet_suresi_yil: number; hizmet_suresi_ay: number; hizmet_suresi_gun: number
          gorev_yeri: string | null; gorev_turu: string; gorev_turu_tarihi: string | null; gorev_turu_aciklama: string | null; gorev_durumu: string | null
          yerleske_adresi_id: number | null
          created_at: string; updated_at: string
        }
        Insert: {
          sicil_no: string; ad_soyad: string; public_id?: string; tckn?: string | null; dogum_tarihi?: string | null
          cinsiyet?: string | null; kan_grubu?: string | null; sgk_ssk_sicil_no?: string | null; telefon?: string | null
          e_posta?: string | null; dogum_yeri?: string | null; anne_adi?: string | null
          baba_adi?: string | null; adresi?: string | null; mahalle_id?: number | null; adres_detay?: string | null; yakini?: string | null
          yakini_telefonu?: string | null; askerlik_durumu?: string | null
          memuriyet_tarihi?: string | null; kuruma_giris_tarihi?: string | null
          hizmet_suresi_yil?: number; hizmet_suresi_ay?: number; hizmet_suresi_gun?: number
          gorev_yeri?: string | null; gorev_turu?: string; gorev_turu_tarihi?: string | null; gorev_turu_aciklama?: string | null; gorev_durumu?: string | null
          yerleske_adresi_id?: number | null
          created_at?: string; updated_at?: string
        }
        Update: {
          sicil_no?: string; public_id?: string; ad_soyad?: string; tckn?: string | null; dogum_tarihi?: string | null
          cinsiyet?: string | null; kan_grubu?: string | null; sgk_ssk_sicil_no?: string | null; telefon?: string | null
          e_posta?: string | null; dogum_yeri?: string | null; anne_adi?: string | null
          baba_adi?: string | null; adresi?: string | null; mahalle_id?: number | null; adres_detay?: string | null; yakini?: string | null
          yakini_telefonu?: string | null; askerlik_durumu?: string | null
          memuriyet_tarihi?: string | null; kuruma_giris_tarihi?: string | null
          hizmet_suresi_yil?: number; hizmet_suresi_ay?: number; hizmet_suresi_gun?: number
          gorev_yeri?: string | null; gorev_turu?: string; gorev_turu_tarihi?: string | null; gorev_turu_aciklama?: string | null; gorev_durumu?: string | null
          yerleske_adresi_id?: number | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      kadro_hareketleri: {
        Row: {
          id: number; public_id: string; meclis_karar_tarihi: string | null; meclis_karar_no: string | null
          iptal_karar_tarihi: string | null; iptal_karar_no: string | null
          kadro_sira_no: string | null; kadro_derecesi: string | null; statu: string | null
          kadro_unvan_id: number | null; kadro_unvani: string | null; asil: string | null; kadro_mudurlugu: string | null
          gorev_unvan_id: number | null; gorev_unvani: string | null; vekil: string | null; gorev_mudurlugu: string | null
          meslegi: string | null; memuriyet_tarihi: string | null; kuruma_giris_tarihi: string | null
          gelis_nedeni: string | null; geldigi_yer: string | null; ayrilis_tarihi: string | null
          ayrilis_nedeni: string | null; gittigi_yer: string | null; aciklama: string | null
          durumu: 'Dolu' | 'Vekil' | 'Boş' | 'İptal'; created_at: string; updated_at: string
        }
        Insert: {
          id?: number; public_id?: string; meclis_karar_tarihi?: string | null; meclis_karar_no?: string | null
          iptal_karar_tarihi?: string | null; iptal_karar_no?: string | null
          kadro_sira_no?: string | null; kadro_derecesi?: string | null; statu?: string | null
          kadro_unvan_id?: number | null; kadro_unvani?: string | null; asil?: string | null; kadro_mudurlugu?: string | null
          gorev_unvan_id?: number | null; gorev_unvani?: string | null; vekil?: string | null; gorev_mudurlugu?: string | null
          meslegi?: string | null; memuriyet_tarihi?: string | null; kuruma_giris_tarihi?: string | null
          gelis_nedeni?: string | null; geldigi_yer?: string | null; ayrilis_tarihi?: string | null
          ayrilis_nedeni?: string | null; gittigi_yer?: string | null; aciklama?: string | null
          durumu?: 'Dolu' | 'Vekil' | 'Boş' | 'İptal'; created_at?: string; updated_at?: string
        }
        Update: {
          id?: number; public_id?: string; meclis_karar_tarihi?: string | null; meclis_karar_no?: string | null
          iptal_karar_tarihi?: string | null; iptal_karar_no?: string | null
          kadro_sira_no?: string | null; kadro_derecesi?: string | null; statu?: string | null
          kadro_unvan_id?: number | null; kadro_unvani?: string | null; asil?: string | null; kadro_mudurlugu?: string | null
          gorev_unvan_id?: number | null; gorev_unvani?: string | null; vekil?: string | null; gorev_mudurlugu?: string | null
          meslegi?: string | null; memuriyet_tarihi?: string | null; kuruma_giris_tarihi?: string | null
          gelis_nedeni?: string | null; geldigi_yer?: string | null; ayrilis_tarihi?: string | null
          ayrilis_nedeni?: string | null; gittigi_yer?: string | null; aciklama?: string | null
          durumu?: 'Dolu' | 'Vekil' | 'Boş' | 'İptal'; created_at?: string; updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "kadro_hareketleri_asil_fkey"; columns: ["asil"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] },
          { foreignKeyName: "kadro_hareketleri_vekil_fkey"; columns: ["vekil"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] },
          { foreignKeyName: "kadro_hareketleri_kadro_unvan_id_fkey"; columns: ["kadro_unvan_id"]; isOneToOne: false; referencedRelation: "tanim_unvan"; referencedColumns: ["id"] },
          { foreignKeyName: "kadro_hareketleri_gorev_unvan_id_fkey"; columns: ["gorev_unvan_id"]; isOneToOne: false; referencedRelation: "tanim_unvan"; referencedColumns: ["id"] }
        ]
      }
      personel_hareketleri: {
        Row: {
          id: number; public_id: string; sicil_no: string; hareket_tipi: string | null; kadro_sira_no: string | null
          yururluk_tarihi: string | null; adaylik_suresi: string | null
          asli_memuriyete_atanma_tarihi: string | null; eski_gorev_yeri: string | null
          eski_unvan: string | null; eski_sinif: string | null; eski_kadro_derecesi: string | null
          eski_kha_derece: string | null; eski_kha_kademe: string | null
          eski_ekea_derece: string | null; eski_ekea_kademe: string | null
          eski_kidem_yili: string | null; eski_oht: string | null; eski_igz: string | null
          eski_ek_odeme: string | null; eski_ek_gosterge: string | null
          yeni_gorev_yeri: string | null; yeni_unvan: string | null; yeni_sinif: string | null
          yeni_kadro_derecesi: string | null; yeni_kha_derece: string | null
          yeni_kha_kademe: string | null; yeni_ekea_derece: string | null
          yeni_ekea_kademe: string | null; yeni_kidem_yili: string | null
          yeni_oht: string | null; yeni_igz: string | null; yeni_ek_odeme: string | null
          yeni_ek_gosterge: string | null; dayanak: string | null; aciklama: string | null
          teklif_eden: string | null; onaylayan: string | null
          ise_baslama_tarihi: string | null; ayrilis_tarihi: string | null; ayrilis_nedeni: string | null
          kayit_tarihi: string | null; kayit_no: string | null
          dagitim_mudurlukleri: string | null; kayit_zamani: string
        }
        Insert: {
          id?: number; public_id?: string; sicil_no: string; hareket_tipi?: string | null; kadro_sira_no?: string | null
          yururluk_tarihi?: string | null; adaylik_suresi?: string | null
          asli_memuriyete_atanma_tarihi?: string | null; eski_gorev_yeri?: string | null
          eski_unvan?: string | null; eski_sinif?: string | null; eski_kadro_derecesi?: string | null
          eski_kha_derece?: string | null; eski_kha_kademe?: string | null
          eski_ekea_derece?: string | null; eski_ekea_kademe?: string | null
          eski_kidem_yili?: string | null; eski_oht?: string | null; eski_igz?: string | null
          eski_ek_odeme?: string | null; eski_ek_gosterge?: string | null
          yeni_gorev_yeri?: string | null; yeni_unvan?: string | null; yeni_sinif?: string | null
          yeni_kadro_derecesi?: string | null; yeni_kha_derece?: string | null
          yeni_kha_kademe?: string | null; yeni_ekea_derece?: string | null
          yeni_ekea_kademe?: string | null; yeni_kidem_yili?: string | null
          yeni_oht?: string | null; yeni_igz?: string | null; yeni_ek_odeme?: string | null
          yeni_ek_gosterge?: string | null; dayanak?: string | null; aciklama?: string | null
          teklif_eden?: string | null; onaylayan?: string | null
          ise_baslama_tarihi?: string | null; ayrilis_tarihi?: string | null; ayrilis_nedeni?: string | null
          kayit_tarihi?: string | null; kayit_no?: string | null
          dagitim_mudurlukleri?: string | null; kayit_zamani?: string
        }
        Update: {
          id?: number; public_id?: string; sicil_no?: string; hareket_tipi?: string | null; kadro_sira_no?: string | null
          yururluk_tarihi?: string | null; adaylik_suresi?: string | null
          asli_memuriyete_atanma_tarihi?: string | null; eski_gorev_yeri?: string | null
          eski_unvan?: string | null; eski_sinif?: string | null; eski_kadro_derecesi?: string | null
          eski_kha_derece?: string | null; eski_kha_kademe?: string | null
          eski_ekea_derece?: string | null; eski_ekea_kademe?: string | null
          eski_kidem_yili?: string | null; eski_oht?: string | null; eski_igz?: string | null
          eski_ek_odeme?: string | null; eski_ek_gosterge?: string | null
          yeni_gorev_yeri?: string | null; yeni_unvan?: string | null; yeni_sinif?: string | null
          yeni_kadro_derecesi?: string | null; yeni_kha_derece?: string | null
          yeni_kha_kademe?: string | null; yeni_ekea_derece?: string | null
          yeni_ekea_kademe?: string | null; yeni_kidem_yili?: string | null
          yeni_oht?: string | null; yeni_igz?: string | null; yeni_ek_odeme?: string | null
          yeni_ek_gosterge?: string | null; dayanak?: string | null; aciklama?: string | null
          teklif_eden?: string | null; onaylayan?: string | null
          ise_baslama_tarihi?: string | null; ayrilis_tarihi?: string | null; ayrilis_nedeni?: string | null
          kayit_tarihi?: string | null; kayit_no?: string | null
          dagitim_mudurlukleri?: string | null; kayit_zamani?: string
        }
        Relationships: [{ foreignKeyName: "personel_hareketleri_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }]
      }
      personel_audit_log: {
        Row: {
          id: number; sicil_no: string | null; modul: string; islem: string; ozet: string
          actor_id: string | null; actor_email: string | null
          ref_table: string | null; ref_id: string | null
          onceki: Json | null; sonraki: Json | null; created_at: string
        }
        Insert: {
          id?: number; sicil_no?: string | null; modul: string; islem: string; ozet: string
          actor_id?: string | null; actor_email?: string | null
          ref_table?: string | null; ref_id?: string | null
          onceki?: Json | null; sonraki?: Json | null; created_at?: string
        }
        Update: {
          id?: number; sicil_no?: string; modul?: string; islem?: string; ozet?: string
          actor_id?: string | null; actor_email?: string | null
          ref_table?: string | null; ref_id?: string | null
          onceki?: Json | null; sonraki?: Json | null; created_at?: string
        }
        Relationships: [
          { foreignKeyName: "personel_audit_log_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] },
          { foreignKeyName: "personel_audit_log_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }
        ]
      }
      terfi_hareketleri: {
        Row: {
          id: number; sicil_no: string; ad_soyad: string | null; rol: string | null
          kadro_sira_no: string | null; unvan: string | null; mudurluk: string | null
          gorev_ayligi_derece: string | null; gorev_ayligi_kademe: string | null
          kha_derece: string | null; kha_kademe: string | null; kha_tarihi: string | null
          ekea_derece: string | null; ekea_kademe: string | null; ekea_tarihi: string | null
          kidem_yili: string | null; kidem_tarihi: string | null
          iyi_hal_terfi_tarihi: string | null; ek_gosterge: string | null
          ek_odeme: string | null; oht: string | null; yan_odeme: string | null
          sds_orani: string | null; kayit_zamani: string
        }
        Insert: {
          id?: number; sicil_no: string; ad_soyad?: string | null; rol?: string | null
          kadro_sira_no?: string | null; unvan?: string | null; mudurluk?: string | null
          gorev_ayligi_derece?: string | null; gorev_ayligi_kademe?: string | null
          kha_derece?: string | null; kha_kademe?: string | null; kha_tarihi?: string | null
          ekea_derece?: string | null; ekea_kademe?: string | null; ekea_tarihi?: string | null
          kidem_yili?: string | null; kidem_tarihi?: string | null
          iyi_hal_terfi_tarihi?: string | null; ek_gosterge?: string | null
          ek_odeme?: string | null; oht?: string | null; yan_odeme?: string | null
          sds_orani?: string | null; kayit_zamani?: string
        }
        Update: {
          id?: number; sicil_no?: string; ad_soyad?: string | null; rol?: string | null
          kadro_sira_no?: string | null; unvan?: string | null; mudurluk?: string | null
          gorev_ayligi_derece?: string | null; gorev_ayligi_kademe?: string | null
          kha_derece?: string | null; kha_kademe?: string | null; kha_tarihi?: string | null
          ekea_derece?: string | null; ekea_kademe?: string | null; ekea_tarihi?: string | null
          kidem_yili?: string | null; kidem_tarihi?: string | null
          iyi_hal_terfi_tarihi?: string | null; ek_gosterge?: string | null
          ek_odeme?: string | null; oht?: string | null; yan_odeme?: string | null
          sds_orani?: string | null; kayit_zamani?: string
        }
        Relationships: [{ foreignKeyName: "terfi_hareketleri_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }]
      }
      // ─────────────────── İZİN ───────────────────
      izin_hareketleri: {
        Row: {
          id: number; public_id: string; yil: number; sira_no: string | null; islem_yapan: string | null
          sicil_no: string; vekalet: string | null; tur: string; ayrilis: string | null
          baslama: string | null; gun: number
          durum: 'Taslak' | 'Onaylandı' | 'Değiştirildi' | 'İptal Edildi'
          aciklama: string | null; bilgi: string | null; kayit_tarihi: string
        }
        Insert: {
          id?: number; public_id?: string; yil: number; sira_no?: string | null; islem_yapan?: string | null
          sicil_no: string; vekalet?: string | null; tur: string; ayrilis?: string | null
          baslama?: string | null; gun?: number
          durum?: 'Taslak' | 'Onaylandı' | 'Değiştirildi' | 'İptal Edildi'
          aciklama?: string | null; bilgi?: string | null; kayit_tarihi?: string
        }
        Update: {
          id?: number; public_id?: string; yil?: number; sira_no?: string | null; islem_yapan?: string | null
          sicil_no?: string; vekalet?: string | null; tur?: string; ayrilis?: string | null
          baslama?: string | null; gun?: number
          durum?: 'Taslak' | 'Onaylandı' | 'Değiştirildi' | 'İptal Edildi'
          aciklama?: string | null; bilgi?: string | null; kayit_tarihi?: string
        }
        Relationships: [{ foreignKeyName: "izin_hareketleri_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }]
      }
      izin_haklari: {
        Row: {
          id: number; yil: number; sicil_no: string; devreden_gun: number
          hak_edilen_gun: number; kullanilan_gun: number; kalan_gun: number; updated_at: string
        }
        Insert: {
          id?: number; yil: number; sicil_no: string; devreden_gun?: number
          hak_edilen_gun?: number; kullanilan_gun?: number; updated_at?: string
        }
        Update: {
          id?: number; yil?: number; sicil_no?: string; devreden_gun?: number
          hak_edilen_gun?: number; kullanilan_gun?: number; updated_at?: string
        }
        Relationships: [{ foreignKeyName: "izin_haklari_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }]
      }
      rapor_izin_excel_gecmis: {
        Row: {
          id: number; user_id: string; yil: number
          sira_bas: number; sira_bit: number; kayit_sayisi: number; created_at: string
          actor_email: string | null
          izin_ids: Json
        }
        Insert: {
          id?: number; user_id: string; yil: number
          sira_bas: number; sira_bit: number; kayit_sayisi?: number; created_at?: string
          actor_email?: string | null
          izin_ids?: Json
        }
        Update: {
          id?: number; user_id?: string; yil?: number
          sira_bas?: number; sira_bit?: number; kayit_sayisi?: number; created_at?: string
          actor_email?: string | null
          izin_ids?: Json
        }
        Relationships: []
      }
      // ─────────────────── BİLDİRİM ───────────────────
      calisan_ogrenim: {
        Row:    { id: number; sicil_no: string; ogrenim_turu: string | null; okul_adi: string | null; bolum: string | null; mezuniyet_yili: number | null; mezuniyet_tarihi: string | null; meslegi: string | null; varsayilan: boolean; aktif: boolean; kayit_zamani: string }
        Insert: { id?: number; sicil_no: string; ogrenim_turu?: string | null; okul_adi?: string | null; bolum?: string | null; mezuniyet_yili?: number | null; mezuniyet_tarihi?: string | null; meslegi?: string | null; varsayilan?: boolean; aktif?: boolean; kayit_zamani?: string }
        Update: { id?: number; sicil_no?: string; ogrenim_turu?: string | null; okul_adi?: string | null; bolum?: string | null; mezuniyet_yili?: number | null; mezuniyet_tarihi?: string | null; meslegi?: string | null; varsayilan?: boolean; aktif?: boolean; kayit_zamani?: string }
        Relationships: [{ foreignKeyName: "calisan_ogrenim_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }]
      }
      aile_bildirimi: {
        Row: {
          id: number; sicil_no: string; medeni_hal: string | null
          esin_ad_soyad: string | null; esin_tckn: string | null
          is_durumu: string | null; gelir_durumu: string | null
          cocuklar_json: Json; kayit_zamani: string
        }
        Insert: {
          id?: number; sicil_no: string; medeni_hal?: string | null
          esin_ad_soyad?: string | null; esin_tckn?: string | null
          is_durumu?: string | null; gelir_durumu?: string | null
          cocuklar_json?: Json; kayit_zamani?: string
        }
        Update: {
          id?: number; sicil_no?: string; medeni_hal?: string | null
          esin_ad_soyad?: string | null; esin_tckn?: string | null
          is_durumu?: string | null; gelir_durumu?: string | null
          cocuklar_json?: Json; kayit_zamani?: string
        }
        Relationships: [{ foreignKeyName: "aile_bildirimi_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: true; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }]
      }
      mal_bildirimi: {
        Row: {
          id: number
          public_id: string
          sicil_no: string; kimlik_json: Json; tasinmaz_json: Json
          kooperatif_json: Json; tasitlar_json: Json; diger_tasinirlar_json: Json
          banka_menkul_json: Json; altin_mucevher_json: Json; borc_alacak_json: Json
          haklar_json: Json; son_net_maas: number | null; aciklama: string | null
          beyan_turu: string | null; onay_tarihi: string | null; kayit_zamani: string
        }
        Insert: {
          id?: number
          public_id?: string
          sicil_no: string; kimlik_json?: Json; tasinmaz_json?: Json
          kooperatif_json?: Json; tasitlar_json?: Json; diger_tasinirlar_json?: Json
          banka_menkul_json?: Json; altin_mucevher_json?: Json; borc_alacak_json?: Json
          haklar_json?: Json; son_net_maas?: number | null; aciklama?: string | null
          beyan_turu?: string | null; onay_tarihi?: string | null; kayit_zamani?: string
        }
        Update: {
          id?: number
          public_id?: string
          sicil_no?: string; kimlik_json?: Json; tasinmaz_json?: Json
          kooperatif_json?: Json; tasitlar_json?: Json; diger_tasinirlar_json?: Json
          banka_menkul_json?: Json; altin_mucevher_json?: Json; borc_alacak_json?: Json
          haklar_json?: Json; son_net_maas?: number | null; aciklama?: string | null
          beyan_turu?: string | null; onay_tarihi?: string | null; kayit_zamani?: string
        }
        Relationships: [{ foreignKeyName: "mal_bildirimi_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }]
      }
      /** `/link/{slug}` çözümlemesi — kind genişleyecek */
      app_links: {
        Row: {
          slug: string
          kind: string
          ref_key: string
          created_at: string
        }
        Insert: {
          slug: string
          kind: string
          ref_key: string
          created_at?: string
        }
        Update: {
          slug?: string
          kind?: string
          ref_key?: string
          created_at?: string
        }
        Relationships: []
      }
      app_profiles: {
        Row: {
          id: string
          sicil_no: string
          rol: 'admin' | 'kullanici'
          hesap_aktif: boolean
          menu_izinleri: Json
          updated_at: string
          kullanici_adi: string | null
          ilk_giris_tamam: boolean
          kurtarma_hash: Json
        }
        Insert: {
          id: string
          sicil_no: string
          rol?: 'admin' | 'kullanici'
          hesap_aktif?: boolean
          menu_izinleri?: Json
          updated_at?: string
          kullanici_adi?: string | null
          ilk_giris_tamam?: boolean
          kurtarma_hash?: Json
        }
        Update: {
          id?: string
          sicil_no?: string
          rol?: 'admin' | 'kullanici'
          hesap_aktif?: boolean
          menu_izinleri?: Json
          updated_at?: string
          kullanici_adi?: string | null
          ilk_giris_tamam?: boolean
          kurtarma_hash?: Json
        }
        Relationships: []
      }
      // ─────────────────── KESİNTİLER ───────────────────
      aylik_yemek_yeni_donem: {
        Row: {
          id: number; yil: number; sira_no: string | null; donem_adi: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'
          ihb_az_row: number | null; created_at: string; kapatildi_at: string | null
        }
        Insert: {
          id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'
          ihb_az_row?: number | null; created_at?: string; kapatildi_at?: string | null
        }
        Update: {
          id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'
          ihb_az_row?: number | null; created_at?: string; kapatildi_at?: string | null
        }
        Relationships: []
      }
      aylik_yemek_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: [{ foreignKeyName: "ayy_secim_donem_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "aylik_yemek_yeni_donem"; referencedColumns: ["id"] }]
      }
      ayy_zabita_normal_kesinti_sicil: {
        Row:    { sicil_no: string; created_at: string }
        Insert: { sicil_no: string; created_at?: string }
        Update: { sicil_no?: string; created_at?: string }
        Relationships: []
      }
      raporlu_memurlar_yeni_donem: {
        Row: {
          id: number; yil: number; sira_no: string | null; donem_adi: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string
        }
        Insert: {
          id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Update: {
          id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Relationships: []
      }
      raporlu_memurlar_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: []
      }
      izinli_vekiller_yeni_donem: {
        Row: {
          id: number; yil: number; sira_no: string | null; donem_adi: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string
        }
        Insert: {
          id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Update: {
          id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Relationships: []
      }
      izinli_vekiller_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: []
      }
      izinli_zabitalar_yeni_donem: {
        Row: {
          id: number; yil: number; sira_no: string | null; donem_adi: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string
        }
        Insert: {
          id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Update: {
          id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Relationships: []
      }
      izinli_zabitalar_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: []
      }
      yevmiye_donem: {
        Row: {
          id: number; yil: number; sira_no: string | null; donem_adi: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string
        }
        Insert: {
          id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Update: {
          id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null
          baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Relationships: []
      }
      yevmiye_puantaj_kayit: {
        Row: {
          id: number; donem_id: number; mudurluk: string; sicil_no: string
          tarih: string; deger: string | null; fazla_mesai_saat: number
        }
        Insert: {
          id?: number; donem_id: number; mudurluk: string; sicil_no: string
          tarih: string; deger?: string | null; fazla_mesai_saat?: number
        }
        Update: {
          id?: number; donem_id?: number; mudurluk?: string; sicil_no?: string
          tarih?: string; deger?: string | null; fazla_mesai_saat?: number
        }
        Relationships: []
      }
      // ─────────────────── EĞİTİM ───────────────────
      egitim_takvimi_donem: {
        Row: {
          id: number; yil: number; sira_no: string | null; donem_adi: string
          baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string
        }
        Insert: {
          id?: number; yil: number; sira_no?: string | null; donem_adi: string
          baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Update: {
          id?: number; yil?: number; sira_no?: string | null; donem_adi?: string
          baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string
        }
        Relationships: []
      }
      egitim_takvimi_egitim: {
        Row: {
          id: number; donem_id: number; egitim_adi: string; kanal: string | null
          egitim_baslangic: string | null; egitim_bitis: string | null; sure_dakika: number
          kisa_ad: string | null; program: 'Evet' | 'Hayır'; katilimci_sayisi: number; created_at: string
        }
        Insert: {
          id?: number; donem_id: number; egitim_adi: string; kanal?: string | null
          egitim_baslangic?: string | null; egitim_bitis?: string | null; sure_dakika?: number
          kisa_ad?: string | null; program?: 'Evet' | 'Hayır'; katilimci_sayisi?: number; created_at?: string
        }
        Update: {
          id?: number; donem_id?: number; egitim_adi?: string; kanal?: string | null
          egitim_baslangic?: string | null; egitim_bitis?: string | null; sure_dakika?: number
          kisa_ad?: string | null; program?: 'Evet' | 'Hayır'; katilimci_sayisi?: number; created_at?: string
        }
        Relationships: [{ foreignKeyName: "egitim_takvimi_egitim_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "egitim_takvimi_donem"; referencedColumns: ["id"] }]
      }
      egitim_istatistik_katilim: {
        Row:    { id: number; donem_id: number; egitim_id: number; sicil_no: string; mudurluk: string | null }
        Insert: { id?: number; donem_id: number; egitim_id: number; sicil_no: string; mudurluk?: string | null }
        Update: { id?: number; donem_id?: number; egitim_id?: number; sicil_no?: string; mudurluk?: string | null }
        Relationships: []
      }
      // ─────────────────── FİRMA ÇALIŞANLARI ───────────────────
      firma_calisanlar: {
        Row: {
          id: number; public_id: string; sira_no: string | null; sicil_no: string | null; tckn: string | null
          ad_soyad: string; cinsiyet: string | null; dogum_tarihi: string | null
          ogrenim: string | null; telefon: string | null; e_posta: string | null; kuruma_giris_tarihi: string | null
          gorev_mudurlugu: string | null; gorevi: string | null; meslegi: string | null
          ayrilis_tarihi: string | null; ayrilis_nedeni: string | null; kayit_zamani: string
          yerleske_adresi_id: number | null
        }
        Insert: {
          id?: number; public_id?: string; sira_no?: string | null; sicil_no?: string | null; tckn?: string | null
          ad_soyad: string; cinsiyet?: string | null; dogum_tarihi?: string | null
          ogrenim?: string | null; telefon?: string | null; e_posta?: string | null; kuruma_giris_tarihi?: string | null
          gorev_mudurlugu?: string | null; gorevi?: string | null; meslegi?: string | null
          ayrilis_tarihi?: string | null; ayrilis_nedeni?: string | null; kayit_zamani?: string
          yerleske_adresi_id?: number | null
        }
        Update: {
          id?: number; public_id?: string; sira_no?: string | null; sicil_no?: string | null; tckn?: string | null
          ad_soyad?: string; cinsiyet?: string | null; dogum_tarihi?: string | null
          ogrenim?: string | null; telefon?: string | null; e_posta?: string | null; kuruma_giris_tarihi?: string | null
          gorev_mudurlugu?: string | null; gorevi?: string | null; meslegi?: string | null
          ayrilis_tarihi?: string | null; ayrilis_nedeni?: string | null; kayit_zamani?: string
          yerleske_adresi_id?: number | null
        }
        Relationships: []
      }
      // ─────────────────── TERFİ DÖNEM ─────────────────
      terfi_donem: {
        Row:    { id: number; yil: number; sira_no: string | null; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string }
        Insert: { id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Update: { id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Relationships: []
      }
      terfi_donem_islem_log: {
        Row: {
          id: number; donem_id: number; sicil_no: string; terfi_id: number
          onceki: Json; sonraki: Json; islem_tarihi: string
          geri_alindi: boolean; geri_alma_tarihi: string | null
        }
        Insert: {
          id?: number; donem_id: number; sicil_no: string; terfi_id: number
          onceki: Json; sonraki: Json; islem_tarihi?: string
          geri_alindi?: boolean; geri_alma_tarihi?: string | null
        }
        Update: {
          id?: number; donem_id?: number; sicil_no?: string; terfi_id?: number
          onceki?: Json; sonraki?: Json; islem_tarihi?: string
          geri_alindi?: boolean; geri_alma_tarihi?: string | null
        }
        Relationships: [
          { foreignKeyName: "terfi_donem_islem_log_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "terfi_donem"; referencedColumns: ["id"] },
          { foreignKeyName: "terfi_donem_islem_log_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] },
          { foreignKeyName: "terfi_donem_islem_log_terfi_id_fkey"; columns: ["terfi_id"]; isOneToOne: false; referencedRelation: "terfi_hareketleri"; referencedColumns: ["id"] }
        ]
      }
      // ─────────────────── ARAZİ PUANTAJI ─────────────────
      arazi_donem: {
        Row:    { id: number; yil: number; sira_no: string | null; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string }
        Insert: { id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Update: { id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Relationships: []
      }
      arazi_kayit: {
        Row:    { id: number; donem_id: number; sicil_no: string; tarih: string }
        Insert: { id?: number; donem_id: number; sicil_no: string; tarih: string }
        Update: { id?: number; donem_id?: number; sicil_no?: string; tarih?: string }
        Relationships: [
          { foreignKeyName: "arazi_kayit_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "arazi_donem"; referencedColumns: ["id"] },
          { foreignKeyName: "arazi_kayit_sicil_no_fkey"; columns: ["sicil_no"]; isOneToOne: false; referencedRelation: "calisan"; referencedColumns: ["sicil_no"] }
        ]
      }
    }

    Views: {
      aktif_personel: {
        Row: {
          sicil_no: string; ad_soyad: string; tckn: string | null
          yeni_gorev_yeri: string | null; yeni_unvan: string | null
          yeni_sinif: string | null; ayrilis_tarihi: string | null
        }
        Relationships: []
      }
      personel_kadro_ozet: {
        Row: {
          sicil_no: string; ad_soyad: string; tckn: string | null
          kadro_sira_no: string | null; kadro_unvani: string | null
          kadro_derecesi: string | null; statu: string | null; gorev_unvani: string | null
          kadro_mudurlugu: string | null; gorev_mudurlugu: string | null
          kadro_durumu: 'Dolu' | 'Vekil' | 'Boş' | 'İptal' | null
          memuriyet_tarihi: string | null; kuruma_giris_tarihi: string | null
        }
        Relationships: []
      }
    }

    // ─────────────────── KESİNTİLER ─────────────────────

      aylik_yemek_yeni_donem: {
        Row:    { id: number; yil: number; sira_no: string | null; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; ihb_az_row: number | null; created_at: string; kapatildi_at: string | null }
        Insert: { id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; ihb_az_row?: number | null; created_at?: string; kapatildi_at?: string | null }
        Update: { id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; ihb_az_row?: number | null; created_at?: string; kapatildi_at?: string | null }
        Relationships: []
      }
      aylik_yemek_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: [{ foreignKeyName: "aylik_yemek_yeni_secim_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "aylik_yemek_yeni_donem"; referencedColumns: ["id"] }]
      }
      ayy_zabita_normal_kesinti_sicil: {
        Row:    { sicil_no: string; created_at: string }
        Insert: { sicil_no: string; created_at?: string }
        Update: { sicil_no?: string; created_at?: string }
        Relationships: []
      }
      raporlu_memurlar_yeni_donem: {
        Row:    { id: number; yil: number; sira_no: string | null; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string }
        Insert: { id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Update: { id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Relationships: []
      }
      raporlu_memurlar_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: [{ foreignKeyName: "raporlu_memurlar_yeni_secim_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "raporlu_memurlar_yeni_donem"; referencedColumns: ["id"] }]
      }
      izinli_vekiller_yeni_donem: {
        Row:    { id: number; yil: number; sira_no: string | null; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string }
        Insert: { id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Update: { id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Relationships: []
      }
      izinli_vekiller_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: [{ foreignKeyName: "izinli_vekiller_yeni_secim_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "izinli_vekiller_yeni_donem"; referencedColumns: ["id"] }]
      }
      izinli_zabitalar_yeni_donem: {
        Row:    { id: number; yil: number; sira_no: string | null; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string }
        Insert: { id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Update: { id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Relationships: []
      }
      izinli_zabitalar_yeni_secim: {
        Row:    { id: number; donem_id: number; izin_sira_no: string; dahil: boolean }
        Insert: { id?: number; donem_id: number; izin_sira_no: string; dahil?: boolean }
        Update: { id?: number; donem_id?: number; izin_sira_no?: string; dahil?: boolean }
        Relationships: [{ foreignKeyName: "izinli_zabitalar_yeni_secim_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "izinli_zabitalar_yeni_donem"; referencedColumns: ["id"] }]
      }
      yevmiye_donem: {
        Row:    { id: number; yil: number; sira_no: string | null; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: 'Açık' | 'Kapalı'; created_at: string }
        Insert: { id?: number; yil: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Update: { id?: number; yil?: number; sira_no?: string | null; donem_adi?: string | null; baslangic_tarihi?: string; bitis_tarihi?: string; durum?: 'Açık' | 'Kapalı'; created_at?: string }
        Relationships: []
      }
      yevmiye_puantaj_kayit: {
        Row:    { id: number; donem_id: number; mudurluk: string; sicil_no: string; tarih: string; deger: string | null; fazla_mesai_saat: number | null }
        Insert: { id?: number; donem_id: number; mudurluk: string; sicil_no: string; tarih: string; deger?: string | null; fazla_mesai_saat?: number | null }
        Update: { id?: number; donem_id?: number; mudurluk?: string; sicil_no?: string; tarih?: string; deger?: string | null; fazla_mesai_saat?: number | null }
        Relationships: [{ foreignKeyName: "yevmiye_puantaj_kayit_donem_id_fkey"; columns: ["donem_id"]; isOneToOne: false; referencedRelation: "yevmiye_donem"; referencedColumns: ["id"] }]
      }

    Functions: {
      dogrula_sifre_sifirla_kimlik: {
        Args: { p_email: string; p_sicil: string; p_tckn: string }
        Returns: boolean
      }
    }
    Enums:          { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// ─── Kullanım Kolaylığı Tip Yardımcıları ───────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

// ─── Hazır Tip Kısayolları ─────────────────────────────────────────────────

export type Calisan           = Tables<'calisan'>
export type KadroHareketi    = Tables<'kadro_hareketleri'>
export type PersonelHareketi  = Tables<'personel_hareketleri'>
export type PersonelAuditLog  = Tables<'personel_audit_log'>
export type TerfiHareketi    = Tables<'terfi_hareketleri'>
export type IzinHareketi     = Tables<'izin_hareketleri'>
export type IzinHakki        = Tables<'izin_haklari'>
export type AileBildirimi    = Tables<'aile_bildirimi'>
export type MalBildirimi     = Tables<'mal_bildirimi'>
export type FirmaCalisan     = Tables<'firma_calisanlar'>
export type PersonelKadroOzet = Views<'personel_kadro_ozet'>
