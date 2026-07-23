-- Template clone lineage for system snapshot templates.
-- Nullable so existing user-authored flows/automations remain unchanged.

alter table public.flows
  add column if not exists source_template_slug text,
  add column if not exists source_template_version text,
  add column if not exists source_template_schema_version integer;

alter table public.automations
  add column if not exists source_template_slug text,
  add column if not exists source_template_version text,
  add column if not exists source_template_schema_version integer;

create index if not exists flows_source_template_idx
  on public.flows (source_template_slug, source_template_version)
  where source_template_slug is not null;

create index if not exists automations_source_template_idx
  on public.automations (source_template_slug, source_template_version)
  where source_template_slug is not null;
