# HZ Navigator

A comprehensive HUBZone certification platform built with TypeScript, React, and PostgreSQL with PostGIS for geospatial data management.

## 🏗️ Project Structure

```
hz-navigator/
├── backend/          # Node.js + Express + TypeScript API
├── frontend/         # React + TypeScript + Tailwind UI
├── database/         # PostgreSQL migrations & seeds
├── docs/             # Documentation
├── docker-compose.yml
└── .env.example
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd hz-navigator

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Database

```bash
# Start PostgreSQL with PostGIS
docker-compose up -d

# Wait for database to be ready
docker-compose logs -f postgres
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npm run migrate:up

# Start development server
npm run dev
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/docs

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 15 + PostGIS 3.3
- **ORM/Query**: node-postgres (pg)
- **Migrations**: node-pg-migrate
- **Validation**: Zod
- **Authentication**: JWT

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Maps**: Mapbox GL JS
- **Charts**: Recharts

### Infrastructure
- **Containerization**: Docker
- **Database**: PostgreSQL 15 + PostGIS
- **Reverse Proxy**: (configurable)

## 🗄️ Database

### Running Migrations

```bash
cd backend

# Create a new migration
npm run migrate:create -- my_migration_name

# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status
```

### Connecting to Database

```bash
# Via Docker
docker-compose exec postgres psql -U hz_admin -d hz_navigator

# Or using psql directly
psql postgresql://hz_admin:your_password@localhost:5432/hz_navigator
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test
npm run test:coverage
```

## 📝 API Documentation

API documentation is auto-generated and available at `/api/docs` when running the backend server.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/hubzones` | List HUBZone areas |
| GET | `/api/hubzones/:id` | Get HUBZone details |
| POST | `/api/certifications` | Submit certification |
| GET | `/api/map/layers` | Get map layer data |

## 🔧 Development

### Code Style

- ESLint + Prettier for code formatting
- Husky for pre-commit hooks
- Conventional commits recommended

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

### Environment Variables

See `.env.example` for all available configuration options.

## 📄 License

Copyright © 2024 HZ Navigator. All rights reserved.

