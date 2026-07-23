-- Keep the flow-node type contract aligned with the TypeScript builder and
-- runtime. `http_fetch` remains accepted for compatibility with older rows.
ALTER TABLE public.flow_nodes
  DROP CONSTRAINT IF EXISTS flow_nodes_node_type_check;

ALTER TABLE public.flow_nodes
  ADD CONSTRAINT flow_nodes_node_type_check
  CHECK (node_type IN (
    'start',
    'send_buttons',
    'send_list',
    'send_message',
    'send_media',
    'collect_input',
    'condition',
    'set_tag',
    'handoff',
    'http_fetch',
    'http_request',
    'ai_reply',
    'end'
  ));
