-- RECURRING ORDERS
CREATE TABLE recurring_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL,
    price_modifier DECIMAL(5,2) DEFAULT 0, -- Percentage (e.g., -10.00 for 10% discount, 5.00 for 5% premium)
    is_active BOOLEAN DEFAULT true,
    interval TEXT DEFAULT 'weekly', -- 'weekly', 'bi-weekly', 'monthly', 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECURRING ORDER ITEMS
CREATE TABLE recurring_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_order_id UUID REFERENCES recurring_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL
);

-- Enable RLS
ALTER TABLE recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_order_items ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- RLS is enabled, but policies are omitted as admin uses Service Role.
-- This ensures only the Service Role (Backoffice) can access these tables.

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recurring_orders_updated_at
    BEFORE UPDATE ON recurring_orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
