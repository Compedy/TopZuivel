-- Create the store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Public read store settings" ON store_settings FOR SELECT USING (true);

-- Insert default shop open days (Monday to Friday: 1, 2, 3, 4, 5)
INSERT INTO store_settings (key, value) 
VALUES ('availability', '{"open_days": [1, 2, 3, 4, 5]}'::jsonb)
ON CONFLICT (key) DO NOTHING;
