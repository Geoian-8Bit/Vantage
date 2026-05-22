-- ============================================================================
-- 0005 — Setup del demo público sin login
-- ----------------------------------------------------------------------------
-- Migración MANUAL (no la genera drizzle-kit porque toca funciones y policies
-- que no están en el schema de Drizzle). Se aplica vía Supabase SQL Editor
-- o vía MCP apply_migration.
--
-- Bloques (ver doc en cada sección):
--   A. Helper is_anonymous_user()
--   B. handle_new_user reconoce anonymous → space demo
--   C. Permitir writes en demo (antes era read-only)
--   D. Restrictive policies: bloquear anonymous en spaces/members/invitations
--   E. reset_demo_space() — borra y re-llena el demo
--   F. cleanup_anonymous_users() — purga anonymous con +7 días
--   G. Semilla inicial: SELECT private.reset_demo_space()
-- ============================================================================


-- ─── A. Helper is_anonymous_user ────────────────────────────────────────────
-- Lee el claim is_anonymous del JWT. Devuelve false si no hay JWT o no existe
-- el claim (= usuario normal o anon role).

CREATE OR REPLACE FUNCTION private.is_anonymous_user()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

GRANT EXECUTE ON FUNCTION private.is_anonymous_user() TO anon, authenticated, service_role;


-- ─── B. handle_new_user anonymous-aware ─────────────────────────────────────
-- Reemplaza al trigger original. Si el nuevo usuario es anonymous, NO crea
-- space personal: lo añade como member del space demo. Si es normal, sigue
-- el flujo de siempre (space personal + ownership).

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_space_id uuid;
  v_demo_space_id uuid;
  v_display_name text;
BEGIN
  IF NEW.is_anonymous THEN
    SELECT id INTO v_demo_space_id FROM public.spaces WHERE type = 'demo' LIMIT 1;
    IF v_demo_space_id IS NOT NULL THEN
      INSERT INTO public.space_members (space_id, user_id, role)
      VALUES (v_demo_space_id, NEW.id, 'member')
      ON CONFLICT (space_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

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


-- ─── C. Permitir writes en demo ─────────────────────────────────────────────
-- Antes: las write policies tenían "AND NOT private.is_demo_space(space_id)"
-- para que el demo fuera read-only. Ahora lo quitamos: los visitantes del
-- demo pueden modificar transacciones, deudas, ahorros, etc. (todo dentro
-- del space demo; nada fuera por RLS).

DROP POLICY IF EXISTS categories_write ON public.categories;
CREATE POLICY categories_write ON public.categories FOR ALL
  USING (private.is_space_member(space_id) OR private.is_superadmin())
  WITH CHECK (private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS transactions_write ON public.transactions;
CREATE POLICY transactions_write ON public.transactions FOR ALL
  USING (private.is_space_member(space_id) OR private.is_superadmin())
  WITH CHECK (private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS savings_accounts_write ON public.savings_accounts;
CREATE POLICY savings_accounts_write ON public.savings_accounts FOR ALL
  USING (private.is_space_member(space_id) OR private.is_superadmin())
  WITH CHECK (private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS debts_write ON public.debts;
CREATE POLICY debts_write ON public.debts FOR ALL
  USING (private.is_space_member(space_id) OR private.is_superadmin())
  WITH CHECK (private.is_space_member(space_id) OR private.is_superadmin());

DROP POLICY IF EXISTS recurring_templates_write ON public.recurring_templates;
CREATE POLICY recurring_templates_write ON public.recurring_templates FOR ALL
  USING (private.is_space_member(space_id) OR private.is_superadmin())
  WITH CHECK (private.is_space_member(space_id) OR private.is_superadmin());


-- ─── D. Restrictive policies: bloquear anonymous en control ─────────────────
-- "Restrictive" se aplica como AND junto a las permisivas. Estas policies
-- garantizan que un anonymous no puede:
--   - crear/modificar/borrar spaces
--   - añadirse como member de otro space (ni modificar/borrar memberships)
--   - crear/aceptar invitaciones
-- Defensa en profundidad junto a los bloqueos de server actions.

-- Importante: separamos en INSERT/UPDATE/DELETE en vez de FOR ALL para NO
-- bloquear SELECT. Anonymous SÍ necesita leer spaces (para que getActiveSpace
-- encuentre su demo). La policy permisiva ya filtra: solo verá el space demo.

DROP POLICY IF EXISTS spaces_no_anonymous_insert ON public.spaces;
CREATE POLICY spaces_no_anonymous_insert ON public.spaces
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT private.is_anonymous_user());

DROP POLICY IF EXISTS spaces_no_anonymous_update ON public.spaces;
CREATE POLICY spaces_no_anonymous_update ON public.spaces
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT private.is_anonymous_user())
  WITH CHECK (NOT private.is_anonymous_user());

DROP POLICY IF EXISTS spaces_no_anonymous_delete ON public.spaces;
CREATE POLICY spaces_no_anonymous_delete ON public.spaces
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT private.is_anonymous_user());

DROP POLICY IF EXISTS space_members_no_anonymous_insert ON public.space_members;
CREATE POLICY space_members_no_anonymous_insert ON public.space_members
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT private.is_anonymous_user());

