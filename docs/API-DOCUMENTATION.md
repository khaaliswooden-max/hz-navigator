# HZ Navigator API Documentation

Comprehensive API documentation for the HZ Navigator HUBZone Certification Management Platform.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Swagger UI](#swagger-ui)
- [Postman Collection](#postman-collection)
- [OpenAPI Specification](#openapi-specification)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The HZ Navigator API provides a comprehensive set of endpoints for managing HUBZone certification, compliance monitoring, document management, and contract tracking.

### Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3001` |
| Staging | `https://api-staging.hz-navigator.gov` |
| Production | `https://api.hz-navigator.gov` |

### API Version

Current version: `1.0.0`

## Getting Started

### 1. Installation

```bash
cd backend
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Access API Documentation

- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json

### 4. Import Postman Collection

1. Open Postman
2. Click **Import** → **Upload Files**
3. Select `docs/postman/HZ-Navigator-API.postman_collection.json`
4. Import the environment file: `docs/postman/HZ-Navigator-API.postman_environment.json`

## Authentication

The API uses JWT (JSON Web Token) based authentication.

### Obtaining a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    }
  }
}
```

### Using the Token

Include the token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Standard user | Access to own businesses and documents |
| `reviewer` | Compliance reviewer | Read-only access to review compliance data |
| `admin` | Administrator | Full access including system management |

### Token Expiry

Tokens expire after 24 hours. After expiry, the client must re-authenticate.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate and get JWT token |
| POST | `/api/auth/register` | Register new user account |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/logout` | Logout user |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check API health status |

### HUBZones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hubzones` | List all HUBZone areas |
| GET | `/api/hubzones/:id` | Get HUBZone by ID |
| POST | `/api/hubzones/check` | Check if coordinates are in a HUBZone |

### Map & Geographic Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/map/tiles/:z/:x/:y.pbf` | Get vector tile |
| POST | `/api/v1/hubzone/radius-search` | Search HUBZones within radius |
| GET | `/api/v1/hubzone/tract/:tractId` | Get tract details |
| GET | `/api/v1/hubzone/statistics` | Get HUBZone statistics |
| POST | `/api/v1/hubzone/export` | Export HUBZone data |
| GET | `/api/v1/hubzone/states` | Get states list |
| GET | `/api/v1/hubzone/bounds` | Get map bounds |

### Compliance Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/businesses/:id/compliance/current` | Get current compliance status |
| GET | `/api/v1/businesses/:id/compliance/history` | Get compliance history |
| POST | `/api/v1/businesses/:id/compliance/snapshot` | Create compliance snapshot |
| GET | `/api/v1/businesses/:id/compliance/trend` | Get compliance trend |
| GET | `/api/v1/businesses/:id/compliance/report` | Generate compliance report |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/businesses/:id/alerts` | Get business alerts |
| POST | `/api/v1/businesses/:id/alerts/generate` | Generate alerts |
| GET | `/api/v1/alerts/dashboard` | Get dashboard summary |
| GET | `/api/v1/alerts/:alertId` | Get alert by ID |
| PUT | `/api/v1/alerts/:alertId/acknowledge` | Acknowledge alert |
| DELETE | `/api/v1/alerts/:alertId` | Dismiss alert |

### Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts` | List contracts |
| POST | `/api/contracts` | Create contract |
| GET | `/api/contracts/:id` | Get contract |
| PUT | `/api/contracts/:id` | Update contract |
| DELETE | `/api/contracts/:id` | Delete contract |
| GET | `/api/contracts/progress/:fiscalYear` | Get goal progress |
| GET | `/api/contracts/summary/:fiscalYear` | Get summary |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/init-upload` | Initialize upload |
| POST | `/api/documents/:id/confirm` | Confirm upload |
| GET | `/api/documents` | List documents |
| GET | `/api/documents/:id` | Get document |
| GET | `/api/documents/:id/download` | Get download URL |
| DELETE | `/api/documents/:id` | Delete document |
| GET | `/api/documents/search` | Search documents |

### Agency Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agency/contractors/search` | Search contractors |
| GET | `/api/agency/verify/:ueiNumber` | Verify contractor |
| POST | `/api/agency/verify/bulk` | Bulk verify contractors |
| GET | `/api/agency/verifications/history` | Get verification history |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/metrics/:agencyId` | Get agency metrics |
| GET | `/api/analytics/dashboard/:agencyId` | Get dashboard data |
| GET | `/api/analytics/contractors` | Get contractor directory |
| POST | `/api/analytics/reports/generate` | Generate report |
| GET | `/api/analytics/reports/types` | Get report types |

### OCR

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ocr/process/:documentId` | Process document with OCR |
| GET | `/api/ocr/result/:documentId` | Get OCR result |
| POST | `/api/ocr/approve/:documentId` | Approve extraction |
| GET | `/api/ocr/auto-populate/:documentId` | Get auto-populate suggestions |

### Admin (Requires Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/hubzone/update-map` | Trigger map update |
| GET | `/api/v1/admin/hubzone/update-status` | Get job status |
| GET | `/api/v1/admin/jobs` | List all jobs |
| GET | `/api/v1/admin/system/health` | Get system health |

### Metrics (Requires Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics` | Get performance metrics |
| GET | `/api/metrics/health` | Get health with metrics |
| GET | `/api/metrics/detailed` | Get detailed metrics |
| POST | `/api/metrics/cache/clear` | Clear cache |

## Swagger UI

Access interactive API documentation at `/api-docs`:

![Swagger UI](https://swagger.io/tools/swagger-ui/)

Features:
- Try out API endpoints directly
- View request/response schemas
- Download OpenAPI specification
- Authenticate with JWT token

## Postman Collection

### Files

| File | Description |
|------|-------------|
| `HZ-Navigator-API.postman_collection.json` | Complete API collection with examples |
| `HZ-Navigator-API.postman_environment.json` | Development environment variables |
| `HZ-Navigator-API-Production.postman_environment.json` | Production environment variables |

### Pre-request Scripts

The collection includes automatic token management:

```javascript
// Automatically adds JWT token to requests
const token = pm.environment.get('access_token');
if (token) {
  pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + token
  });
}
```

### Test Scripts

Each request includes tests:

```javascript
pm.test('Status code is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response time is acceptable', function () {
  pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

## OpenAPI Specification

### Export OpenAPI JSON

```bash
npm run openapi:export
```

This generates `docs/openapi.json` which can be used with:
- API Gateway configurations
- Client SDK generation
- External documentation tools
- API testing tools

### Using with External Tools

**Generate TypeScript Client:**
```bash
npx openapi-generator-cli generate -i docs/openapi.json -g typescript-axios -o ./generated/client
```

**Generate API Gateway Config:**
```bash
aws apigatewayv2 import-api --body file://docs/openapi.json
```

## Rate Limiting

The API implements rate limiting to protect against abuse:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Password Reset | 3 requests | 1 hour |
| Standard API | 100 requests | 1 minute |
| File Uploads | 10 requests | 1 minute |
| Admin Endpoints | 30 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642345678
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "message": "Too many requests. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": [
      {
        "path": ["fieldName"],
        "message": "Specific field error"
      }
    ]
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 423 | Locked - Account temporarily locked |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Email or password is incorrect |
| `ACCOUNT_LOCKED` | Too many failed login attempts |
| `ACCOUNT_DISABLED` | User account is disabled |
| `EMAIL_EXISTS` | Email already registered |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Examples

### Login and Make Authenticated Request

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecureP@ss123"}' \
  | jq -r '.data.token')

# Use token for authenticated request
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Check HUBZone Location

```bash
curl -X POST http://localhost:3001/api/hubzones/check \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 38.9072,
    "longitude": -77.0369
  }'
```

### Upload Document

```bash
# Step 1: Initialize upload
INIT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/documents/init-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalFilename": "certification.pdf",
    "fileSize": 1048576,
    "category": "certification"
  }')

UPLOAD_URL=$(echo $INIT_RESPONSE | jq -r '.data.uploadUrl')
DOC_ID=$(echo $INIT_RESPONSE | jq -r '.data.documentId')

# Step 2: Upload file to S3 using pre-signed URL
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @certification.pdf

# Step 3: Confirm upload
curl -X POST "http://localhost:3001/api/documents/$DOC_ID/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"s3VersionId": "version-from-s3-response"}'
```

### Bulk Verify Contractors

```bash
curl -X POST http://localhost:3001/api/agency/verify/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agency-Id: my-agency-id" \
  -H "Content-Type: application/json" \
  -d '{
    "ueiNumbers": [
      "ABC123DEF456",
      "XYZ789GHI012"
    ]
  }'
```

### Generate Report

```bash
curl -X POST http://localhost:3001/api/analytics/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "hubzone_goal_achievement",
    "agencyId": "my-agency-id",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "format": "pdf",
    "includeCharts": true
  }'
```

---

## Support

For API support, contact:
- Email: support@hz-navigator.gov
- Documentation: https://hz-navigator.gov/docs
- Issue Tracker: https://github.com/hz-navigator/api/issues

