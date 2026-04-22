alter table public.tanim_mudurluk
add column if not exists tehlike_sinifi text not null default 'Az Tehlikeli';

alter table public.tanim_mudurluk
drop constraint if exists tanim_mudurluk_tehlike_sinifi_check;

alter table public.tanim_mudurluk
add constraint tanim_mudurluk_tehlike_sinifi_check
check (tehlike_sinifi in ('Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'));

alter table public.calisan
add column if not exists sgk_ssk_sicil_no text null;
