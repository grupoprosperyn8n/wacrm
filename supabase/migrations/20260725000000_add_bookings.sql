-- Booking / appointment system
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Turno',
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  metadata JSONB DEFAULT '{}',
  external_id TEXT,
  source TEXT DEFAULT 'internal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bookings_account ON bookings (account_id);
CREATE INDEX idx_bookings_start ON bookings (start_time);
CREATE INDEX idx_bookings_status ON bookings (status);

-- Public booking pages config
CREATE TABLE IF NOT EXISTS booking_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'Agenda un turno',
  description TEXT,
  duration_minutes INT DEFAULT 30,
  color TEXT DEFAULT '#7c3aed',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_booking_pages_account ON booking_pages (account_id);
