-- ============================================================================
-- Row Level Security policies para Vantage
-- ----------------------------------------------------------------------------
-- Aplicar tras cada nueva migración Drizzle.
-- Idempotente: usa DROP POLICY IF EXISTS / CREATE POLICY.
-- ============================================================================

-- ─── Helpers ────────────────────────────────────────────────────────────────

-- Comprueba si el usuario autenticado es miembro de un space.
CREATE OR REPLACE FUNCTION public.is_space_member(_space_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE space_id = _space_id
      AND user_id = auth.uid()
  );
$$;

-- Comprueba si el usuario autenticado es owner de un space.
CREATE OR REPLACE FUNCTION public.is_space_owner(_space_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE space_id = _space_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

-- Comprueba si el usuario autenticado es superadmin global.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.superadmins
    WHERE user_id = auth.uid()
  );
$$;

-- Comprueba si un space es de tipo demo (lectura pública).
CREATE OR REPLACE FUNCTION public.is_demo_space(_space_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.spaces
    WHERE id = _space_id
      AND type = 'demo'
  );
$$;

-- ─── Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.spaces              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

-- ─── spaces ─────────────────────────────────────────────────────────────────
-- Visible si: eres miembro, es demo, o eres superadmin.
-- Crear: cualquier usuario autenticado (será owner por el trigger de espacio personal,
--   o crea uno household explícitamente).
-- Actualizar / borrar: solo owner o superadmin. Espacios demo no se borran por API.

DROP POLICY IF EXISTS spaces_select ON public.spaces;
CREATE POLICY spaces_select ON public.spaces
  FOR SELECT
  USING (
    type = 'demo'
    OR is_space_member(id)
    OR is_superadmin()
  );

DROP POLICY IF EXISTS spaces_insert ON public.spaces;
CREATE POLICY spaces_insert ON public.spaces
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS spaces_update ON public.spaces;
CREATE POLICY spaces_update ON public.spaces
  FOR UPDATE
  USING (is_space_owner(id) OR is_superadmin())
  WITH CHECK (is_space_owner(id) OR is_superadmin());

DROP POLICY IF EXISTS spaces_delete ON public.spaces;
CREATE POLICY spaces_delete ON public.spaces
  FOR DELETE
  USING (
    (is_space_owner(id) AND type <> 'demo')
    OR is_superadmin()
  );

-- ─── space_members ──────────────────────────────────────────────────────────
-- Visible si: eres miembro del mismo space, o superadmin.
-- Crear: solo owner del space o superadmin (la unión por invitación pasa por backend).
-- Actualizar / borrar: solo owner o superadmin.

DROP POLICY IF EXISTS space_members_select ON public.space_members;
CREATE POLICY space_members_select ON public.space_members
  FOR SELECT
  USING (is_space_member(space_id) OR is_superadmin());

DROP POLICY IF EXISTS space_members_insert ON public.space_members;
CREATE POLICY space_members_insert ON public.space_members
  FOR INSERT
  WITH CHECK (is_space_owner(space_id) OR is_superadmin());

DROP POLICY IF EXISTS space_members_update ON public.space_members;
CREATE POLICY space_members_update ON public.space_members
  FOR UPDATE
  USING (is_space_owner(space_id) OR is_superadmin())
  WITH CHECK (is_space_owner(space_id) OR is_superadmin());

DROP POLICY IF EXISTS space_members_delete ON public.space_members;
CREATE POLICY space_members_delete ON public.space_members
  FOR DELETE
  USING (is_space_owner(space_id) OR is_superadmin());

-- ─── space_invitations ──────────────────────────────────────────────────────
-- Visible si: miembro del space, o superadmin.
-- Crear / actualizar / borrar: solo owner del space o superadmin.

DROP POLICY IF EXISTS space_invitations_select ON public.space_invitations;
CREATE POLICY space_invitations_select ON public.space_invitations
  FOR SELECT
  USING (is_space_member(space_id) OR is_superadmin());

