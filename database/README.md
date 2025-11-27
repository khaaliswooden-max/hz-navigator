# HZ Navigator Database

This directory contains database configuration, migrations, and seed data for the HZ Navigator platform.

## Structure

```
database/
├── init/           # Initialization scripts (run on first container start)
├── migrations/     # SQL migration files
├── seeds/          # Seed data for development
└── README.md
```

## PostgreSQL with PostGIS

We use PostgreSQL 15 with the PostGIS 3.3 extension for geospatial data management. This enables:

- Storing HUBZone polygon boundaries
- Spatial queries (point-in-polygon checks)
- Geographic indexing for fast lookups

## Quick Start

### Start the database

```bash
# From project root
docker-compose up -d postgres

# Check logs
docker-compose logs -f postgres
```

### Connect to database

```bash
# Using Docker
docker-compose exec postgres psql -U hz_admin -d hz_navigator

# Using psql directly (requires PostgreSQL client)
psql postgresql://hz_admin:hz_dev_password@localhost:5432/hz_navigator
```

### Run migrations

```bash
cd backend
npm run migrate:up
```

## Migration Commands

```bash
# Create new migration
npm run migrate:create -- migration_name

# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status
```

## Useful SQL Commands

### Check if a point is in a HUBZone

```sql
SELECT name, zone_type, status
FROM hubzones
WHERE ST_Contains(
    geometry, 
    ST_SetSRID(ST_MakePoint(-77.0369, 38.9072), 4326)
)
AND status = 'active';
```

### Find all HUBZones in a state

```sql
SELECT name, zone_type, county
FROM hubzones
WHERE state = 'DC'
  AND status = 'active'
ORDER BY name;
```

### Get HUBZone as GeoJSON

```sql
SELECT 
    id, 
    name, 
    ST_AsGeoJSON(geometry) as geojson
FROM hubzones
WHERE id = 'your-uuid-here';
```

## Data Sources

HUBZone boundary data should be imported from the SBA's official sources:

- [SBA HUBZone Map](https://maps.sba.gov/hubzone/map)
- [HUBZone Data Downloads](https://www.sba.gov/federal-contracting/contracting-assistance-programs/hubzone-program)

## Backup & Restore

### Backup

```bash
docker-compose exec postgres pg_dump -U hz_admin hz_navigator > backup.sql
```

### Restore

```bash
cat backup.sql | docker-compose exec -T postgres psql -U hz_admin hz_navigator
```

