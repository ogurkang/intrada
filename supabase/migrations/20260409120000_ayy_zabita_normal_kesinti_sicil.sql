-- AYY: kadroda zabıta sayılan ama «normal memur» kesintisi uygulanacak siciller (havuz dışı).

CREATE TABLE IF NOT EXISTS public.ayy_zabita_normal_kesinti_sicil (
  sicil_no text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ayy_zabita_normal_kesinti_sicil IS
  'Bu siciller AYY özetinde zabıta değil, standart çalışma günü / YG−IZ kesintisi ile hesaplanır.';

ALTER TABLE public.ayy_zabita_normal_kesinti_sicil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.ayy_zabita_normal_kesinti_sicil;
CREATE POLICY "authenticated_full_access" ON public.ayy_zabita_normal_kesinti_sicil
  FOR ALL USING (auth.role() = 'authenticated');
