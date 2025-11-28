/**
 * Swagger/OpenAPI Configuration
 * 
 * Comprehensive API documentation for HZ Navigator API
 */

import swaggerJsdoc from 'swagger-jsdoc';
import type { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'HZ Navigator API',
      version: '1.0.0',
      description: `
# HZ Navigator API Documentation

HZ Navigator is a comprehensive HUBZone certification management platform that helps businesses 
maintain compliance with SBA HUBZone program requirements.

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **Business Management**: Create and manage HUBZone certified businesses
- **Compliance Monitoring**: Real-time compliance tracking and alerts
- **Document Management**: Secure document upload and OCR processing
- **Contract Tracking**: Agency contract management and goal tracking
- **HUBZone Maps**: Geographic verification with vector tile support
- **Analytics**: Comprehensive reporting and analytics dashboards

## Authentication

Most endpoints require authentication via JWT Bearer token. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Roles

- **user**: Standard user with access to their own businesses
- **reviewer**: Can view and review compliance data
- **admin**: Full administrative access

## Rate Limiting

The API implements rate limiting to protect against abuse:

- **Authentication endpoints**: 5 requests per minute
- **Password reset**: 3 requests per hour
- **Standard API**: 100 requests per minute
- **File uploads**: 10 requests per minute
- **Admin endpoints**: 30 requests per minute

## Response Format

All responses follow a consistent format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T12:00:00.000Z"
  }
}
\`\`\`

Error responses include error details:

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": [...]
  }
}
\`\`\`
`,
      contact: {
        name: 'HZ Navigator Support',
        email: 'support@hz-navigator.gov',
        url: 'https://hz-navigator.gov/support',
      },
      license: {
        name: 'Proprietary',
        url: 'https://hz-navigator.gov/terms',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.hz-navigator.gov',
        description: 'Production server',
      },
      {
        url: 'https://api-staging.hz-navigator.gov',
        description: 'Staging server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management',
      },
      {
        name: 'Admin',
        description: 'Administrative operations (requires admin role)',
      },
      {
        name: 'Alerts',
        description: 'Compliance alerts and notifications',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting',
      },
      {
        name: 'Agency',
        description: 'Agency contractor verification',
      },
      {
        name: 'Compliance',
        description: 'Business compliance monitoring',
      },
      {
        name: 'Contracts',
        description: 'Contract management and goal tracking',
      },
      {
        name: 'Documents',
        description: 'Document upload and management',
      },
      {
        name: 'Health',
        description: 'System health checks',
      },
      {
        name: 'HUBZones',
        description: 'HUBZone area lookup and verification',
      },
      {
        name: 'Map',
        description: 'Vector tiles and geographic data',
      },
      {
        name: 'Metrics',
        description: 'System metrics and monitoring (admin only)',
      },
      {
        name: 'OCR',
        description: 'Document OCR processing',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token obtained from /api/auth/login',
        },
        ApiKeyHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Agency-Id',
          description: 'Agency identifier for agency-specific operations',
        },
      },
      schemas: {
        // ===== Common Schemas =====
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T12:00:00.000Z',
                },
                requestId: {
                  type: 'string',
                  format: 'uuid',
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              required: ['message'],
              properties: {
                message: {
                  type: 'string',
                  example: 'An error occurred',
                },
                code: {
                  type: 'string',
                  example: 'ERROR_CODE',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      path: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      message: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 20,
            },
            total: {
              type: 'integer',
              example: 150,
            },
            totalPages: {
              type: 'integer',
              example: 8,
            },
          },
        },

        // ===== Authentication Schemas =====
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 1,
              example: 'SecureP@ss123',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'newuser@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              description: 'Must contain uppercase, lowercase, number, and special character',
              example: 'SecureP@ss123',
            },
            firstName: {
              type: 'string',
              maxLength: 100,
              example: 'John',
            },
            lastName: {
              type: 'string',
              maxLength: 100,
              example: 'Doe',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'reviewer'],
              example: 'user',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: {
              type: 'string',
              example: 'reset-token-from-email',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'NewSecureP@ss123',
            },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              format: 'password',
              example: 'OldP@ss123',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'NewSecureP@ss123',
            },
          },
        },

        // ===== Business Schemas =====
        Business: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'ACME Corporation',
            },
            dunsNumber: {
              type: 'string',
              pattern: '^[0-9]{9}$',
              example: '123456789',
            },
            ein: {
              type: 'string',
              pattern: '^[0-9]{2}-[0-9]{7}$',
              example: '12-3456789',
            },
            ueiNumber: {
              type: 'string',
              pattern: '^[A-Z0-9]{12}$',
              example: 'ABC123DEF456',
            },
            primaryAddress: {
              type: 'string',
              example: '123 Main St, Washington, DC 20001',
            },
            principalOfficeAddress: {
              type: 'string',
              example: '123 Main St, Washington, DC 20001',
            },
            website: {
              type: 'string',
              format: 'uri',
              example: 'https://acme.example.com',
            },
            phone: {
              type: 'string',
              example: '+1-202-555-0100',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // ===== Alert Schemas =====
        ComplianceAlert: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            businessId: {
              type: 'string',
              format: 'uuid',
            },
            businessName: {
              type: 'string',
              example: 'ACME Corporation',
            },
            type: {
              type: 'string',
              enum: [
                'residency_threshold',
                'principal_office',
                'certification_expiration',
                'ownership_compliance',
                'employee_verification',
                'grace_period_expiring',
              ],
              example: 'residency_threshold',
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              example: 'high',
            },
            status: {
              type: 'string',
              enum: ['active', 'acknowledged', 'dismissed', 'resolved'],
              example: 'active',
            },
            title: {
              type: 'string',
              example: 'HUBZone Residency Below Threshold',
            },
            message: {
              type: 'string',
              example: 'Your HUBZone residency percentage has dropped to 32%, below the required 35% threshold.',
            },
            details: {
              type: 'object',
              properties: {
                currentValue: {
                  type: 'number',
                  example: 32,
                },
                threshold: {
                  type: 'number',
                  example: 35,
                },
                daysRemaining: {
                  type: 'integer',
                  example: 30,
                },
                trend: {
                  type: 'string',
                  enum: ['increasing', 'stable', 'declining'],
                },
              },
            },
            actionRequired: {
              type: 'string',
              example: 'Hire additional HUBZone residents or relocate employees.',
            },
            actionUrl: {
              type: 'string',
              example: '/dashboard/compliance/residency',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            acknowledgedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        AlertDashboardSummary: {
          type: 'object',
          properties: {
            totalAlerts: {
              type: 'integer',
              example: 15,
            },
            byStatus: {
              type: 'object',
              properties: {
                active: { type: 'integer', example: 5 },
                acknowledged: { type: 'integer', example: 3 },
                dismissed: { type: 'integer', example: 2 },
                resolved: { type: 'integer', example: 5 },
              },
            },
            bySeverity: {
              type: 'object',
              properties: {
                critical: { type: 'integer', example: 1 },
                high: { type: 'integer', example: 3 },
                medium: { type: 'integer', example: 6 },
                low: { type: 'integer', example: 5 },
              },
            },
            recentAlerts: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ComplianceAlert',
              },
            },
          },
        },
        NotificationPreferences: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
            },
            emailEnabled: {
              type: 'boolean',
              example: true,
            },
            smsEnabled: {
              type: 'boolean',
              example: false,
            },
            dashboardEnabled: {
              type: 'boolean',
              example: true,
            },
            pushEnabled: {
              type: 'boolean',
              example: true,
            },
            criticalAlerts: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['email', 'sms', 'dashboard', 'push'],
              },
              example: ['email', 'sms', 'dashboard', 'push'],
            },
            highAlerts: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['email', 'sms', 'dashboard', 'push'],
              },
              example: ['email', 'dashboard', 'push'],
            },
            emailDigest: {
              type: 'string',
              enum: ['immediate', 'daily', 'weekly'],
              example: 'daily',
            },
          },
        },

        // ===== Compliance Schemas =====
        ComplianceStatus: {
          type: 'object',
          properties: {
            businessId: {
              type: 'string',
              format: 'uuid',
            },
            overallStatus: {
              type: 'string',
              enum: ['compliant', 'at_risk', 'non_compliant'],
              example: 'compliant',
            },
            complianceScore: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 85,
            },
            riskLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              example: 'low',
            },
            residency: {
              type: 'object',
              properties: {
                percentage: {
                  type: 'number',
                  example: 42.5,
                },
                isCompliant: {
                  type: 'boolean',
                  example: true,
                },
                threshold: {
                  type: 'number',
                  example: 35,
                },
              },
            },
            principalOffice: {
              type: 'object',
              properties: {
                isCompliant: {
                  type: 'boolean',
                  example: true,
                },
                inHubzone: {
                  type: 'boolean',
                  example: true,
                },
                hubzoneName: {
                  type: 'string',
                  example: 'Qualified Census Tract 1234',
                },
              },
            },
            certification: {
              type: 'object',
              properties: {
                isExpired: {
                  type: 'boolean',
                  example: false,
                },
                isExpiringSoon: {
                  type: 'boolean',
                  example: false,
                },
                expirationDate: {
                  type: 'string',
                  format: 'date',
                },
                daysUntilExpiration: {
                  type: 'integer',
                  example: 180,
                },
              },
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ComplianceReport: {
          type: 'object',
          properties: {
            businessId: {
              type: 'string',
              format: 'uuid',
            },
            businessName: {
              type: 'string',
            },
            period: {
              type: 'string',
              enum: ['weekly', 'monthly', 'quarterly', 'annual'],
            },
            startDate: {
              type: 'string',
              format: 'date',
            },
            endDate: {
              type: 'string',
              format: 'date',
            },
            generatedAt: {
              type: 'string',
              format: 'date-time',
            },
            complianceScore: {
              type: 'integer',
            },
            executiveSummary: {
              type: 'object',
              properties: {
                overallStatus: {
                  type: 'string',
                },
                keyFindings: {
                  type: 'array',
                  items: { type: 'string' },
                },
                criticalIssues: {
                  type: 'array',
                  items: { type: 'string' },
                },
                riskLevel: {
                  type: 'string',
                },
              },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  priority: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                  },
                  title: {
                    type: 'string',
                  },
                  description: {
                    type: 'string',
                  },
                  impact: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },

        // ===== Contract Schemas =====
        Contract: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            agencyId: {
              type: 'string',
            },
            contractNumber: {
              type: 'string',
              example: 'GS-35F-0001N',
            },
            title: {
              type: 'string',
              example: 'IT Support Services',
            },
            description: {
              type: 'string',
            },
            contractorName: {
              type: 'string',
              example: 'ACME IT Services',
            },
            contractorUei: {
              type: 'string',
              example: 'ABC123DEF456',
            },
            isHubzoneContractor: {
              type: 'boolean',
              example: true,
            },
            awardDate: {
              type: 'string',
              format: 'date',
            },
            awardValue: {
              type: 'number',
              example: 500000,
            },
            currentValue: {
              type: 'number',
              example: 750000,
            },
            contractType: {
              type: 'string',
              enum: ['hubzone_set_aside', 'hubzone_sole_source', 'price_preference', 'full_open', 'small_business', 'other'],
            },
            awardType: {
              type: 'string',
              enum: ['firm_fixed_price', 'cost_reimbursement', 'time_materials', 'labor_hour', 'indefinite_delivery', 'other'],
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'terminated', 'pending', 'cancelled'],
            },
            fiscalYear: {
              type: 'integer',
              example: 2024,
            },
            fiscalQuarter: {
              type: 'integer',
              minimum: 1,
              maximum: 4,
              example: 1,
            },
          },
        },
        CreateContractRequest: {
          type: 'object',
          required: ['contractNumber', 'title', 'contractorName', 'contractorUei', 'awardDate', 'awardValue', 'contractType', 'awardType', 'periodOfPerformanceStart', 'periodOfPerformanceEnd'],
          properties: {
            contractNumber: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            contractorName: {
              type: 'string',
            },
            contractorUei: {
              type: 'string',
            },
            contractorCageCode: {
              type: 'string',
            },
            isHubzoneContractor: {
              type: 'boolean',
              default: false,
            },
            awardDate: {
              type: 'string',
              format: 'date',
            },
            awardValue: {
              type: 'number',
            },
            contractType: {
              type: 'string',
              enum: ['hubzone_set_aside', 'hubzone_sole_source', 'price_preference', 'full_open', 'small_business', 'other'],
            },
            awardType: {
              type: 'string',
              enum: ['firm_fixed_price', 'cost_reimbursement', 'time_materials', 'labor_hour', 'indefinite_delivery', 'other'],
            },
            naicsCodes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  title: { type: 'string' },
                  isPrimary: { type: 'boolean' },
                },
              },
            },
            psc: {
              type: 'string',
            },
            periodOfPerformanceStart: {
              type: 'string',
              format: 'date',
            },
            periodOfPerformanceEnd: {
              type: 'string',
              format: 'date',
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'terminated', 'pending', 'cancelled'],
            },
          },
        },
        GoalProgress: {
          type: 'object',
          properties: {
            fiscalYear: {
              type: 'integer',
            },
            agencyId: {
              type: 'string',
            },
            goalPercentage: {
              type: 'number',
              example: 3.0,
            },
            goalAmount: {
              type: 'number',
            },
            totalContractsAwarded: {
              type: 'integer',
            },
            totalContractValue: {
              type: 'number',
            },
            hubzoneContractsAwarded: {
              type: 'integer',
            },
            hubzoneContractValue: {
              type: 'number',
            },
            currentPercentage: {
              type: 'number',
            },
            percentageOfGoal: {
              type: 'number',
            },
            isOnTrack: {
              type: 'boolean',
            },
          },
        },

        // ===== Document Schemas =====
        Document: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            businessId: {
              type: 'string',
              format: 'uuid',
            },
            category: {
              type: 'string',
              enum: ['certification', 'employee_verification', 'ownership', 'contract', 'compliance_report', 'miscellaneous'],
            },
            filename: {
              type: 'string',
            },
            originalFilename: {
              type: 'string',
              example: 'certification_document.pdf',
            },
            fileSize: {
              type: 'integer',
              example: 1048576,
            },
            fileType: {
              type: 'string',
              enum: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'uploaded', 'processing', 'verified', 'rejected', 'archived'],
            },
            description: {
              type: 'string',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        InitUploadRequest: {
          type: 'object',
          required: ['originalFilename', 'fileSize', 'category'],
          properties: {
            originalFilename: {
              type: 'string',
              example: 'my_document.pdf',
            },
            fileSize: {
              type: 'integer',
              maximum: 10485760,
              description: 'File size in bytes (max 10MB)',
              example: 1048576,
            },
            category: {
              type: 'string',
              enum: ['certification', 'employee_verification', 'ownership', 'contract', 'compliance_report', 'miscellaneous'],
            },
            businessId: {
              type: 'string',
              format: 'uuid',
            },
            description: {
              type: 'string',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        InitUploadResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            data: {
              type: 'object',
              properties: {
                documentId: {
                  type: 'string',
                  format: 'uuid',
                },
                uploadUrl: {
                  type: 'string',
                  format: 'uri',
                  description: 'Pre-signed S3 URL for direct upload',
                },
                s3Key: {
                  type: 'string',
                },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                },
                maxFileSize: {
                  type: 'integer',
                },
              },
            },
          },
        },

        // ===== HUBZone Schemas =====
        HubzoneCheckResult: {
          type: 'object',
          properties: {
            isInHubzone: {
              type: 'boolean',
              example: true,
            },
            hubzones: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Hubzone',
              },
            },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 38.9072 },
                longitude: { type: 'number', example: -77.0369 },
              },
            },
          },
        },
        Hubzone: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            geoid: {
              type: 'string',
              pattern: '^[0-9]{11}$',
              example: '11001000100',
            },
            name: {
              type: 'string',
              example: 'Census Tract 1, Washington County, DC',
            },
            zoneType: {
              type: 'string',
              enum: ['qualified_census_tract', 'qualified_non_metro_county', 'indian_lands', 'base_closure_area', 'governor_designated', 'redesignated'],
            },
            status: {
              type: 'string',
              enum: ['active', 'expired', 'pending', 'redesignated'],
            },
            state: {
              type: 'string',
              example: 'DC',
            },
            county: {
              type: 'string',
              example: 'Washington',
            },
            designationDate: {
              type: 'string',
              format: 'date',
            },
            expirationDate: {
              type: 'string',
              format: 'date',
            },
          },
        },
        HubzoneStatistics: {
          type: 'object',
          properties: {
            totalTracts: {
              type: 'integer',
            },
            designatedTracts: {
              type: 'integer',
            },
            activeTracts: {
              type: 'integer',
            },
            byType: {
              type: 'object',
              properties: {
                qct: { type: 'integer' },
                qnmc: { type: 'integer' },
                indianLands: { type: 'integer' },
                baseClosure: { type: 'integer' },
                governorDesignated: { type: 'integer' },
                redesignated: { type: 'integer' },
              },
            },
            byStatus: {
              type: 'object',
              properties: {
                active: { type: 'integer' },
                expired: { type: 'integer' },
                pending: { type: 'integer' },
                redesignated: { type: 'integer' },
              },
            },
            lastUpdateDate: {
              type: 'string',
              format: 'date',
            },
          },
        },
        RadiusSearchRequest: {
          type: 'object',
          required: ['latitude', 'longitude'],
          properties: {
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              example: 38.9072,
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              example: -77.0369,
            },
            radius_miles: {
              type: 'number',
              minimum: 0.1,
              maximum: 100,
              default: 10,
              example: 10,
            },
          },
        },

        // ===== Agency Schemas =====
        ContractorVerification: {
          type: 'object',
          properties: {
            ueiNumber: {
              type: 'string',
            },
            businessName: {
              type: 'string',
            },
            verificationStatus: {
              type: 'string',
              enum: ['valid', 'expired', 'non_compliant', 'pending', 'not_found'],
            },
            isHubzoneCertified: {
              type: 'boolean',
            },
            certificationDate: {
              type: 'string',
              format: 'date',
            },
            expirationDate: {
              type: 'string',
              format: 'date',
            },
            riskLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            complianceScore: {
              type: 'integer',
            },
            verifiedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        BulkVerifyRequest: {
          type: 'object',
          required: ['ueiNumbers'],
          properties: {
            ueiNumbers: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 500,
              example: ['ABC123DEF456', 'XYZ789GHI012'],
            },
          },
        },

        // ===== OCR Schemas =====
        OcrResult: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'approved', 'rejected'],
            },
            extractedText: {
              type: 'string',
            },
            extractedData: {
              type: 'object',
              description: 'Structured data extracted from document',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              example: 0.95,
            },
            processedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        W9ExtractedData: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            businessName: {
              type: 'string',
            },
            taxClassification: {
              type: 'string',
            },
            address: {
              type: 'string',
            },
            city: {
              type: 'string',
            },
            state: {
              type: 'string',
            },
            zipCode: {
              type: 'string',
            },
            ein: {
              type: 'string',
            },
            ssn: {
              type: 'string',
              description: 'Masked SSN',
            },
          },
        },

        // ===== Health Schemas =====
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                },
              },
            },
          },
        },

        // ===== Admin Schemas =====
        ManualTriggerRequest: {
          type: 'object',
          properties: {
            dry_run: {
              type: 'boolean',
              default: false,
              description: 'Run without making database changes',
            },
            skip_notifications: {
              type: 'boolean',
              default: false,
              description: 'Skip sending notifications to businesses',
            },
            states: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 2,
                maxLength: 2,
              },
              description: 'Only process specific states (FIPS codes)',
              example: ['CA', 'TX', 'NY'],
            },
          },
        },
        JobStatus: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
            },
            jobName: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            enabled: {
              type: 'boolean',
            },
            cronExpression: {
              type: 'string',
            },
            cronDescription: {
              type: 'string',
            },
            lastExecution: {
              type: 'object',
              nullable: true,
            },
            nextScheduledRun: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            currentlyRunning: {
              type: 'boolean',
            },
          },
        },
        SystemHealth: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
            },
            components: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                  },
                },
                mapUpdateJob: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    currentlyRunning: { type: 'boolean' },
                    nextRun: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
            lastHubzoneImport: {
              type: 'object',
              nullable: true,
              properties: {
                importId: { type: 'string' },
                completedAt: { type: 'string', format: 'date-time' },
                ageHours: { type: 'integer' },
              },
            },
          },
        },

        // ===== Analytics Schemas =====
        AgencyMetrics: {
          type: 'object',
          properties: {
            totalVerifications: {
              type: 'integer',
            },
            validContractors: {
              type: 'integer',
            },
            invalidContractors: {
              type: 'integer',
            },
            averageResponseTime: {
              type: 'number',
            },
            hubzoneGoalProgress: {
              type: 'number',
            },
          },
        },
        ReportConfig: {
          type: 'object',
          required: ['reportType', 'agencyId'],
          properties: {
            reportType: {
              type: 'string',
              enum: ['hubzone_goal_achievement', 'contractor_directory', 'verification_history', 'contract_awards_summary', 'geographic_distribution'],
            },
            agencyId: {
              type: 'string',
            },
            startDate: {
              type: 'string',
              format: 'date',
            },
            endDate: {
              type: 'string',
              format: 'date',
            },
            format: {
              type: 'string',
              enum: ['pdf', 'excel', 'csv'],
              default: 'pdf',
            },
            includeCharts: {
              type: 'boolean',
              default: true,
            },
            includeSummary: {
              type: 'boolean',
              default: true,
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  message: 'No authentication token provided',
                  code: 'UNAUTHORIZED',
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission for this operation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  message: 'Access denied',
                  code: 'FORBIDDEN',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  message: 'Resource not found',
                  code: 'NOT_FOUND',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  message: 'Validation failed',
                  details: [
                    {
                      path: ['email'],
                      message: 'Invalid email format',
                    },
                  ],
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  message: 'Too many requests. Please try again later.',
                  code: 'RATE_LIMIT_EXCEEDED',
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  message: 'An unexpected error occurred',
                  code: 'INTERNAL_ERROR',
                },
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        BusinessIdParam: {
          name: 'businessId',
          in: 'path',
          required: true,
          description: 'Business UUID',
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        AgencyIdHeader: {
          name: 'X-Agency-Id',
          in: 'header',
          description: 'Agency identifier',
          schema: {
            type: 'string',
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * Export OpenAPI specification as JSON
 */
export function getOpenApiJson(): string {
  return JSON.stringify(swaggerSpec, null, 2);
}

export default swaggerSpec;