DROP POLICY IF EXISTS space_invitations_write ON public.space_invitations;
CREATE POLICY space_invitations_write ON public.space_invitations
  FOR ALL
  USING (is_space_owner(space_id) OR is_superadmin())
  WITH CHECK (is_space_owner(space_id) OR is_superadmin());

-- ─── superadmins ────────────────────────────────────────────────────────────
-- Cerrado total desde API. Solo se gestiona con service_role desde el dashboard
-- de Supabase. Los propios superadmins pueden leer la lista.

DROP POLICY IF EXISTS superadmins_select ON public.superadmins;
CREATE POLICY superadmins_select ON public.superadmins
  FOR SELECT
  USING (is_superadmin());

-- Sin INSERT/UPDATE/DELETE: cualquier intento desde API anon/authenticated falla.
-- Service role pasa por encima de RLS y puede modificar.

-- ─── audit_log ──────────────────────────────────────────────────────────────
-- Solo superadmin lee. Escribe el backend con service_role.

DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT
  USING (is_superadmin());

-- Sin INSERT/UPDATE/DELETE desde API. Service role escribe.

-- ─── Policy genérica para tablas de datos por space ─────────────────────────
-- categories, transactions, savings_accounts, debts, recurring_templates
-- Lectura: miembro, superadmin, o space demo.
-- Escritura: miembro del space (no demo) o superadmin.

-- categories ------------------------------------------------------------------
DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories
  FOR SELECT
  USING (
    is_demo_space(space_id)
    OR is_space_member(space_id)
    OR is_superadmin()
  );

DROP POLICY IF EXISTS categories_write ON public.categories;
CREATE POLICY categories_write ON public.categories
  FOR ALL
  USING (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  )
  WITH CHECK (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  );

-- transactions ----------------------------------------------------------------
DROP POLICY IF EXISTS transactions_select ON public.transactions;
CREATE POLICY transactions_select ON public.transactions
  FOR SELECT
  USING (
    is_demo_space(space_id)
    OR is_space_member(space_id)
    OR is_superadmin()
  );

DROP POLICY IF EXISTS transactions_write ON public.transactions;
CREATE POLICY transactions_write ON public.transactions
  FOR ALL
  USING (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  )
  WITH CHECK (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  );

-- savings_accounts ------------------------------------------------------------
DROP POLICY IF EXISTS savings_accounts_select ON public.savings_accounts;
CREATE POLICY savings_accounts_select ON public.savings_accounts
  FOR SELECT
  USING (
    is_demo_space(space_id)
    OR is_space_member(space_id)
    OR is_superadmin()
  );

DROP POLICY IF EXISTS savings_accounts_write ON public.savings_accounts;
CREATE POLICY savings_accounts_write ON public.savings_accounts
  FOR ALL
  USING (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  )
  WITH CHECK (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  );

-- debts -----------------------------------------------------------------------
DROP POLICY IF EXISTS debts_select ON public.debts;
CREATE POLICY debts_select ON public.debts
  FOR SELECT
  USING (
    is_demo_space(space_id)
    OR is_space_member(space_id)
    OR is_superadmin()
  );

DROP POLICY IF EXISTS debts_write ON public.debts;
CREATE POLICY debts_write ON public.debts
  FOR ALL
  USING (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  )
  WITH CHECK (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  );

-- recurring_templates ---------------------------------------------------------
DROP POLICY IF EXISTS recurring_templates_select ON public.recurring_templates;
CREATE POLICY recurring_templates_select ON public.recurring_templates
  FOR SELECT
  USING (
    is_demo_space(space_id)
    OR is_space_member(space_id)
    OR is_superadmin()
  );

DROP POLICY IF EXISTS recurring_templates_write ON public.recurring_templates;
CREATE POLICY recurring_templates_write ON public.recurring_templates
  FOR ALL
  USING (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  )
  WITH CHECK (
    (is_space_member(space_id) AND NOT is_demo_space(space_id))
    OR is_superadmin()
  );
