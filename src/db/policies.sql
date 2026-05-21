-- ============================================================================
-- Row Level Security policies para Vantage
-- ----------------------------------------------------------------------------
-- Aplicar tras cada nueva migración Drizzle.
-- Idempotente: usa DROP POLICY IF EXISTS / CREATE POLICY y CREATE OR REPLACE.
--
-- Las helpers viven en un schema `private` no expuesto por PostgREST, para que
-- no sean callables como RPC desde el cliente. Las policies las invocan con
-- prefijo `private.*` y GRANT EXECUTE explícito.
-- ============================================================================

-- ─── Schema private ─────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.is_space_member(_space_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.is_space_owner(_space_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.is_demo_space(_space_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces WHERE id = _space_id AND type = 'demo'
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_space_member(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_space_owner(uuid)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_superadmin()       TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_demo_space(uuid)   TO anon, authenticated, service_role;

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

DROP POLICY IF EXISTS spaces_select ON public.spaces;
CREATE POLICY spaces_select ON public.spaces FOR SELECT
  USING (type = 'demo' OR private.is_space_member(id) OR private.is_superadmin());

DROP POLICY IF EXISTS spaces_insert ON public.spaces;
CREATE POLICY spaces_insert ON public.spaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS spaces_update ON public.spaces;
CREATE POLICY spaces_update ON public.spaces FOR UPDATE
  USING (private.is_space_owner(id) OR private.is_superadmin())
  WITH CHECK (private.is_space_owner(id) OR private.is_superadmin());

DROP POLICY IF EXISTS spaces_delete ON public.spaces;
CREATE POLICY spaces_delete ON public.spaces FOR DELETE
  USING ((private.is_space_owner(id) AND type <> 'demo') OR private.is_superadmin());

-- ─── space_members ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS space_members_select ON public.space_members;
CREATE POLICY space_members_select ON public.space_members FOR SELECT
  USING (private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS space_members_insert ON public.space_members;
CREATE POLICY space_members_insert ON public.space_members FOR INSERT
  WITH CHECK (private.is_space_owner(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS space_members_update ON public.space_members;
CREATE POLICY space_members_update ON public.space_members FOR UPDATE
  USING (private.is_space_owner(space_id) OR private.is_superadmin())
  WITH CHECK (private.is_space_owner(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS space_members_delete ON public.space_members;
CREATE POLICY space_members_delete ON public.space_members FOR DELETE
  USING (private.is_space_owner(space_id) OR private.is_superadmin());

-- ─── space_invitations ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS space_invitations_select ON public.space_invitations;
CREATE POLICY space_invitations_select ON public.space_invitations FOR SELECT
  USING (private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS space_invitations_write ON public.space_invitations;
CREATE POLICY space_invitations_write ON public.space_invitations FOR ALL
  USING (private.is_space_owner(space_id) OR private.is_superadmin())
  WITH CHECK (private.is_space_owner(space_id) OR private.is_superadmin());

-- ─── superadmins ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS superadmins_select ON public.superadmins;
CREATE POLICY superadmins_select ON public.superadmins FOR SELECT
  USING (private.is_superadmin());

-- ─── audit_log ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT
  USING (private.is_superadmin());

-- ─── categories ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories FOR SELECT
  USING (private.is_demo_space(space_id) OR private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS categories_write ON public.categories;
CREATE POLICY categories_write ON public.categories FOR ALL
  USING ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin())
  WITH CHECK ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin());

-- ─── transactions ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS transactions_select ON public.transactions;
CREATE POLICY transactions_select ON public.transactions FOR SELECT
  USING (private.is_demo_space(space_id) OR private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS transactions_write ON public.transactions;
CREATE POLICY transactions_write ON public.transactions FOR ALL
  USING ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin())
  WITH CHECK ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin());

-- ─── savings_accounts ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS savings_accounts_select ON public.savings_accounts;
CREATE POLICY savings_accounts_select ON public.savings_accounts FOR SELECT
  USING (private.is_demo_space(space_id) OR private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS savings_accounts_write ON public.savings_accounts;
CREATE POLICY savings_accounts_write ON public.savings_accounts FOR ALL
  USING ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin())
  WITH CHECK ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin());

-- ─── debts ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS debts_select ON public.debts;
CREATE POLICY debts_select ON public.debts FOR SELECT
  USING (private.is_demo_space(space_id) OR private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS debts_write ON public.debts;
CREATE POLICY debts_write ON public.debts FOR ALL
  USING ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin())
  WITH CHECK ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin());

-- ─── recurring_templates ────────────────────────────────────────────────────

DROP POLICY IF EXISTS recurring_templates_select ON public.recurring_templates;
CREATE POLICY recurring_templates_select ON public.recurring_templates FOR SELECT
  USING (private.is_demo_space(space_id) OR private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS recurring_templates_write ON public.recurring_templates;
CREATE POLICY recurring_templates_write ON public.recurring_templates FOR ALL
  USING ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin())
  WITH CHECK ((private.is_space_member(space_id) AND NOT private.is_demo_space(space_id)) OR private.is_superadmin());
