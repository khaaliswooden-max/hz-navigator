# S3 Configuration for Document Storage

## Bucket Setup

Create an S3 bucket for document storage with the following configuration:

### Bucket Name
```
hz-navigator-documents
```

### Region
```
us-east-1 (or your preferred region)
```

## CORS Configuration

Add this CORS configuration to allow browser uploads:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

## Lifecycle Rules

Configure lifecycle rules for data retention compliance:

```json
{
  "Rules": [
    {
      "ID": "DeleteAfter7Years",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "documents/"
      },
      "Expiration": {
        "Days": 2555
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

## Versioning

Enable versioning for document history and recovery:

```bash
aws s3api put-bucket-versioning \
  --bucket hz-navigator-documents \
  --versioning-configuration Status=Enabled
```

## Server-Side Encryption

Enable default encryption (AES-256):

```json
{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }
  ]
}
```

AWS CLI command:
```bash
aws s3api put-bucket-encryption \
  --bucket hz-navigator-documents \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

## IAM Policy

Create an IAM policy for the application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DocumentBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::hz-navigator-documents",
        "arn:aws:s3:::hz-navigator-documents/*"
      ]
    },
    {
      "Sid": "GeneratePresignedUrls",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::hz-navigator-documents/*"
    }
  ]
}
```

## Environment Variables

Add these environment variables to your backend configuration:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# S3 Configuration
S3_BUCKET=hz-navigator-documents
S3_ENDPOINT=  # Leave empty for AWS, set for MinIO/LocalStack

# Optional: Use IAM roles instead of access keys in production
# AWS_USE_IAM_ROLE=true
```

## Local Development with MinIO

For local development, use MinIO as an S3-compatible storage:

```yaml
# docker-compose.yml addition
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

volumes:
  minio-data:
```

Configure the backend to use MinIO:
```env
S3_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
```

## Document Categories

The following document categories are supported:

| Category | Description |
|----------|-------------|
| `certification` | HUBZone certification applications and supporting documents |
| `employee_verification` | Employee residency and employment verification documents |
| `ownership` | Business ownership and structure documentation |
| `contract` | Government contracts and related documents |
| `compliance_report` | Annual compliance reports and recertification documents |
| `miscellaneous` | Other supporting documents |

## Accepted File Types

| Extension | MIME Type | Max Size |
|-----------|-----------|----------|
| PDF | application/pdf | 10MB |
| DOC | application/msword | 10MB |
| DOCX | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 10MB |
| XLS | application/vnd.ms-excel | 10MB |
| XLSX | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 10MB |
| JPG/JPEG | image/jpeg | 10MB |
| PNG | image/png | 10MB |

## S3 Key Structure

Documents are organized with the following path structure:
```
documents/{year}/{month}/{category}/{userId}/{timestamp}-{uuid}-{sanitized-filename}
```

Example:
```
documents/2025/11/certification/a1b2c3d4/1732838400000-e5f6g7h8-certification-application.pdf
```

