-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    business_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- PRODUCTS
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,       -- 'Kaas', 'Zuivel'
    type_group TEXT NOT NULL,     -- e.g., 'Jonge Kaas' (For aggregation)
    price DECIMAL(10,2) NOT NULL, -- The base price (per unit OR per kg)
    unit_label TEXT NOT NULL,     -- e.g., 'stuk', 'blok', 'kg'
    
    -- LOGIC COLUMNS
    is_price_per_kilo BOOLEAN DEFAULT false, -- Controls frontend price calculation
    weight_per_unit DECIMAL(10,3) NOT NULL,  -- Used for total weight calculation
    is_active BOOLEAN DEFAULT true
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

-- Products: Everyone can read active products. Admins can do all.
CREATE POLICY "Public read active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin all products" ON products FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Profiles: Users can read/update own. Admins all.
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin all profiles" ON profiles FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Orders: Admins all.
CREATE POLICY "Admin all orders" ON orders FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Order Items: Admins all.
CREATE POLICY "Admin all order items" ON order_items FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Handle new user signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, business_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'business_name', 'customer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
