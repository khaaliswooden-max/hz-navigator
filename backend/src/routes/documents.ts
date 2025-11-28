import { Router } from 'express';
import { documentService } from '../services/documentService.js';

import type { Request, Response } from 'express';
import type {
  DocumentFilters,
  UploadDocumentData,
  UpdateDocumentData,
  DocumentCategory,
  AllowedFileType,
} from '../types/document.js';

import {
  MAX_FILE_SIZE,
  MIME_TYPE_MAP,
  isAllowedFileType,
  getFileExtension,
  CATEGORY_LABELS,
} from '../types/document.js';

const router = Router();

/**
 * Initialize document upload
 * POST /api/documents/init-upload
 * 
 * Returns pre-signed URL for direct S3 upload
 */
router.post('/init-upload', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    const { originalFilename, fileSize, category, businessId, description, tags, metadata } = req.body;

    // Validate required fields
    if (!originalFilename || !fileSize || !category) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: originalFilename, fileSize, category' },
      });
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: { message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      });
    }

    // Validate file type
    const extension = getFileExtension(originalFilename);
    if (!isAllowedFileType(extension)) {
      return res.status(400).json({
        success: false,
        error: { 
          message: `File type '${extension}' is not allowed. Accepted types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG` 
        },
      });
    }

    const fileType = extension as AllowedFileType;
    const mimeType = MIME_TYPE_MAP[fileType];

    const data: UploadDocumentData = {
      category,
      originalFilename,
      fileSize,
      fileType,
      mimeType,
      businessId,
      description,
      tags,
      metadata,
    };

    const result = await documentService.initializeUpload(userId, data);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error initializing upload:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to initialize upload' },
    });
  }
});

/**
 * Confirm upload completion
 * POST /api/documents/:id/confirm
 */
router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { s3VersionId } = req.body;
    const document = await documentService.confirmUpload(req.params.id, s3VersionId);

    return res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to confirm upload' },
    });
  }
});

/**
 * Get documents with filters
 * GET /api/documents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.query.userId as string;

    const filters: DocumentFilters = {
      userId,
      businessId: req.query.businessId as string | undefined,
      category: req.query.category as DocumentCategory | undefined,
      status: req.query.status as DocumentFilters['status'],
      fileType: req.query.fileType as AllowedFileType | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      uploadedAfter: req.query.uploadedAfter ? new Date(req.query.uploadedAfter as string) : undefined,
      uploadedBefore: req.query.uploadedBefore ? new Date(req.query.uploadedBefore as string) : undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sortBy: req.query.sortBy as DocumentFilters['sortBy'],
      sortOrder: req.query.sortOrder as DocumentFilters['sortOrder'],
    };

    const { documents, total } = await documentService.getUserDocuments(filters);

    return res.json({
      success: true,
      data: documents,
      pagination: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (filters.limit ?? 20)),
      },
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get documents' },
    });
  }
});

/**
 * Get single document
 * GET /api/documents/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocument(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
    }

    return res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error getting document:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get document' },
    });
  }
});

/**
 * Get signed download URL
 * GET /api/documents/:id/download
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const result = await documentService.generateSignedUrl(req.params.id, userId, 'download');

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to generate download URL' },
    });
  }
});

/**
 * Get document versions
 * GET /api/documents/:id/versions
 */
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await documentService.getDocumentVersions(req.params.id);

    return res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error('Error getting document versions:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get document versions' },
    });
  }
});

/**
 * Get document access log
 * GET /api/documents/:id/access-log
 */
router.get('/:id/access-log', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const accessLog = await documentService.getAccessLog(req.params.id, limit);

    return res.json({
      success: true,
      data: accessLog,
    });
  } catch (error) {
    console.error('Error getting access log:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get access log' },
    });
  }
});

/**
 * Update document metadata
 * PUT /api/documents/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updates: UpdateDocumentData = {};

    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.tags !== undefined) updates.tags = req.body.tags;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.metadata !== undefined) updates.metadata = req.body.metadata;

    const document = await documentService.updateDocument(req.params.id, updates);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
    }

    return res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update document' },
    });
  }
});

/**
 * Delete document (soft delete)
 * DELETE /api/documents/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await documentService.deleteDocument(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
    }

    return res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete document' },
    });
  }
});

/**
 * Get documents by category
 * GET /api/documents/category/:category
 */
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.query.userId as string;
    const category = req.params.category as DocumentCategory;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    const documents = await documentService.getDocumentsByCategory(userId, category);

    return res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error getting documents by category:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get documents' },
    });
  }
});

/**
 * Get document statistics
 * GET /api/documents/stats
 */
router.get('/user/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.query.userId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    const stats = await documentService.getDocumentStats(userId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting document stats:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get document statistics' },
    });
  }
});

/**
 * Get document categories metadata
 * GET /api/documents/categories
 */
router.get('/meta/categories', async (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: {
        categories: CATEGORY_LABELS,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
        maxFileSize: MAX_FILE_SIZE,
        maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
      },
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get categories' },
    });
  }
});

/**
 * Search documents by filename and OCR content
 * GET /api/documents/search
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.query.userId as string;
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query is required' },
      });
    }

    const filters: DocumentFilters = {
      userId,
      search: query,
      category: req.query.category as DocumentCategory | undefined,
      fileType: req.query.fileType as AllowedFileType | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const { documents, total } = await documentService.searchDocuments(query, filters);

    return res.json({
      success: true,
      data: documents,
      pagination: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (filters.limit ?? 20)),
      },
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to search documents' },
    });
  }
});

/**
 * Generate shareable link for document
 * POST /api/documents/:id/share
 */
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { expiryMinutes = 60 } = req.body;
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    const result = await documentService.generateShareLink(
      req.params.id,
      expiryMinutes,
      userId
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to generate share link' },
    });
  }
});

/**
 * Bulk download documents as ZIP
 * POST /api/documents/bulk/download
 */
router.post('/bulk/download', async (req: Request, res: Response) => {
  try {
    const { documentIds } = req.body;
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'documentIds array is required' },
      });
    }

    if (documentIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: { message: 'Maximum 50 documents can be downloaded at once' },
      });
    }

    const result = await documentService.bulkDownload(documentIds, userId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error bulk downloading:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to create download' },
    });
  }
});

/**
 * Bulk delete documents
 * POST /api/documents/bulk/delete
 */
router.post('/bulk/delete', async (req: Request, res: Response) => {
  try {
    const { documentIds } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'documentIds array is required' },
      });
    }

    const result = await documentService.bulkDelete(documentIds);

    return res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk deleting:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete documents' },
    });
  }
});

/**
 * Bulk update category
 * POST /api/documents/bulk/category
 */
router.post('/bulk/category', async (req: Request, res: Response) => {
  try {
    const { documentIds, category } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'documentIds array is required' },
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        error: { message: 'category is required' },
      });
    }

    const result = await documentService.bulkUpdateCategory(documentIds, category);

    return res.json({
      success: true,
      data: {
        updatedCount: result.updatedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk updating category:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update category' },
    });
  }
});

/**
 * Get expiring documents
 * GET /api/documents/expiring
 */
router.get('/expiring', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.query.userId as string;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    const documents = await documentService.getExpiringDocuments(userId, days);

    return res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error getting expiring documents:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get expiring documents' },
    });
  }
});

/**
 * Archive document
 * POST /api/documents/:id/archive
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const document = await documentService.archiveDocument(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
    }

    return res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error archiving document:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to archive document' },
    });
  }
});

export default router;

