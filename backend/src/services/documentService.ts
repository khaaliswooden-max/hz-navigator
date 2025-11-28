import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import type {
  Document,
  DocumentCategory,
  DocumentStatus,
  DocumentVersion,
  DocumentAccessLog,
  UploadDocumentData,
  UpdateDocumentData,
  DocumentFilters,
  SignedUrlResponse,
  UploadInitResponse,
  DocumentMetadata,
  AllowedFileType,
} from '../types/document.js';

import {
  MAX_FILE_SIZE,
  MIME_TYPE_MAP,
  isAllowedFileType,
  getFileExtension,
} from '../types/document.js';

/**
 * S3 Configuration
 * In production, these would come from AWS SDK configuration
 */
const S3_CONFIG = {
  bucket: process.env['S3_BUCKET'] ?? 'hz-navigator-documents',
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  signedUrlExpiry: 3600, // 1 hour
  endpoint: process.env['S3_ENDPOINT'], // For local development with MinIO
};

/**
 * Document Service
 * 
 * Handles document upload, storage, and management with S3 integration
 */
export class DocumentService {
  /**
   * Initialize upload and get pre-signed URL
   * Returns document ID and S3 upload URL
   */
  async initializeUpload(
    userId: string,
    data: UploadDocumentData
  ): Promise<UploadInitResponse> {
    // Validate file size
    if (data.fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    // Validate file type
    const extension = getFileExtension(data.originalFilename);
    if (!isAllowedFileType(extension)) {
      throw new Error(`File type '${extension}' is not allowed`);
    }

    // Generate unique filename and S3 key
    const documentId = uuidv4();
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(data.originalFilename);
    const uniqueFilename = `${timestamp}-${documentId.slice(0, 8)}-${sanitizedFilename}`;
    const s3Key = this.generateS3Key(userId, data.category, uniqueFilename);

    // Create document record in pending status
    const query = `
      INSERT INTO documents (
        id, user_id, business_id, category, filename, original_filename,
        file_size, file_type, mime_type, s3_bucket, s3_key, status,
        metadata, description, tags, uploaded_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `;

    await db.query(query, [
      documentId,
      userId,
      data.businessId ?? null,
      data.category,
      uniqueFilename,
      data.originalFilename,
      data.fileSize,
      data.fileType,
      data.mimeType,
      S3_CONFIG.bucket,
      s3Key,
      'pending',
      JSON.stringify(data.metadata ?? {}),
      data.description ?? null,
      data.tags ?? [],
      userId,
    ]);

    // Generate pre-signed upload URL
    const uploadUrl = await this.generateSignedUploadUrl(s3Key, data.mimeType);
    const expiresAt = new Date(Date.now() + S3_CONFIG.signedUrlExpiry * 1000);

    return {
      documentId,
      uploadUrl,
      s3Key,
      expiresAt,
      maxFileSize: MAX_FILE_SIZE,
    };
  }

  /**
   * Confirm upload completion and update document status
   */
  async confirmUpload(
    documentId: string,
    s3VersionId?: string
  ): Promise<Document> {
    const query = `
      UPDATE documents
      SET status = 'uploaded', s3_version_id = $2, updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `;

    const result = await db.query(query, [documentId, s3VersionId ?? null]);

    if (result.rows.length === 0) {
      throw new Error('Document not found or already confirmed');
    }

    // Create initial version record
    await this.createVersionRecord(documentId, result.rows[0]);

    return this.mapDocumentRow(result.rows[0]);
  }

  /**
   * Upload document with metadata (direct upload - for smaller files)
   */
  async uploadDocument(
    userId: string,
    fileBuffer: Buffer,
    data: UploadDocumentData
  ): Promise<Document> {
    // Validate file size
    if (data.fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    // Validate file type
    const extension = getFileExtension(data.originalFilename);
    if (!isAllowedFileType(extension)) {
      throw new Error(`File type '${extension}' is not allowed`);
    }

    // Generate checksum
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Generate unique filename and S3 key
    const documentId = uuidv4();
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(data.originalFilename);
    const uniqueFilename = `${timestamp}-${documentId.slice(0, 8)}-${sanitizedFilename}`;
    const s3Key = this.generateS3Key(userId, data.category, uniqueFilename);

    // Upload to S3 (simulated in development)
    const s3VersionId = await this.uploadToS3(s3Key, fileBuffer, data.mimeType);

    // Store metadata in database
    const metadata: DocumentMetadata = {
      ...data.metadata,
      checksum,
      source: 'web',
    };

    const query = `
      INSERT INTO documents (
        id, user_id, business_id, category, filename, original_filename,
        file_size, file_type, mime_type, s3_bucket, s3_key, s3_version_id,
        status, metadata, description, tags, uploaded_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      documentId,
      userId,
      data.businessId ?? null,
      data.category,
      uniqueFilename,
      data.originalFilename,
      data.fileSize,
      data.fileType,
      data.mimeType,
      S3_CONFIG.bucket,
      s3Key,
      s3VersionId,
      'uploaded',
      JSON.stringify(metadata),
      data.description ?? null,
      data.tags ?? [],
      userId,
    ]);

    // Create initial version record
    await this.createVersionRecord(documentId, result.rows[0]);

    return this.mapDocumentRow(result.rows[0]);
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    const query = `
      SELECT * FROM documents
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await db.query(query, [documentId]);

    if (result.rows.length === 0) return null;
    return this.mapDocumentRow(result.rows[0]);
  }

  /**
   * Get documents for a user with filters
   */
  async getUserDocuments(
    filters: DocumentFilters
  ): Promise<{ documents: Document[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Soft delete filter
    if (!filters.includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.userId);
    }

    if (filters.businessId) {
      conditions.push(`business_id = $${paramIndex++}`);
      values.push(filters.businessId);
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filters.category);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.fileType) {
      conditions.push(`file_type = $${paramIndex++}`);
      values.push(filters.fileType);
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      values.push(filters.tags);
    }

    if (filters.uploadedAfter) {
      conditions.push(`uploaded_at >= $${paramIndex++}`);
      values.push(filters.uploadedAfter);
    }

    if (filters.uploadedBefore) {
      conditions.push(`uploaded_at <= $${paramIndex++}`);
      values.push(filters.uploadedBefore);
    }

    if (filters.search) {
      conditions.push(`(
        LOWER(original_filename) LIKE LOWER($${paramIndex}) OR
        LOWER(description) LIKE LOWER($${paramIndex})
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    // Sort
    const sortColumn = {
      uploadedAt: 'uploaded_at',
      filename: 'original_filename',
      fileSize: 'file_size',
      category: 'category',
    }[filters.sortBy ?? 'uploadedAt'] ?? 'uploaded_at';

    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Pagination
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM documents
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query, [...values, limit, offset]);

    return {
      documents: result.rows.map(row => this.mapDocumentRow(row)),
      total,
    };
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    documentId: string,
    updates: UpdateDocumentData
  ): Promise<Document | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.tags !== undefined) {
      setClauses.push(`tags = $${paramIndex++}`);
      values.push(updates.tags);
    }

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = metadata || $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    values.push(documentId);

    const query = `
      UPDATE documents
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) return null;
    return this.mapDocumentRow(result.rows[0]);
  }

  /**
   * Soft delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const query = `
      UPDATE documents
      SET deleted_at = NOW(), status = 'archived'
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await db.query(query, [documentId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Permanently delete document (admin only)
   */
  async permanentlyDeleteDocument(documentId: string): Promise<boolean> {
    // Get document to delete from S3
    const doc = await this.getDocument(documentId);
    if (!doc) return false;

    // Delete from S3
    await this.deleteFromS3(doc.s3Key);

    // Delete from database
    const query = `DELETE FROM documents WHERE id = $1`;
    const result = await db.query(query, [documentId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Generate signed download URL
   */
  async generateSignedUrl(
    documentId: string,
    userId?: string,
    action: 'download' | 'view' = 'download'
  ): Promise<SignedUrlResponse> {
    const doc = await this.getDocument(documentId);

    if (!doc) {
      throw new Error('Document not found');
    }

    // Log access
    if (userId) {
      await this.logAccess(documentId, userId, action === 'download' ? 'download' : 'view');
    }

    const downloadUrl = await this.generateSignedDownloadUrl(doc.s3Key);
    const expiresAt = new Date(Date.now() + S3_CONFIG.signedUrlExpiry * 1000);

    return {
      downloadUrl,
      expiresAt,
      s3Key: doc.s3Key,
    };
  }

  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const query = `
      SELECT * FROM document_versions
      WHERE document_id = $1
      ORDER BY version_number DESC
    `;

    const result = await db.query(query, [documentId]);
    return result.rows.map(row => this.mapVersionRow(row));
  }

  /**
   * Get document access log
   */
  async getAccessLog(
    documentId: string,
    limit: number = 50
  ): Promise<DocumentAccessLog[]> {
    const query = `
      SELECT * FROM document_access_log
      WHERE document_id = $1
      ORDER BY accessed_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [documentId, limit]);
    return result.rows.map(row => ({
      id: row['id'] as string,
      documentId: row['document_id'] as string,
      userId: row['user_id'] as string,
      action: row['action'] as DocumentAccessLog['action'],
      ipAddress: row['ip_address'] as string | undefined,
      userAgent: row['user_agent'] as string | undefined,
      accessedAt: new Date(row['accessed_at'] as string),
    }));
  }

  /**
   * Get documents by category for a user
   */
  async getDocumentsByCategory(
    userId: string,
    category: DocumentCategory
  ): Promise<Document[]> {
    const query = `
      SELECT * FROM documents
      WHERE user_id = $1 AND category = $2 AND deleted_at IS NULL
      ORDER BY uploaded_at DESC
    `;

    const result = await db.query(query, [userId, category]);
    return result.rows.map(row => this.mapDocumentRow(row));
  }

  /**
   * Get document statistics for a user
   */
  async getDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    byCategory: Record<DocumentCategory, number>;
    byStatus: Record<DocumentStatus, number>;
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(file_size), 0) as total_size,
        category,
        status
      FROM documents
      WHERE user_id = $1 AND deleted_at IS NULL
      GROUP BY category, status
    `;

    const result = await db.query<{
      total: string;
      total_size: string;
      category: DocumentCategory;
      status: DocumentStatus;
    }>(query, [userId]);

    const byCategory: Record<DocumentCategory, number> = {
      certification: 0,
      employee_verification: 0,
      ownership: 0,
      contract: 0,
      compliance_report: 0,
      miscellaneous: 0,
    };

    const byStatus: Record<DocumentStatus, number> = {
      pending: 0,
      uploaded: 0,
      processing: 0,
      verified: 0,
      rejected: 0,
      archived: 0,
    };

    let totalDocuments = 0;
    let totalSize = 0;

    for (const row of result.rows) {
      const count = parseInt(row.total, 10);
      totalDocuments += count;
      totalSize += parseInt(row.total_size, 10);
      byCategory[row.category] = (byCategory[row.category] ?? 0) + count;
      byStatus[row.status] = (byStatus[row.status] ?? 0) + count;
    }

    return { totalDocuments, totalSize, byCategory, byStatus };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Generate S3 key with folder structure
   */
  private generateS3Key(
    userId: string,
    category: DocumentCategory,
    filename: string
  ): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `documents/${year}/${month}/${category}/${userId}/${filename}`;
  }

  /**
   * Sanitize filename for S3
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 200);
  }

  /**
   * Create version record
   */
  private async createVersionRecord(
    documentId: string,
    docRow: Record<string, unknown>
  ): Promise<void> {
    const query = `
      INSERT INTO document_versions (
        id, document_id, version_number, s3_key, s3_version_id, file_size, uploaded_by
      )
      SELECT
        gen_random_uuid(),
        $1,
        COALESCE((SELECT MAX(version_number) FROM document_versions WHERE document_id = $1), 0) + 1,
        $2,
        $3,
        $4,
        $5
    `;

    await db.query(query, [
      documentId,
      docRow['s3_key'],
      docRow['s3_version_id'],
      docRow['file_size'],
      docRow['uploaded_by'],
    ]);
  }

  /**
   * Log document access
   */
  private async logAccess(
    documentId: string,
    userId: string,
    action: 'view' | 'download' | 'update' | 'delete',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const query = `
      INSERT INTO document_access_log (
        id, document_id, user_id, action, ip_address, user_agent
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5
      )
    `;

    await db.query(query, [documentId, userId, action, ipAddress ?? null, userAgent ?? null]);
  }

  // ============================================
  // S3 Integration Methods (Simulated for development)
  // ============================================

  /**
   * Generate pre-signed upload URL
   * In production, use AWS SDK: s3.getSignedUrl('putObject', params)
   */
  private async generateSignedUploadUrl(
    s3Key: string,
    contentType: string
  ): Promise<string> {
    // In production, this would use AWS SDK
    // const params = {
    //   Bucket: S3_CONFIG.bucket,
    //   Key: s3Key,
    //   ContentType: contentType,
    //   Expires: S3_CONFIG.signedUrlExpiry,
    // };
    // return s3.getSignedUrlPromise('putObject', params);

    // Simulated URL for development
    const timestamp = Date.now();
    const signature = crypto
      .createHmac('sha256', 'dev-secret')
      .update(`${s3Key}:${timestamp}:upload`)
      .digest('hex');

    return `${S3_CONFIG.endpoint ?? 'https://s3.amazonaws.com'}/${S3_CONFIG.bucket}/${s3Key}?X-Amz-Signature=${signature}&X-Amz-Expires=${S3_CONFIG.signedUrlExpiry}&X-Amz-Content-Type=${encodeURIComponent(contentType)}`;
  }

  /**
   * Generate pre-signed download URL
   */
  private async generateSignedDownloadUrl(s3Key: string): Promise<string> {
    // In production, use AWS SDK
    // const params = {
    //   Bucket: S3_CONFIG.bucket,
    //   Key: s3Key,
    //   Expires: S3_CONFIG.signedUrlExpiry,
    // };
    // return s3.getSignedUrlPromise('getObject', params);

    const timestamp = Date.now();
    const signature = crypto
      .createHmac('sha256', 'dev-secret')
      .update(`${s3Key}:${timestamp}:download`)
      .digest('hex');

    return `${S3_CONFIG.endpoint ?? 'https://s3.amazonaws.com'}/${S3_CONFIG.bucket}/${s3Key}?X-Amz-Signature=${signature}&X-Amz-Expires=${S3_CONFIG.signedUrlExpiry}`;
  }

  /**
   * Upload buffer to S3
   */
  private async uploadToS3(
    s3Key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string | undefined> {
    // In production, use AWS SDK
    // const params = {
    //   Bucket: S3_CONFIG.bucket,
    //   Key: s3Key,
    //   Body: buffer,
    //   ContentType: contentType,
    //   ServerSideEncryption: 'AES256',
    // };
    // const result = await s3.upload(params).promise();
    // return result.VersionId;

    // Simulated for development - return fake version ID
    console.info(`[S3 Simulated] Uploading ${s3Key} (${buffer.length} bytes, ${contentType})`);
    return `v-${Date.now()}`;
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(s3Key: string): Promise<void> {
    // In production, use AWS SDK
    // const params = {
    //   Bucket: S3_CONFIG.bucket,
    //   Key: s3Key,
    // };
    // await s3.deleteObject(params).promise();

    console.info(`[S3 Simulated] Deleting ${s3Key}`);
  }

  // ============================================
  // Row Mappers
  // ============================================

  private mapDocumentRow(row: Record<string, unknown>): Document {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      businessId: row['business_id'] as string | undefined,
      category: row['category'] as DocumentCategory,
      filename: row['filename'] as string,
      originalFilename: row['original_filename'] as string,
      fileSize: parseInt(row['file_size'] as string, 10),
      fileType: row['file_type'] as AllowedFileType,
      mimeType: row['mime_type'] as string,
      s3Bucket: row['s3_bucket'] as string,
      s3Key: row['s3_key'] as string,
      s3VersionId: row['s3_version_id'] as string | undefined,
      status: row['status'] as DocumentStatus,
      metadata: typeof row['metadata'] === 'string'
        ? JSON.parse(row['metadata'])
        : (row['metadata'] as DocumentMetadata ?? {}),
      description: row['description'] as string | undefined,
      tags: row['tags'] as string[] ?? [],
      uploadedAt: new Date(row['uploaded_at'] as string),
      uploadedBy: row['uploaded_by'] as string,
      updatedAt: new Date(row['updated_at'] as string),
      deletedAt: row['deleted_at'] ? new Date(row['deleted_at'] as string) : undefined,
    };
  }

  private mapVersionRow(row: Record<string, unknown>): DocumentVersion {
    return {
      id: row['id'] as string,
      documentId: row['document_id'] as string,
      versionNumber: row['version_number'] as number,
      s3Key: row['s3_key'] as string,
      s3VersionId: row['s3_version_id'] as string | undefined,
      fileSize: parseInt(row['file_size'] as string, 10),
      uploadedAt: new Date(row['uploaded_at'] as string),
      uploadedBy: row['uploaded_by'] as string,
      changeNotes: row['change_notes'] as string | undefined,
    };
  }

  // ============================================
  // Search and Bulk Operations
  // ============================================

  /**
   * Search documents by filename and OCR content
   */
  async searchDocuments(
    query: string,
    filters: DocumentFilters
  ): Promise<{ documents: Document[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Search in filename, description, and OCR content
    conditions.push(`(
      LOWER(original_filename) LIKE LOWER($${paramIndex}) OR
      LOWER(description) LIKE LOWER($${paramIndex}) OR
      LOWER(metadata->>'rawText') LIKE LOWER($${paramIndex}) OR
      LOWER(metadata->'ocrResult'->>'rawText') LIKE LOWER($${paramIndex})
    )`);
    values.push(`%${query}%`);
    paramIndex++;

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.userId);
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filters.category);
    }

    if (filters.fileType) {
      conditions.push(`file_type = $${paramIndex++}`);
      values.push(filters.fileType);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count
    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    // Pagination
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const query_ = `
      SELECT * FROM documents
      ${whereClause}
      ORDER BY uploaded_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query_, [...values, limit, offset]);

    return {
      documents: result.rows.map(row => this.mapDocumentRow(row)),
      total,
    };
  }

  /**
   * Generate shareable link for document
   */
  async generateShareLink(
    documentId: string,
    expiryMinutes: number = 60,
    userId?: string
  ): Promise<{ shareUrl: string; expiresAt: Date }> {
    const doc = await this.getDocument(documentId);

    if (!doc) {
      throw new Error('Document not found');
    }

    // Log access
    if (userId) {
      await this.logAccess(documentId, userId, 'download');
    }

    // Generate signed URL with custom expiry
    const expirySeconds = expiryMinutes * 60;
    const downloadUrl = await this.generateSignedDownloadUrlWithExpiry(doc.s3Key, expirySeconds);
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    return {
      shareUrl: downloadUrl,
      expiresAt,
    };
  }

  /**
   * Generate signed URL with custom expiry
   */
  private async generateSignedDownloadUrlWithExpiry(
    s3Key: string,
    expirySeconds: number
  ): Promise<string> {
    const timestamp = Date.now();
    const signature = crypto
      .createHmac('sha256', 'dev-secret')
      .update(`${s3Key}:${timestamp}:download`)
      .digest('hex');

    return `${S3_CONFIG.endpoint ?? 'https://s3.amazonaws.com'}/${S3_CONFIG.bucket}/${s3Key}?X-Amz-Signature=${signature}&X-Amz-Expires=${expirySeconds}`;
  }

  /**
   * Bulk download documents (generate ZIP download URL)
   */
  async bulkDownload(
    documentIds: string[],
    userId?: string
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    // Get all documents
    const documents: Document[] = [];
    for (const id of documentIds) {
      const doc = await this.getDocument(id);
      if (doc) {
        documents.push(doc);
        if (userId) {
          await this.logAccess(id, userId, 'download');
        }
      }
    }

    if (documents.length === 0) {
      throw new Error('No valid documents found');
    }

    // In production, this would create a ZIP file in S3 and return a signed URL
    // For development, we simulate the response
    console.info(`[S3 Simulated] Creating ZIP of ${documents.length} documents`);

    const timestamp = Date.now();
    const signature = crypto
      .createHmac('sha256', 'dev-secret')
      .update(`bulk:${timestamp}`)
      .digest('hex');

    return {
      downloadUrl: `${S3_CONFIG.endpoint ?? 'https://s3.amazonaws.com'}/${S3_CONFIG.bucket}/bulk-downloads/${timestamp}.zip?X-Amz-Signature=${signature}`,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    };
  }

  /**
   * Bulk delete documents
   */
  async bulkDelete(
    documentIds: string[]
  ): Promise<{ deletedCount: number; failedCount: number }> {
    let deletedCount = 0;
    let failedCount = 0;

    for (const id of documentIds) {
      try {
        const deleted = await this.deleteDocument(id);
        if (deleted) {
          deletedCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    return { deletedCount, failedCount };
  }

  /**
   * Bulk update category
   */
  async bulkUpdateCategory(
    documentIds: string[],
    category: DocumentCategory
  ): Promise<{ updatedCount: number }> {
    const query = `
      UPDATE documents
      SET category = $1, updated_at = NOW()
      WHERE id = ANY($2::uuid[]) AND deleted_at IS NULL
    `;

    const result = await db.query(query, [category, documentIds]);

    return { updatedCount: result.rowCount ?? 0 };
  }

  /**
   * Get documents expiring within specified days
   */
  async getExpiringDocuments(
    userId: string,
    days: number = 30
  ): Promise<Document[]> {
    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const query = `
      SELECT * FROM documents
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND metadata->>'expiresAt' IS NOT NULL
        AND (metadata->>'expiresAt')::timestamp <= $2
        AND (metadata->>'expiresAt')::timestamp > NOW()
      ORDER BY (metadata->>'expiresAt')::timestamp ASC
    `;

    const result = await db.query(query, [userId, expiryDate.toISOString()]);
    return result.rows.map(row => this.mapDocumentRow(row));
  }

  /**
   * Archive document
   */
  async archiveDocument(documentId: string): Promise<Document | null> {
    const query = `
      UPDATE documents
      SET status = 'archived', updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, [documentId]);

    if (result.rows.length === 0) return null;
    return this.mapDocumentRow(result.rows[0]);
  }
}

// Export singleton instance
export const documentService = new DocumentService();

