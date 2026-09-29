-- Çakışan personel kullanıcı adlarını ayır, boş olmayan adları tekilleştir.

update public.app_profiles set kullanici_adi = 'OZLEMS', updated_at = now() where sicil_no = '272';
update public.app_profiles set kullanici_adi = 'OMERB', updated_at = now() where sicil_no = '457';
update public.app_profiles set kullanici_adi = 'ELIF', updated_at = now() where sicil_no = '397';
update public.app_profiles set kullanici_adi = 'LEVENTH', updated_at = now() where sicil_no = '421';
update public.app_profiles set kullanici_adi = 'BUSRADISLI', updated_at = now() where sicil_no = '237';
update public.app_profiles set kullanici_adi = 'ABAY', updated_at = now() where sicil_no = '428';
update public.app_profiles set kullanici_adi = 'SEYMANUR', updated_at = now() where sicil_no = '473';
update public.app_profiles set kullanici_adi = 'SERDARY', updated_at = now() where sicil_no = '197';
update public.app_profiles set kullanici_adi = 'AKSAKAL', updated_at = now() where sicil_no = '187';
update public.app_profiles set kullanici_adi = 'SAFITURK', updated_at = now() where sicil_no = '176';

-- Adı değişenlere bir kez gösterilecek duyuru. Kapatılmışsa yeniden açma.
update public.app_profiles
set kurtarma_hash = coalesce(kurtarma_hash, '{}'::jsonb)
  || jsonb_build_object('kullanici_adi_duyuru', 'degisti')
where sicil_no in ('272', '457', '397', '421', '237', '428', '473', '197', '187', '176')
  and coalesce(kurtarma_hash->>'kullanici_adi_duyuru_goruldu', '') <> 'true'
  and coalesce(kurtarma_hash->>'kullanici_adi_duyuru', '') = '';

-- Kullanıcı adı olan diğer personel: e-posta yanında ad ile de girilebileceğini bir kez bildir.
update public.app_profiles
set kurtarma_hash = coalesce(kurtarma_hash, '{}'::jsonb)
  || jsonb_build_object('kullanici_adi_duyuru', 'ipucu')
where nullif(btrim(kullanici_adi), '') is not null
  and coalesce(profil_turu, 'personel') <> 'dis_denetci'
  and not (sicil_no = any (array['272', '457', '397', '421', '237', '428', '473', '197', '187', '176']))
  and coalesce(kurtarma_hash->>'kullanici_adi_duyuru_goruldu', '') <> 'true'
  and coalesce(kurtarma_hash->>'kullanici_adi_duyuru', '') = '';

create unique index if not exists app_profiles_kullanici_adi_key
  on public.app_profiles (upper(btrim(kullanici_adi)))
  where nullif(btrim(kullanici_adi), '') is not null;

comment on column public.app_profiles.kullanici_adi is
  'Benzersiz kullanıcı adı (A–Z ve 0–9, büyük harf). Girişte e-posta yerine kullanılabilir.';
