# Development Guide

## Prerequisites

- Node.js 18 or higher
- npm 9+
- Docker and Docker Compose
- Git

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hz-navigator
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
# Required: POSTGRES_PASSWORD, JWT_SECRET
# Optional: VITE_MAPBOX_ACCESS_TOKEN (for maps)
```

### 3. Start Database

```bash
# Start PostgreSQL with PostGIS
docker-compose up -d postgres

# Verify it's running
docker-compose ps
docker-compose logs postgres
```

### 4. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npm run migrate:up

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Development Workflow

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

### Database Migrations

```bash
cd backend

# Create new migration
npm run migrate:create -- add_new_table

# Run migrations
npm run migrate:up

# Rollback
npm run migrate:down
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Project Structure

### Backend (`/backend/src`)

```
src/
├── routes/           # Express route handlers
│   ├── health.ts     # Health check endpoint
│   └── hubzones.ts   # HUBZone CRUD endpoints
│
├── services/         # Business logic
│   ├── database.ts   # Database connection
│   └── hubzoneService.ts
│
├── middleware/       # Express middleware
│   ├── auth.ts       # JWT authentication
│   ├── errorHandler.ts
│   └── notFoundHandler.ts
│
├── types/            # TypeScript definitions
│   ├── hubzone.ts
│   └── index.ts
│
└── index.ts          # Application entry
```

### Frontend (`/frontend/src`)

```
src/
├── components/       # Reusable UI components
│   └── Layout.tsx
│
├── pages/            # Page-level components
│   ├── Dashboard.tsx
│   ├── HubzoneCheck.tsx
│   ├── MapExplorer.tsx
│   └── Certifications.tsx
│
├── services/         # API client layer
│   ├── api.ts        # Axios instance
│   └── hubzoneService.ts
│
├── hooks/            # Custom React hooks
├── types/            # TypeScript definitions
├── App.tsx           # Root component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## Common Tasks

### Adding a New API Endpoint

1. Create route handler in `/backend/src/routes/`
2. Add service methods in `/backend/src/services/`
3. Register route in `/backend/src/index.ts`
4. Add frontend API method in `/frontend/src/services/`
5. Update TypeScript types as needed

### Adding a New Page

1. Create component in `/frontend/src/pages/`
2. Add route in `/frontend/src/App.tsx`
3. Add navigation link in `/frontend/src/components/Layout.tsx`

### Database Changes

1. Create migration: `npm run migrate:create -- description`
2. Write SQL in the new migration file
3. Run migration: `npm run migrate:up`
4. Update TypeScript types if needed

## Troubleshooting

### Database Connection Issues

```bash
# Check if container is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port Conflicts

Edit `.env` to change default ports:
- `APP_PORT` for backend (default: 3001)
- `POSTGRES_PORT` for database (default: 5432)

### TypeScript Errors

```bash
# Full type check
npm run typecheck

# Clear build cache
rm -rf dist/ node_modules/.cache
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Environment mode |
| APP_PORT | No | 3001 | Backend port |
| POSTGRES_HOST | No | localhost | Database host |
| POSTGRES_PORT | No | 5432 | Database port |
| POSTGRES_USER | Yes | - | Database user |
| POSTGRES_PASSWORD | Yes | - | Database password |
| POSTGRES_DB | No | hz_navigator | Database name |
| JWT_SECRET | Yes | - | JWT signing key |
| VITE_MAPBOX_ACCESS_TOKEN | No | - | Mapbox API key |

