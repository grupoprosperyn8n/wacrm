-- RLS policies for tasks, bookings, sync tables
-- These tables were created without RLS policies

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_account_access" ON tasks
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Bookings RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_account_access" ON bookings
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Sync integrations RLS
ALTER TABLE sync_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_integrations_account_access" ON sync_integrations
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sync_integrations_insert" ON sync_integrations
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
