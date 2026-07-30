-- ─────────────────────────────────────────────────────────────
-- Row-Level Security policies — the database-layer tenant backstop.
-- Gate every tenant table on the session GUC `app.current_org`.
-- Applied after the schema migration (dev: by seed; prod: as a migration).
-- Idempotent: safe to run repeatedly.
--
-- NOTE (skeleton): we ENABLE (not FORCE) RLS. The app currently connects as the
-- table OWNER, which bypasses non-forced RLS — so cross-tenant auth lookups
-- (login, before a tenant is known) work, and the ACTIVE tenant enforcement is
-- the application-layer tenant client (`forTenant`). To make RLS a true DB-level
-- backstop, production should connect as a dedicated NON-owner app role and set
-- `app.current_org` per request (via withTenantRls) + FORCE RLS. Tracked as a
-- Sprint-2 hardening task (see docs/12-security-checklist.md).
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'organizations',
    'offices',
    'departments',
    'teams',
    'users',
    'roles',
    'leads',
    'customers',
    'contacts',
    'pipelines',
    'pipeline_stages',
    'deals',
    'projects',
    'tasks',
    'automations',
    'automation_runs',
    'invoices',
    'invoice_lines',
    'seo_projects',
    'keywords',
    'tickets',
    'ticket_messages',
    'articles',
    'announcements',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Idempotent: drop existing policy before recreating.
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
  END LOOP;

  -- organizations keys on `id`; the rest key on `organization_id`.
  EXECUTE $p$
    CREATE POLICY tenant_isolation ON organizations
    USING (id = current_setting('app.current_org', true)::uuid)
    WITH CHECK (id = current_setting('app.current_org', true)::uuid)
  $p$;

  FOREACH t IN ARRAY ARRAY[
    'offices','departments','teams','users','roles','leads','customers','contacts',
    'pipelines','pipeline_stages','deals','projects','tasks',
    'automations','automation_runs','invoices','invoice_lines',
    'seo_projects','keywords','tickets','ticket_messages','articles','announcements','audit_logs'
  ] LOOP
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (organization_id = current_setting('app.current_org', true)::uuid)
      WITH CHECK (organization_id = current_setting('app.current_org', true)::uuid)
    $p$, t);
  END LOOP;
END $$;
