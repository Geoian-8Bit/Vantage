-- ─────────────────────────────────────────────────────────────────────────────
-- Migración manual 0006 — Bucket "receipts" en Supabase Storage
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Crea un bucket privado para guardar la foto del ticket asociado a cada
-- transacción. El path sigue el convenio:
--
--   {space_id}/{uuid}.{ext}
--
-- donde el primer segmento del path es siempre el space_id del propietario,
-- lo que permite que las policies de storage usen
-- (storage.foldername(name))[1]::uuid como llave de autorización.
--
-- Las políticas usan los helpers private.is_space_member() y
-- private.is_anonymous_user() definidos en 0005_demo_setup.sql.
--
-- CÓMO APLICAR:
--   En el SQL Editor de Supabase, pegar este archivo y ejecutar. NO se
--   aplica con drizzle-kit (Drizzle no maneja storage).
--
-- IDEMPOTENTE: se puede re-ejecutar sin romper nada.

-- ─── 1. Bucket privado ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,                        -- privado: nunca servido por URL pública
  10 * 1024 * 1024,             -- 10 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── 2. Limpieza de policies previas (re-ejecutable) ────────────────────────
drop policy if exists "receipts: lectura por miembros del space" on storage.objects;
drop policy if exists "receipts: subida por miembros no-demo" on storage.objects;
drop policy if exists "receipts: actualización por miembros no-demo" on storage.objects;
drop policy if exists "receipts: borrado por miembros no-demo" on storage.objects;

-- ─── 3. SELECT — cualquier miembro del space puede leer ─────────────────────
create policy "receipts: lectura por miembros del space"
  on storage.objects
  for select
  using (
    bucket_id = 'receipts'
    and private.is_space_member(((storage.foldername(name))[1])::uuid)
  );

-- ─── 4. INSERT — solo miembros no-anónimos (el demo es read-only) ───────────
create policy "receipts: subida por miembros no-demo"
  on storage.objects
  for insert
  with check (
    bucket_id = 'receipts'
    and private.is_space_member(((storage.foldername(name))[1])::uuid)
    and not private.is_anonymous_user()
  );

-- ─── 5. UPDATE — no expuesto en la app pero por simetría ────────────────────
create policy "receipts: actualización por miembros no-demo"
  on storage.objects
  for update
  using (
    bucket_id = 'receipts'
    and private.is_space_member(((storage.foldername(name))[1])::uuid)
    and not private.is_anonymous_user()
  )
  with check (
    bucket_id = 'receipts'
    and private.is_space_member(((storage.foldername(name))[1])::uuid)
    and not private.is_anonymous_user()
  );

-- ─── 6. DELETE — solo miembros no-anónimos ──────────────────────────────────
create policy "receipts: borrado por miembros no-demo"
  on storage.objects
  for delete
  using (
    bucket_id = 'receipts'
    and private.is_space_member(((storage.foldername(name))[1])::uuid)
    and not private.is_anonymous_user()
  );
