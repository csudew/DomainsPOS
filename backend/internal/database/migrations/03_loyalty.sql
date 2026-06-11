-- Loyalty program tables (idempotent)

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    min_points INTEGER NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    points_per_dollar DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    color VARCHAR(20) DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    total_points INTEGER NOT NULL DEFAULT 0,
    lifetime_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
    tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjust')),
    description VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone ON loyalty_customers(phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);

DROP TRIGGER IF EXISTS update_loyalty_tiers_updated_at ON loyalty_tiers;
CREATE TRIGGER update_loyalty_tiers_updated_at BEFORE UPDATE ON loyalty_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loyalty_customers_updated_at ON loyalty_customers;
CREATE TRIGGER update_loyalty_customers_updated_at BEFORE UPDATE ON loyalty_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default tiers only if none exist
INSERT INTO loyalty_tiers (name, min_points, discount_percent, points_per_dollar, color, sort_order)
SELECT v.name, v.min_points, v.discount_percent, v.points_per_dollar, v.color, v.sort_order
FROM (VALUES
    ('Bronze', 0,    0.0, 1.0, '#CD7F32', 1),
    ('Silver', 500,  5.0, 1.5, '#C0C0C0', 2),
    ('Gold',   1500, 10.0, 2.0, '#FFD700', 3)
) AS v(name, min_points, discount_percent, points_per_dollar, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM loyalty_tiers LIMIT 1);
