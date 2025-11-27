-- Migration: Insert sample data for development
-- Created: 2024-01-01

-- Up Migration
-- ============

-- Sample admin user (password: 'admin123' - hashed with bcrypt)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@hznavigator.gov',
    '$2b$10$rQxQvS5pT3gQ6HvY7jPpWO.Y5s/7YKqU0EFpLU/8KJqNqY9u9.m7C',
    'System',
    'Administrator',
    'admin',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Sample reviewer user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified_at)
VALUES (
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'reviewer@hznavigator.gov',
    '$2b$10$rQxQvS5pT3gQ6HvY7jPpWO.Y5s/7YKqU0EFpLU/8KJqNqY9u9.m7C',
    'John',
    'Reviewer',
    'reviewer',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Sample regular user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified_at)
VALUES (
    'c2ggde99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'user@example.com',
    '$2b$10$rQxQvS5pT3gQ6HvY7jPpWO.Y5s/7YKqU0EFpLU/8KJqNqY9u9.m7C',
    'Jane',
    'Doe',
    'user',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Sample business
INSERT INTO businesses (id, user_id, name, duns_number, ein, primary_address, phone, employee_count)
VALUES (
    'd3hhef99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'c2ggde99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Acme Solutions LLC',
    '123456789',
    '12-3456789',
    '{"street1": "123 Main Street", "city": "Washington", "state": "DC", "zipCode": "20001", "country": "USA"}',
    '202-555-0100',
    25
) ON CONFLICT DO NOTHING;

-- Sample HUBZone (simplified polygon for DC area)
INSERT INTO hubzones (
    id, 
    external_id,
    name, 
    zone_type, 
    state, 
    county, 
    fips_code,
    designation_date, 
    status, 
    geometry
)
VALUES (
    'e4iifg99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'QCT-11001-001',
    'Census Tract 1234.01, Washington DC',
    'qualified_census_tract',
    'DC',
    'District of Columbia',
    '11001',
    '2020-01-01',
    'active',
    ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((-77.05 38.90, -77.00 38.90, -77.00 38.92, -77.05 38.92, -77.05 38.90)))'), 4326)
) ON CONFLICT (external_id) DO NOTHING;

-- Another sample HUBZone
INSERT INTO hubzones (
    id, 
    external_id,
    name, 
    zone_type, 
    state, 
    county, 
    fips_code,
    designation_date, 
    status, 
    geometry
)
VALUES (
    'f5jjgh99-9c0b-4ef8-bb6d-6bb9bd380a66',
    'QNMC-24033-001',
    'Prince Georges County Non-Metro Area',
    'qualified_non_metro_county',
    'MD',
    'Prince Georges',
    '24033',
    '2019-06-15',
    'active',
    ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((-76.95 38.85, -76.90 38.85, -76.90 38.88, -76.95 38.88, -76.95 38.85)))'), 4326)
) ON CONFLICT (external_id) DO NOTHING;

-- Down Migration
-- ==============
-- DELETE FROM hubzones WHERE id IN ('e4iifg99-9c0b-4ef8-bb6d-6bb9bd380a55', 'f5jjgh99-9c0b-4ef8-bb6d-6bb9bd380a66');
-- DELETE FROM businesses WHERE id = 'd3hhef99-9c0b-4ef8-bb6d-6bb9bd380a44';
-- DELETE FROM users WHERE id IN ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c2ggde99-9c0b-4ef8-bb6d-6bb9bd380a33');

