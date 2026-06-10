-- Seed data for POS System (idempotent)

-- Users (password = "admin123" for all)
INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES
('admin',    'admin@pos.com',    '$2a$10$FPH.ONfAgquWmXjM3LE61OIgOPgXX8i.jOISCHZ2DpK2gg4krEWfO', 'Admin',  'User',     'admin'),
('manager1', 'manager@pos.com',  '$2a$10$FPH.ONfAgquWmXjM3LE61OIgOPgXX8i.jOISCHZ2DpK2gg4krEWfO', 'John',   'Manager',  'manager'),
('server1',  'server1@pos.com',  '$2a$10$FPH.ONfAgquWmXjM3LE61OIgOPgXX8i.jOISCHZ2DpK2gg4krEWfO', 'Sarah',  'Smith',    'server'),
('server2',  'server2@pos.com',  '$2a$10$FPH.ONfAgquWmXjM3LE61OIgOPgXX8i.jOISCHZ2DpK2gg4krEWfO', 'Mike',   'Johnson',  'server'),
('counter1', 'counter1@pos.com', '$2a$10$FPH.ONfAgquWmXjM3LE61OIgOPgXX8i.jOISCHZ2DpK2gg4krEWfO', 'Lisa',   'Davis',    'counter'),
('counter2', 'counter2@pos.com', '$2a$10$FPH.ONfAgquWmXjM3LE61OIgOPgXX8i.jOISCHZ2DpK2gg4krEWfO', 'Tom',    'Wilson',   'counter'),
('kitchen1', 'kitchen@pos.com',  '$2a$10$FPH.ONfAgquWmXjM3LE61OIgOPgXX8i.jOISCHZ2DpK2gg4krEWfO', 'Chef',   'Williams', 'kitchen')
ON CONFLICT (username) DO NOTHING;

-- Categories
INSERT INTO categories (name, description, color, sort_order) VALUES
('Appetizers',   'Starter dishes and small plates',       '#FF6B6B', 1),
('Main Courses', 'Primary dishes and entrees',            '#4ECDC4', 2),
('Beverages',    'Drinks, sodas, and refreshments',       '#45B7D1', 3),
('Desserts',     'Sweet treats and desserts',             '#96CEB4', 4),
('Salads',       'Fresh salads and healthy options',      '#FECA57', 5),
('Pizza',        'Various pizza options',                 '#FF9FF3', 6)
ON CONFLICT DO NOTHING;

