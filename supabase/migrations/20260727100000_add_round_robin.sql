-- Round Robin: distribuir leads entre agentes automaticamente

-- Agregar columna round_robin_index a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS round_robin_index INTEGER NOT NULL DEFAULT 0;

-- Funcion para obtener el proximo agente via Round Robin
CREATE OR REPLACE FUNCTION get_next_round_robin_agent(target_account_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_agent_id UUID;
BEGIN
  -- Seleccionar el agente con menor round_robin_index (solo agent+ roles)
  SELECT p.id INTO selected_agent_id
  FROM profiles p
  WHERE p.account_id = target_account_id
    AND p.account_role IN ('agent', 'admin', 'owner')
  ORDER BY p.round_robin_index ASC, p.id ASC
  LIMIT 1
  FOR UPDATE OF p SKIP LOCKED;

  IF selected_agent_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Incrementar su indice
  UPDATE profiles
  SET round_robin_index = round_robin_index + 1
  WHERE id = selected_agent_id;

  RETURN selected_agent_id;
END;
$$;
