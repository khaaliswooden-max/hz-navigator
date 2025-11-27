# HZ Navigator Architecture

## System Overview

HZ Navigator is a full-stack TypeScript application for managing HUBZone certifications. It consists of three main components:

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│   │  Dashboard  │  │   Map View  │  │Certification│              │
│   └─────────────┘  └─────────────┘  └─────────────┘              │
│                          │                                        │
│                    Axios + React Router                           │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                     REST API (HTTPS)
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                      Backend (Express)                            │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│   │   Routes    │──│  Services   │──│   Models    │              │
│   └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                 │                      │
│   ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐                │
│   │Middleware │    │Validation │    │  Types    │                │
│   └───────────┘    └───────────┘    └───────────┘                │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                       PostgreSQL
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                   Database (PostgreSQL + PostGIS)                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│   │   Users     │  │  HUBZones   │  │Certifications│             │
│   └─────────────┘  └─────────────┘  └─────────────┘              │
│                    Geospatial Index                               │
└──────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router v6** - Routing
- **Mapbox GL** - Interactive maps
- **Recharts** - Data visualization
- **Axios** - HTTP client

### Backend
- **Node.js 18+** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **node-postgres (pg)** - Database driver
- **Zod** - Validation
- **JWT** - Authentication

### Database
- **PostgreSQL 15** - Primary database
- **PostGIS 3.3** - Geospatial extension
- **node-pg-migrate** - Migrations

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Local orchestration

## Directory Structure

```
hz-navigator/
├── backend/
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── tailwind.config.js
│
├── database/
│   ├── init/               # DB initialization
│   └── migrations/         # SQL migrations
│
├── docs/                   # Documentation
├── docker-compose.yml
└── README.md
```

## Data Flow

### HUBZone Check Flow

```
1. User enters address
        │
        ▼
2. Frontend geocodes address (Mapbox API)
        │
        ▼
3. POST /api/hubzones/check { lat, lng }
        │
        ▼
4. Backend executes PostGIS ST_Contains query
        │
        ▼
5. Return matching HUBZones or empty array
        │
        ▼
6. Frontend displays result to user
```

### Certification Flow

```
1. User creates business profile
        │
        ▼
2. User submits certification application
        │
        ▼
3. System validates HUBZone eligibility
        │
        ▼
4. Application enters review queue
        │
        ▼
5. Reviewer processes application
        │
        ▼
6. Certification approved/denied
```

## Security

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **Data**: All passwords hashed with bcrypt
- **API**: Rate limiting, CORS, Helmet.js
- **Database**: Parameterized queries, connection pooling

## Performance Considerations

- **Geospatial Indexing**: GIST index on geometry columns
- **Database Connection Pool**: Max 20 connections
- **Frontend Caching**: React Query for API responses
- **Map Tiles**: Vector tiles for efficient rendering