-- Products
INSERT INTO products (category_id, name, description, price, sku, preparation_time, sort_order) VALUES
((SELECT id FROM categories WHERE name = 'Appetizers'), 'Buffalo Wings',    'Crispy chicken wings with buffalo sauce',          12.99, 'APP001', 15, 1),
((SELECT id FROM categories WHERE name = 'Appetizers'), 'Mozzarella Sticks','Breaded mozzarella with marinara sauce',            8.99, 'APP002', 10, 2),
((SELECT id FROM categories WHERE name = 'Appetizers'), 'Nachos Supreme',   'Tortilla chips with cheese, jalapeños, and toppings',11.49,'APP003', 12, 3),
((SELECT id FROM categories WHERE name = 'Appetizers'), 'Onion Rings',      'Crispy beer-battered onion rings',                  7.99, 'APP004',  8, 4),
((SELECT id FROM categories WHERE name = 'Main Courses'),'Grilled Chicken Breast','Seasoned grilled chicken with vegetables',   18.99,'MAIN001', 20, 1),
((SELECT id FROM categories WHERE name = 'Main Courses'),'Beef Steak',      'Premium cut beef steak cooked to order',           26.99,'MAIN002', 25, 2),
((SELECT id FROM categories WHERE name = 'Main Courses'),'Fish & Chips',    'Beer battered fish with crispy fries',             16.99,'MAIN003', 18, 3),
((SELECT id FROM categories WHERE name = 'Main Courses'),'Pasta Carbonara', 'Creamy pasta with bacon and parmesan',             15.99,'MAIN004', 15, 4),
((SELECT id FROM categories WHERE name = 'Main Courses'),'BBQ Ribs',        'Slow-cooked ribs with BBQ sauce',                  22.99,'MAIN005', 30, 5),
((SELECT id FROM categories WHERE name = 'Beverages'),  'Coca Cola',        'Classic cola soft drink',                           2.99, 'BEV001',  0, 1),
((SELECT id FROM categories WHERE name = 'Beverages'),  'Fresh Orange Juice','Freshly squeezed orange juice',                    4.99, 'BEV002',  2, 2),
((SELECT id FROM categories WHERE name = 'Beverages'),  'Coffee',           'Freshly brewed coffee',                             3.49, 'BEV003',  3, 3),
((SELECT id FROM categories WHERE name = 'Beverages'),  'Iced Tea',         'Refreshing iced tea',                               2.99, 'BEV004',  1, 4),
((SELECT id FROM categories WHERE name = 'Beverages'),  'Milkshake - Vanilla','Creamy vanilla milkshake',                        5.99, 'BEV005',  4, 5),
((SELECT id FROM categories WHERE name = 'Desserts'),   'Chocolate Cake',   'Rich chocolate cake with frosting',                 6.99, 'DES001',  5, 1),
((SELECT id FROM categories WHERE name = 'Desserts'),   'Apple Pie',        'Classic apple pie with cinnamon',                   5.99, 'DES002',  8, 2),
((SELECT id FROM categories WHERE name = 'Desserts'),   'Ice Cream Sundae', 'Vanilla ice cream with toppings',                   4.99, 'DES003',  3, 3),
((SELECT id FROM categories WHERE name = 'Desserts'),   'Cheesecake',       'New York style cheesecake',                         7.99, 'DES004',  5, 4),
((SELECT id FROM categories WHERE name = 'Salads'),     'Caesar Salad',     'Romaine lettuce with caesar dressing',               9.99, 'SAL001',  8, 1),
((SELECT id FROM categories WHERE name = 'Salads'),     'Greek Salad',      'Fresh vegetables with feta cheese',                11.99, 'SAL002', 10, 2),
((SELECT id FROM categories WHERE name = 'Salads'),     'Garden Salad',     'Mixed greens with vegetables',                      8.99, 'SAL003',  6, 3),
((SELECT id FROM categories WHERE name = 'Pizza'),      'Margherita Pizza', 'Classic pizza with tomato, mozzarella, basil',     14.99, 'PIZ001', 16, 1),
((SELECT id FROM categories WHERE name = 'Pizza'),      'Pepperoni Pizza',  'Pizza with pepperoni and cheese',                  16.99, 'PIZ002', 16, 2),
((SELECT id FROM categories WHERE name = 'Pizza'),      'Supreme Pizza',    'Pizza loaded with multiple toppings',              19.99, 'PIZ003', 20, 3),
((SELECT id FROM categories WHERE name = 'Pizza'),      'Hawaiian Pizza',   'Pizza with ham and pineapple',                     17.99, 'PIZ004', 16, 4)
ON CONFLICT (sku) DO NOTHING;

-- Dining tables
INSERT INTO dining_tables (table_number, seating_capacity, location) VALUES
('T01',     2, 'Main Floor'),
('T02',     4, 'Main Floor'),
('T03',     4, 'Main Floor'),
('T04',     6, 'Main Floor'),
('T05',     2, 'Main Floor'),
('T06',     4, 'Window Side'),
('T07',     4, 'Window Side'),
('T08',     8, 'Private Room'),
('T09',     2, 'Patio'),
('T10',     4, 'Patio'),
('BAR01',   1, 'Bar Counter'),
('BAR02',   1, 'Bar Counter'),
('BAR03',   1, 'Bar Counter'),
('TAKEOUT', 1, 'Takeout Counter')
ON CONFLICT (table_number) DO NOTHING;

-- Inventory (only for products that don't have an inventory record yet)
INSERT INTO inventory (product_id, current_stock, minimum_stock, maximum_stock, unit_cost)
SELECT id, 50, 10, 100, price * 0.4
FROM products
WHERE id NOT IN (SELECT product_id FROM inventory);
