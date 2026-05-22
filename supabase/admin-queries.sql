-- ============================================================================
-- Queries de soporte para Vantage
-- ----------------------------------------------------------------------------
-- Pegar la query que toque en el SQL Editor de Supabase (dashboard del proyecto
-- → SQL Editor → New query). Sustituir los placeholders en MAYÚSCULAS.
--
-- Las queries marcadas con ⚠️ DESTRUCTIVO modifican o borran datos. Antes de
-- ejecutarlas: leer el WHERE dos veces y, si afecta a varias filas, sustituir
-- la acción por un SELECT primero para confirmar el alcance.
-- ============================================================================


-- ─── Buscar usuario por email ───────────────────────────────────────────────
-- Devuelve el user_id, fecha de creación y último login. El user_id es la
-- llave que necesitas para casi todo lo demás.

SELECT
  id,
  email,
  created_at,
  last_sign_in_at,
  banned_until,
  raw_user_meta_data
FROM auth.users
WHERE email ILIKE 'USUARIO@EJEMPLO.COM';


-- ─── Resumen de un usuario por email ────────────────────────────────────────
-- Cuántas transacciones, ahorros, deudas y recurrentes tiene en su space
-- personal. Útil para "¿este usuario está usando la app?" o "¿cuánto le voy
-- a borrar si confirmo el delete?".

WITH u AS (SELECT id FROM auth.users WHERE email ILIKE 'USUARIO@EJEMPLO.COM'),
     s AS (
       SELECT s.id, s.name
       FROM public.spaces s
       JOIN public.space_members m ON m.space_id = s.id
       WHERE m.user_id = (SELECT id FROM u) AND s.type = 'personal'
     )
SELECT
  (SELECT id FROM u)                                                  AS user_id,
  (SELECT id FROM s)                                                  AS space_id,
  (SELECT name FROM s)                                                AS space_name,
  (SELECT COUNT(*) FROM public.transactions WHERE space_id = (SELECT id FROM s))         AS transactions,
  (SELECT COUNT(*) FROM public.savings_accounts WHERE space_id = (SELECT id FROM s))     AS savings_accounts,
  (SELECT COUNT(*) FROM public.debts WHERE space_id = (SELECT id FROM s))                AS debts,
  (SELECT COUNT(*) FROM public.recurring_templates WHERE space_id = (SELECT id FROM s))  AS recurring,
  (SELECT COUNT(*) FROM public.categories WHERE space_id = (SELECT id FROM s))           AS categories;


-- ─── Transacciones de un usuario en los últimos 30 días ─────────────────────
-- Para reproducir un bug reportado o auditar movimientos recientes.

SELECT t.date, t.type, t.amount, t.description, t.category
FROM public.transactions t
JOIN public.space_members m ON m.space_id = t.space_id
JOIN auth.users u ON u.id = m.user_id
WHERE u.email ILIKE 'USUARIO@EJEMPLO.COM'
  AND t.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY t.date DESC, t.created_at DESC;


-- ─── Listar TODOS los usuarios con stats básicos ────────────────────────────
-- Vista general del producto: cuándo se registró cada uno, cuándo entró por
-- última vez, si tiene confirmado el email, si está baneado.

SELECT
  u.email,
  u.created_at::date            AS registrado,
  u.last_sign_in_at::date       AS ultimo_login,
  u.email_confirmed_at IS NOT NULL AS confirmado,
  u.banned_until > NOW()        AS baneado
FROM auth.users u
ORDER BY u.created_at DESC;


-- ─── Banear usuario hasta una fecha ─────────────────────────────────────────
-- ⚠️ DESTRUCTIVO (impide login). Para banear "para siempre" usa una fecha muy
-- lejana. Para desbanear: ver query siguiente.

UPDATE auth.users
SET banned_until = '2099-12-31'::timestamptz
WHERE email ILIKE 'USUARIO@EJEMPLO.COM';


-- ─── Desbanear usuario ──────────────────────────────────────────────────────

UPDATE auth.users
SET banned_until = NULL
WHERE email ILIKE 'USUARIO@EJEMPLO.COM';


-- ─── Forzar logout de TODAS las sesiones de un usuario ──────────────────────
-- Útil tras un cambio de contraseña manual o ante sospecha de compromiso.

DELETE FROM auth.refresh_tokens
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE 'USUARIO@EJEMPLO.COM');


-- ─── Borrar usuario completo (CASCADE) ──────────────────────────────────────
-- ⚠️ DESTRUCTIVO. Elimina al usuario y, por las FK ON DELETE CASCADE, también
-- su space personal, miembros, invitaciones y todos sus datos. Confirmar
-- primero con la query de resumen.

DELETE FROM auth.users
WHERE email ILIKE 'USUARIO@EJEMPLO.COM';


-- ─── Promocionar a superadmin ───────────────────────────────────────────────
-- Hoy esta tabla está sin uso operativo (no hay UI /admin), pero queda
-- preparada por si en el futuro se activa.

INSERT INTO public.superadmins (user_id, granted_by, notes)
SELECT id, id, 'Concedido manualmente desde SQL Editor'
FROM auth.users
WHERE email ILIKE 'USUARIO@EJEMPLO.COM'
ON CONFLICT (user_id) DO NOTHING;


-- ─── Quitar superadmin ──────────────────────────────────────────────────────

DELETE FROM public.superadmins
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE 'USUARIO@EJEMPLO.COM');
