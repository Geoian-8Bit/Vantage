-- ============================================================================
-- Triggers de dominio para Vantage
-- ----------------------------------------------------------------------------
-- Aplicar tras policies.sql. Idempotente.
-- ============================================================================

-- ─── Auto-creación del space personal al registrarse ────────────────────────
-- Cuando Supabase Auth inserta una fila en auth.users, creamos automáticamente:
-- 1. Un space type='personal' propiedad del usuario.
-- 2. Una fila en space_members con role='owner'.
-- El usuario ya puede operar inmediatamente tras confirmar el magic link.

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_space_id uuid;
  v_display_name text;
BEGIN
  -- Nombre del space: name del raw_user_meta_data, fallback a la parte local
  -- del email, fallback a "Mi espacio".
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'Mi espacio'
  );

  INSERT INTO public.spaces (type, name, created_by)
  VALUES ('personal', v_display_name, NEW.id)
  RETURNING id INTO v_space_id;

  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (v_space_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
