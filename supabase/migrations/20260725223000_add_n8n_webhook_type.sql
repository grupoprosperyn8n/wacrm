-- 20260725223000_add_n8n_webhook_type.sql
-- Add n8n_webhook to the flow_nodes node_type CHECK constraint.

ALTER TABLE flow_nodes DROP CONSTRAINT IF EXISTS flow_nodes_node_type_check;
ALTER TABLE flow_nodes ADD CONSTRAINT flow_nodes_node_type_check
  CHECK (node_type = ANY (ARRAY[
    'start'::text,
    'send_buttons'::text,
    'send_list'::text,
    'send_message'::text,
    'send_media'::text,
    'collect_input'::text,
    'condition'::text,
    'set_tag'::text,
    'handoff'::text,
    'http_fetch'::text,
    'http_request'::text,
    'ai_reply'::text,
    'n8n_webhook'::text,
    'end'::text
  ]));