DROP POLICY IF EXISTS space_members_no_anonymous_update ON public.space_members;
CREATE POLICY space_members_no_anonymous_update ON public.space_members
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT private.is_anonymous_user())
  WITH CHECK (NOT private.is_anonymous_user());

DROP POLICY IF EXISTS space_members_no_anonymous_delete ON public.space_members;
CREATE POLICY space_members_no_anonymous_delete ON public.space_members
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT private.is_anonymous_user());

DROP POLICY IF EXISTS space_invitations_no_anonymous ON public.space_invitations;
CREATE POLICY space_invitations_no_anonymous ON public.space_invitations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT private.is_anonymous_user())
  WITH CHECK (NOT private.is_anonymous_user());


-- ─── E. reset_demo_space() ──────────────────────────────────────────────────
-- Función idempotente que: (1) asegura existencia del space demo, (2) borra
-- todos los datos del demo, (3) re-inserta el seed completo (categorías,
-- ahorros, deudas, recurrentes, ~80 transacciones distribuidas en 90 días).
-- Usa SECURITY DEFINER → corre como owner de la función, bypaseando RLS.
-- Solo el role service_role puede invocarla.

CREATE OR REPLACE FUNCTION private.reset_demo_space()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_demo_id uuid;
  v_today date := CURRENT_DATE;
  v_next_month date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
  v_debt_coche uuid;
  v_debt_tarjeta uuid;
  v_debt_personal uuid;
  v_savings_emerg uuid;
  v_savings_vacac uuid;
  v_savings_coche uuid;
