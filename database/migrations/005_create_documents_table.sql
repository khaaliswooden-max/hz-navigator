-- Migration: Create documents table
-- Description: Tables for document upload and management with S3 integration

-- Create enum for document categories
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'certification',
        'employee_verification',
        'ownership',
        'contract',
        'compliance_report',
        'miscellaneous'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for document status
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM (
        'pending',
        'uploaded',
        'processing',
        'verified',
        'rejected',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    user_id UUID NOT NULL,
    business_id UUID,
    
    -- Document info
    category document_category NOT NULL DEFAULT 'miscellaneous',
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- S3 storage
    s3_bucket VARCHAR(100) NOT NULL DEFAULT 'hz-navigator-documents',
    s3_key VARCHAR(500) NOT NULL UNIQUE,
    s3_version_id VARCHAR(100),
    
    -- Status tracking
    status document_status NOT NULL DEFAULT 'uploaded',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    description TEXT,
    tags VARCHAR(50)[] DEFAULT '{}',
    
    -- Audit fields
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
    CONSTRAINT valid_file_type CHECK (
        file_type IN ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png')
    )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_business_id ON documents(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_s3_key ON documents(s3_key);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN(metadata);

-- Create document versions table for tracking changes
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    s3_key VARCHAR(500) NOT NULL,
    s3_version_id VARCHAR(100),
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID NOT NULL,
    change_notes TEXT,
    
    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);

-- Create document access log for audit trail
CREATE TABLE IF NOT EXISTS document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'view', 'download', 'update', 'delete'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_user_id ON document_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_accessed_at ON document_access_log(accessed_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_documents_updated_at ON documents;
CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Stores document metadata for uploaded files stored in S3';
COMMENT ON TABLE document_versions IS 'Tracks version history of documents';
COMMENT ON TABLE document_access_log IS 'Audit log for document access and modifications';

COMMENT ON COLUMN documents.category IS 'Document category: certification, employee_verification, ownership, contract, compliance_report, miscellaneous';
COMMENT ON COLUMN documents.s3_key IS 'Full S3 object key including path';
COMMENT ON COLUMN documents.metadata IS 'JSON metadata including custom attributes like expiry date, related entity IDs';
COMMENT ON COLUMN documents.deleted_at IS 'Soft delete timestamp - documents are never hard deleted for compliance';

