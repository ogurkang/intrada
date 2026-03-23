-- Terfi: /link + public_id kaldırıldı; uygulama yolu env ile opak segment (proxy rewrite).

DROP TRIGGER IF EXISTS trg_terfi_hareketi_app_link_del ON public.terfi_hareketleri;
DROP TRIGGER IF EXISTS trg_terfi_hareketi_app_link ON public.terfi_hareketleri;
DROP FUNCTION IF EXISTS public.app_link_terfi_hareketi_del();
DROP FUNCTION IF EXISTS public.app_link_terfi_hareketi_ins();

DELETE FROM public.app_links WHERE kind = 'terfi_hareketi';

ALTER TABLE public.app_links DROP CONSTRAINT IF EXISTS app_links_kind_check;
ALTER TABLE public.app_links ADD CONSTRAINT app_links_kind_check
  CHECK (kind IN ('mal_bildirimi', 'personel', 'firma_calisan'));

DROP INDEX IF EXISTS terfi_hareketleri_public_id_key;
ALTER TABLE public.terfi_hareketleri DROP COLUMN IF EXISTS public_id;
