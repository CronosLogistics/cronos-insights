ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Só o servidor (service role) ou administradores alteram o indicador de senha temporária.
CREATE OR REPLACE FUNCTION public.proteger_must_change_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     AND auth.role() = 'authenticated'
     AND NOT public.tem_papel(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Alteração não permitida' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_must_change_password ON public.perfis;
CREATE TRIGGER trg_proteger_must_change_password
BEFORE UPDATE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.proteger_must_change_password();