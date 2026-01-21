INSERT INTO products (name, category, type_group, price, unit_label, is_price_per_kilo, weight_per_unit) VALUES
-- JONGE KAAS (Mixed Units and Bulk)
('Jonge kaas per kilo (wiel/bulk)', 'Kaas', 'Jonge Kaas', 8.50, 'kg', true, 1.0),
('Jong hotelbroodje (±3.5kg)', 'Kaas', 'Jonge Kaas', 8.50, 'blok', true, 3.5),
('Jong 500 gram gevacumeerd', 'Kaas', 'Jonge Kaas', 5.00, 'stuk', false, 0.5),
('Jong 750 gram gevacumeerd', 'Kaas', 'Jonge Kaas', 7.13, 'stuk', false, 0.75),
('Jong 1 kg gevacumeerd', 'Kaas', 'Jonge Kaas', 9.25, 'stuk', false, 1.0),

-- JONG BELEGEN
('Jong belegen kaas per kilo (wiel/bulk)', 'Kaas', 'Jong Belegen', 9.30, 'kg', true, 1.0),
('Jong belegen hotelbroodje (±3.5kg)', 'Kaas', 'Jong Belegen', 9.30, 'blok', true, 3.5),
('Jong belegen 500 gram gevacumeerd', 'Kaas', 'Jong Belegen', 5.40, 'stuk', false, 0.5),
('Jong belegen 1kg gevacumeerd', 'Kaas', 'Jong Belegen', 10.05, 'stuk', false, 1.0),

-- BELEGEN
('Belegen kaas per kilo (wiel/bulk)', 'Kaas', 'Belegen', 10.10, 'kg', true, 1.0),
('Belegen hotelbroodje (±3.5kg)', 'Kaas', 'Belegen', 10.10, 'blok', true, 3.5),
('Belegen 500 gram gevacumeerd', 'Kaas', 'Belegen', 5.80, 'stuk', false, 0.5),
('Belegen 1 kg gevacumeerd', 'Kaas', 'Belegen', 10.85, 'stuk', false, 1.0),

-- EXTRA BELEGEN
('Extra belegen kaas per kilo (wiel/bulk)', 'Kaas', 'Extra Belegen', 11.00, 'kg', true, 1.0),
('Extra belegen hotelbroodje (±3.5kg)', 'Kaas', 'Extra Belegen', 11.00, 'blok', true, 3.5),
('Extra belegen 500 gram gevacumeerd', 'Kaas', 'Extra Belegen', 6.25, 'stuk', false, 0.5),
('Extra belegen 1 kg gevacumeerd', 'Kaas', 'Extra Belegen', 11.75, 'stuk', false, 1.0),

-- OUDE KAAS
('Oude kaas per kilo (wiel/bulk)', 'Kaas', 'Oude Kaas', 13.00, 'kg', true, 1.0),
('Oude kaas 500 gram gevacumeerd', 'Kaas', 'Oude Kaas', 7.25, 'stuk', false, 0.5),
('Oude kaas 750 gram gevacumeerd', 'Kaas', 'Oude Kaas', 10.50, 'stuk', false, 0.75),
('Oud 1kg gevacumeerd', 'Kaas', 'Oude Kaas', 13.75, 'stuk', false, 1.0),

-- KRUIDENKAAS (Specials)
('Italiaanse kaas per kilo', 'Kaas', 'Kruidenkaas', 11.75, 'kg', true, 1.0),
('Italiaanse kaas 400 gram gevacumeerd', 'Kaas', 'Kruidenkaas', 5.45, 'stuk', false, 0.4),
('Komijne kaas per kilo', 'Kaas', 'Kruidenkaas', 11.75, 'kg', true, 1.0),
('Komijne kaas 400 gram gevacumeerd', 'Kaas', 'Kruidenkaas', 5.45, 'stuk', false, 0.4),
('Fenegriek kaas per kilo', 'Kaas', 'Kruidenkaas', 11.75, 'kg', true, 1.0),
('Fenegriek 400 gram gevacumeerd', 'Kaas', 'Kruidenkaas', 5.45, 'stuk', false, 0.4),

-- ZUIVEL (Liquid items are multiplier 1.0)
('Volle boeren melk 1 liter', 'Zuivel', 'Melk', 1.35, 'liter', false, 1.0),
('Karnemelk 1 liter', 'Zuivel', 'Karnemelk', 1.56, 'liter', false, 1.0),
('Volle yoghurt 1 liter', 'Zuivel', 'Yoghurt', 1.60, 'liter', false, 1.0),
('Roomboter 250 gram', 'Zuivel', 'Boter/Room', 3.13, 'stuk', false, 0.25);