BEGIN
  -- 1. Asegurar space demo (lo crea solo la primera vez)
  SELECT id INTO v_demo_id FROM spaces WHERE type='demo' LIMIT 1;
  IF v_demo_id IS NULL THEN
    INSERT INTO spaces (type, name) VALUES ('demo', 'Demo Vantage')
    RETURNING id INTO v_demo_id;
  END IF;

  -- 2. Wipe — todas las queries con WHERE space_id = v_demo_id (literal scope)
  DELETE FROM transactions        WHERE space_id = v_demo_id;
  DELETE FROM recurring_templates WHERE space_id = v_demo_id;
  DELETE FROM debts               WHERE space_id = v_demo_id;
  DELETE FROM savings_accounts    WHERE space_id = v_demo_id;
  DELETE FROM categories          WHERE space_id = v_demo_id;

  -- 3. Categorías
  INSERT INTO categories (space_id, name, type) VALUES
    (v_demo_id, 'Nomina',        'income'),
    (v_demo_id, 'Freelance',     'income'),
    (v_demo_id, 'Alquiler',      'expense'),
    (v_demo_id, 'Supermercado',  'expense'),
    (v_demo_id, 'Restaurantes',  'expense'),
    (v_demo_id, 'Transporte',    'expense'),
    (v_demo_id, 'Ocio',          'expense'),
    (v_demo_id, 'Suscripciones', 'expense'),
    (v_demo_id, 'Salud',         'expense'),
    (v_demo_id, 'Hogar',         'expense'),
    (v_demo_id, 'Suministros',   'expense'),
    (v_demo_id, 'Otros',         'expense');

  -- 4. Ahorros
  INSERT INTO savings_accounts (space_id, name, color, target_amount) VALUES
    (v_demo_id, 'Fondo de emergencia', '#1B7A4E', 5000),
    (v_demo_id, 'Vacaciones verano',   '#C9A84C', 1500),
    (v_demo_id, 'Coche nuevo',         '#7A1B2D', 8000);

  SELECT id INTO v_savings_emerg FROM savings_accounts WHERE space_id=v_demo_id AND name='Fondo de emergencia';
  SELECT id INTO v_savings_vacac FROM savings_accounts WHERE space_id=v_demo_id AND name='Vacaciones verano';
  SELECT id INTO v_savings_coche FROM savings_accounts WHERE space_id=v_demo_id AND name='Coche nuevo';

  -- 5. Deudas
  INSERT INTO debts (space_id, name, creditor, color, initial_amount, monthly_amount, start_date) VALUES
    (v_demo_id, 'Prestamo coche',    'Banco Ejemplo', '#7A1B2D', 12000, 350, v_today - INTERVAL '6 months'),
    (v_demo_id, 'Tarjeta credito',   'Visa Ejemplo',  '#C9A84C',   800, 100, v_today - INTERVAL '2 months'),
    (v_demo_id, 'Prestamo personal', 'Banco Ejemplo', '#1B7A4E',  3000, 250, v_today - INTERVAL '4 months');

  SELECT id INTO v_debt_coche    FROM debts WHERE space_id=v_demo_id AND name='Prestamo coche';
  SELECT id INTO v_debt_tarjeta  FROM debts WHERE space_id=v_demo_id AND name='Tarjeta credito';
  SELECT id INTO v_debt_personal FROM debts WHERE space_id=v_demo_id AND name='Prestamo personal';

  -- 6. Recurrentes (next_date = dia 1 del proximo mes)
  INSERT INTO recurring_templates (space_id, amount, type, description, frequency, next_date, active) VALUES
    (v_demo_id, 2400,  'income',  'Nomina mensual',  'monthly', v_next_month, true),
    (v_demo_id,  850,  'expense', 'Alquiler',        'monthly', v_next_month, true),
    (v_demo_id, 12.99, 'expense', 'Netflix',         'monthly', v_next_month, true),
    (v_demo_id,  9.99, 'expense', 'Spotify',         'monthly', v_next_month, true),
    (v_demo_id,   45,  'expense', 'Internet fibra',  'monthly', v_next_month, true);

  -- 7. Transacciones — ingresos
  INSERT INTO transactions (space_id, amount, type, description, date, category) VALUES
    (v_demo_id, 2400, 'income', 'Nomina',           v_today - 88, 'Nomina'),
    (v_demo_id, 2400, 'income', 'Nomina',           v_today - 58, 'Nomina'),
    (v_demo_id, 2400, 'income', 'Nomina',           v_today - 28, 'Nomina'),
    (v_demo_id,  350, 'income', 'Diseno web',       v_today - 20, 'Freelance'),
    (v_demo_id,  180, 'income', 'Asesoria puntual', v_today - 50, 'Freelance');

  -- Alquiler
  INSERT INTO transactions (space_id, amount, type, description, date, category) VALUES
    (v_demo_id, 850, 'expense', 'Alquiler', v_today - 87, 'Alquiler'),
    (v_demo_id, 850, 'expense', 'Alquiler', v_today - 57, 'Alquiler'),
    (v_demo_id, 850, 'expense', 'Alquiler', v_today - 27, 'Alquiler');

  -- Supermercado x22 (amounts y fechas aleatorias dentro de rangos realistas)
  INSERT INTO transactions (space_id, amount, type, description, date, category)
  SELECT v_demo_id,
         (30 + random() * 70)::numeric(15,2),
         'expense',
         CASE (random() * 3)::int WHEN 0 THEN 'Mercadona' WHEN 1 THEN 'Lidl' ELSE 'Carrefour' END,
         v_today - (random() * 89)::int,
         'Supermercado'
  FROM generate_series(1, 22);

  -- Restaurantes x14
  INSERT INTO transactions (space_id, amount, type, description, date, category)
  SELECT v_demo_id,
         (12 + random() * 38)::numeric(15,2),
         'expense',
         CASE (random() * 3)::int WHEN 0 THEN 'Cena con amigos' WHEN 1 THEN 'Comida trabajo' WHEN 2 THEN 'Cafe' ELSE 'Restaurante' END,
         v_today - (random() * 89)::int,
         'Restaurantes'
  FROM generate_series(1, 14);

  -- Transporte x12
  INSERT INTO transactions (space_id, amount, type, description, date, category)
  SELECT v_demo_id,
         (5 + random() * 30)::numeric(15,2),
         'expense',
         CASE (random() * 2)::int WHEN 0 THEN 'Gasolina' WHEN 1 THEN 'Metro' ELSE 'Uber' END,
         v_today - (random() * 89)::int,
         'Transporte'
  FROM generate_series(1, 12);

  -- Ocio x8
  INSERT INTO transactions (space_id, amount, type, description, date, category)
  SELECT v_demo_id,
         (10 + random() * 40)::numeric(15,2),
         'expense',
         CASE (random() * 2)::int WHEN 0 THEN 'Cine' WHEN 1 THEN 'Concierto' ELSE 'Libro' END,
         v_today - (random() * 89)::int,
         'Ocio'
  FROM generate_series(1, 8);

  -- Suscripciones (3 meses x 2 servicios)
  INSERT INTO transactions (space_id, amount, type, description, date, category) VALUES
    (v_demo_id, 12.99, 'expense', 'Netflix', v_today - 85, 'Suscripciones'),
    (v_demo_id, 12.99, 'expense', 'Netflix', v_today - 55, 'Suscripciones'),
    (v_demo_id, 12.99, 'expense', 'Netflix', v_today - 25, 'Suscripciones'),
    (v_demo_id,  9.99, 'expense', 'Spotify', v_today - 82, 'Suscripciones'),
    (v_demo_id,  9.99, 'expense', 'Spotify', v_today - 52, 'Suscripciones'),
    (v_demo_id,  9.99, 'expense', 'Spotify', v_today - 22, 'Suscripciones');

  -- Suministros
  INSERT INTO transactions (space_id, amount, type, description, date, category) VALUES
    (v_demo_id, 45, 'expense', 'Internet fibra', v_today - 80, 'Suministros'),
    (v_demo_id, 45, 'expense', 'Internet fibra', v_today - 50, 'Suministros'),
    (v_demo_id, 45, 'expense', 'Internet fibra', v_today - 20, 'Suministros'),
    (v_demo_id, 68, 'expense', 'Luz',            v_today - 75, 'Suministros'),
    (v_demo_id, 72, 'expense', 'Luz',            v_today - 45, 'Suministros'),
    (v_demo_id, 35, 'expense', 'Agua',           v_today - 60, 'Suministros');

  -- Salud
  INSERT INTO transactions (space_id, amount, type, description, date, category) VALUES
    (v_demo_id, 35, 'expense', 'Farmacia', v_today - 40, 'Salud'),
    (v_demo_id, 90, 'expense', 'Dentista', v_today - 15, 'Salud');

  -- Pagos de deudas (vinculados via debt_id)
  INSERT INTO transactions (space_id, amount, type, description, date, category, debt_id)
  SELECT v_demo_id, 350, 'expense', 'Pago prestamo coche',
         v_today - (n * 30), 'Otros', v_debt_coche
  FROM generate_series(0, 5) AS g(n);

  INSERT INTO transactions (space_id, amount, type, description, date, category, debt_id)
  SELECT v_demo_id, 100, 'expense', 'Pago tarjeta credito',
         v_today - (n * 30), 'Otros', v_debt_tarjeta
  FROM generate_series(0, 1) AS g(n);

  INSERT INTO transactions (space_id, amount, type, description, date, category, debt_id)
  SELECT v_demo_id, 250, 'expense', 'Pago prestamo personal',
         v_today - (n * 30), 'Otros', v_debt_personal
  FROM generate_series(0, 3) AS g(n);

  -- Aportes a ahorros (vinculados via savings_account_id)
  INSERT INTO transactions (space_id, amount, type, description, date, category, savings_account_id)
  SELECT v_demo_id, 200, 'expense', 'Aporte fondo emergencia',
         v_today - (n * 30), 'Otros', v_savings_emerg
  FROM generate_series(0, 2) AS g(n);

  INSERT INTO transactions (space_id, amount, type, description, date, category, savings_account_id)
  SELECT v_demo_id, 150, 'expense', 'Aporte vacaciones',
         v_today - (n * 30), 'Otros', v_savings_vacac
  FROM generate_series(0, 2) AS g(n);

  INSERT INTO transactions (space_id, amount, type, description, date, category, savings_account_id)
  SELECT v_demo_id, 250, 'expense', 'Aporte coche nuevo',
         v_today - (n * 30), 'Otros', v_savings_coche
  FROM generate_series(0, 1) AS g(n);

  RETURN jsonb_build_object(
    'demo_space_id', v_demo_id,
    'reset_at',      NOW(),
    'transactions',  (SELECT COUNT(*) FROM transactions        WHERE space_id = v_demo_id),
    'debts',         (SELECT COUNT(*) FROM debts               WHERE space_id = v_demo_id),
    'savings',       (SELECT COUNT(*) FROM savings_accounts    WHERE space_id = v_demo_id),
    'recurring',     (SELECT COUNT(*) FROM recurring_templates WHERE space_id = v_demo_id),
    'categories',    (SELECT COUNT(*) FROM categories          WHERE space_id = v_demo_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION private.reset_demo_space() TO service_role;


-- ─── F. cleanup_anonymous_users() ───────────────────────────────────────────
-- Borra cuentas anonymous con +7 días. Supabase NO auto-purga anonymous (doc
-- oficial). Se llama desde el cron de reset.

CREATE OR REPLACE FUNCTION private.cleanup_anonymous_users()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted int;
BEGIN
  WITH d AS (
    DELETE FROM auth.users
    WHERE is_anonymous IS TRUE
      AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM d;

  RETURN jsonb_build_object('deleted_anonymous_users', v_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION private.cleanup_anonymous_users() TO service_role;


-- ─── G. Semilla inicial ─────────────────────────────────────────────────────
-- Ejecuta el reset por primera vez. Crea el space demo + datos seed.

SELECT private.reset_demo_space();
