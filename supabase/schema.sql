-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PRODUCTS
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,       -- 'Kaas', 'Zuivel'
    type_group TEXT,              -- e.g., 'Jonge Kaas' (For aggregation)
    price DECIMAL(10,2) NOT NULL, -- The base price (per unit OR per kg)
    unit_label TEXT NOT NULL,     -- e.g., 'stuk', 'blok', 'kg'
    
    -- LOGIC COLUMNS
    is_price_per_kilo BOOLEAN DEFAULT false, -- Controls frontend price calculation
    weight_per_unit DECIMAL(10,3),           -- Used for total weight calculation
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 999
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ORDERS
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    week_number INTEGER,
    status TEXT DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ORDER ITEMS
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    price_snapshot DECIMAL(10,2) NOT NULL -- Price at time of order
);

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- POLICIES (Basic Setup)

-- Products: Everyone can read active products.
CREATE POLICY "Public read active products" ON products FOR SELECT USING (is_active = true);

-- Orders & Items: RLS is enabled, but policies are omitted as admin uses Service Role.
-- This ensures only the Service Role (Backoffice) can access these tables.
