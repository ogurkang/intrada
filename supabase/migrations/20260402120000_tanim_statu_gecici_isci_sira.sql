-- Geçici İşçi, İşçi statüsünün hemen altında konumlansın
DO $$
DECLARE
  v_isci_id   integer;
  v_isci_sira integer;
  v_gecici_id integer;
BEGIN
  SELECT id, sira_no
  INTO v_isci_id, v_isci_sira
  FROM public.tanim_statu
  WHERE lower(trim(statu_adi)) = lower('İşçi')
  ORDER BY id
  LIMIT 1;

  SELECT id
  INTO v_gecici_id
  FROM public.tanim_statu
  WHERE lower(trim(statu_adi)) = lower('Geçici İşçi')
  ORDER BY id
  LIMIT 1;

  IF v_isci_id IS NULL OR v_gecici_id IS NULL THEN
    RETURN;
  END IF;

  IF v_isci_sira IS NULL THEN
    -- İşçi için sıra yoksa güvenli varsayılan sıraya çek
    SELECT COALESCE(MAX(sira_no), 0) + 1
    INTO v_isci_sira
    FROM public.tanim_statu;

    UPDATE public.tanim_statu
    SET sira_no = v_isci_sira
    WHERE id = v_isci_id;
  END IF;

  -- İşçi'nin altına yer aç
  UPDATE public.tanim_statu
  SET sira_no = sira_no + 1
  WHERE id <> v_gecici_id
    AND sira_no IS NOT NULL
    AND sira_no > v_isci_sira;

  -- Geçici İşçi = İşçi + 1
  UPDATE public.tanim_statu
  SET sira_no = v_isci_sira + 1
  WHERE id = v_gecici_id;
END $$;

