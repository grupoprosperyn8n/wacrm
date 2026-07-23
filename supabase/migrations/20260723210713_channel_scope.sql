-- Channel-scoped reusable templates and runtime activation filters.
-- Missing, NULL, and empty scopes are treated as ALL by application code;
-- existing rows are backfilled to the canonical all-channel value here.

ALTER TABLE public.flows
  ADD COLUMN IF NOT EXISTS channel_types text[]
    DEFAULT ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[],
  ADD COLUMN IF NOT EXISTS source_flow_id uuid
    REFERENCES public.flows(id) ON DELETE SET NULL;

ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS channel_types text[]
    DEFAULT ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[];

UPDATE public.flows
SET channel_types = ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[]
WHERE channel_types IS NULL
   OR cardinality(channel_types) = 0
   OR NOT (channel_types <@ ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[]);

UPDATE public.automations
SET channel_types = ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[]
WHERE channel_types IS NULL
   OR cardinality(channel_types) = 0
   OR NOT (channel_types <@ ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[]);

ALTER TABLE public.flows
  DROP CONSTRAINT IF EXISTS flows_channel_types_check;

ALTER TABLE public.flows
  ADD CONSTRAINT flows_channel_types_check CHECK (
    channel_types <@ ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[]
    AND cardinality(channel_types) > 0
  );

ALTER TABLE public.flows
  ALTER COLUMN channel_types SET DEFAULT ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[],
  ALTER COLUMN channel_types SET NOT NULL;

ALTER TABLE public.automations
  ALTER COLUMN channel_types SET DEFAULT ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[],
  ALTER COLUMN channel_types SET NOT NULL;

ALTER TABLE public.automations
  DROP CONSTRAINT IF EXISTS automations_channel_types_check;

ALTER TABLE public.automations
  ADD CONSTRAINT automations_channel_types_check CHECK (
    channel_types <@ ARRAY['whatsapp', 'web', 'telegram', 'instagram', 'facebook']::text[]
    AND cardinality(channel_types) > 0
  );

CREATE INDEX IF NOT EXISTS flows_channel_types_gin_idx
  ON public.flows USING gin (channel_types);

CREATE INDEX IF NOT EXISTS automations_channel_types_gin_idx
  ON public.automations USING gin (channel_types);

CREATE INDEX IF NOT EXISTS flows_source_flow_idx
  ON public.flows (source_flow_id)
  WHERE source_flow_id IS NOT NULL;
