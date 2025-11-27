# HZ Navigator API Documentation

## Overview

The HZ Navigator API provides endpoints for HUBZone certification management, location verification, and business data handling.

**Base URL:** `http://localhost:3001/api`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check

#### GET /health

Check API and database health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected"
  }
}
```

---

### HUBZone Endpoints

#### GET /hubzones

List all HUBZone areas with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | - | Search by name, county, or state |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Census Tract 1234.01",
      "zone_type": "qualified_census_tract",
      "state": "DC",
      "county": "District of Columbia",
      "status": "active",
      "designation_date": "2020-01-01",
      "expiration_date": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### GET /hubzones/:id

Get a specific HUBZone by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "Census Tract 1234.01",
  "zone_type": "qualified_census_tract",
  "state": "DC",
  "county": "District of Columbia",
  "status": "active",
  "geometry": { /* GeoJSON */ },
  "designation_date": "2020-01-01",
  "expiration_date": null
}
```

#### POST /hubzones/check

Check if coordinates are within a HUBZone.

**Request Body:**
```json
{
  "latitude": 38.9072,
  "longitude": -77.0369
}
```

**Response:**
```json
{
  "isInHubzone": true,
  "coordinates": {
    "latitude": 38.9072,
    "longitude": -77.0369
  },
  "matchingZones": [
    {
      "id": "uuid",
      "name": "Census Tract 1234.01",
      "zone_type": "qualified_census_tract",
      "status": "active"
    }
  ],
  "checkedAt": "2024-01-20T12:00:00.000Z"
}
```

---

### Certification Endpoints

#### GET /certifications

List certifications for the authenticated user's business.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | - | Filter by status |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

#### POST /certifications

Submit a new certification application.

**Request Body:**
```json
{
  "businessId": "uuid",
  "primaryAddress": {
    "street1": "123 Main St",
    "city": "Washington",
    "state": "DC",
    "zipCode": "20001"
  },
  "employeeCount": 25,
  "hubzoneEmployeesCount": 10,
  "principalOfficeInHubzone": true
}
```

#### GET /certifications/:id

Get certification details.

#### PATCH /certifications/:id

Update certification (for reviewers).

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  },
  "timestamp": "2024-01-20T12:00:00.000Z",
  "path": "/api/endpoint"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NOT_FOUND | 404 | Resource not found |
| UNAUTHORIZED | 401 | Missing or invalid auth token |
| FORBIDDEN | 403 | Insufficient permissions |
| VALIDATION_ERROR | 400 | Invalid request data |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

API requests are rate limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705752000
```

