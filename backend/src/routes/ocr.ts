import { Router } from 'express';
import { ocrService } from '../services/ocrService.js';
import { documentService } from '../services/documentService.js';
import { documentProcessingJobManager, autoPopulateService } from '../jobs/documentProcessingJob.js';

import type { Request, Response } from 'express';

const router = Router();

/**
 * Process document with OCR
 * POST /api/ocr/process/:documentId
 */
router.post('/process/:documentId', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { async: processAsync } = req.body;

    // Verify document exists
    const document = await documentService.getDocument(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
    }

    // Check if document type supports OCR
    const supportedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!supportedTypes.includes(document.fileType)) {
      return res.status(400).json({
        success: false,
        error: { message: `OCR not supported for ${document.fileType} files` },
      });
    }

    if (processAsync) {
      // Queue for background processing
      documentProcessingJobManager.queueDocument(documentId, document.userId);

      return res.json({
        success: true,
        data: {
          status: 'queued',
          message: 'Document queued for OCR processing',
          documentId,
        },
      });
    }

    // Process synchronously
    const result = await ocrService.processDocument(documentId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to process document' },
    });
  }
});

/**
 * Get OCR result for a document
 * GET /api/ocr/result/:documentId
 */
router.get('/result/:documentId', async (req: Request, res: Response) => {
  try {
    const result = await ocrService.getOCRResult(req.params.documentId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: { message: 'OCR result not found. Document may not have been processed yet.' },
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting OCR result:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get OCR result' },
    });
  }
});

/**
 * Update extracted data after review
 * PUT /api/ocr/result/:documentId
 */
router.put('/result/:documentId', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.body.userId;
    const { updates } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: { message: 'Updates object is required' },
      });
    }

    const result = await ocrService.updateExtractedData(
      req.params.documentId,
      updates,
      userId
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error updating OCR result:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to update OCR result' },
    });
  }
});

/**
 * Approve extracted data
 * POST /api/ocr/approve/:documentId
 */
router.post('/approve/:documentId', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    await ocrService.approveExtraction(req.params.documentId, userId);

    return res.json({
      success: true,
      message: 'Extraction approved successfully',
    });
  } catch (error) {
    console.error('Error approving extraction:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to approve extraction' },
    });
  }
});

/**
 * Reject extracted data
 * POST /api/ocr/reject/:documentId
 */
router.post('/reject/:documentId', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? req.body.userId;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rejection reason is required' },
      });
    }

    await ocrService.rejectExtraction(req.params.documentId, userId, reason);

    return res.json({
      success: true,
      message: 'Extraction rejected',
    });
  } catch (error) {
    console.error('Error rejecting extraction:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to reject extraction' },
    });
  }
});

/**
 * Extract W-9 data
 * GET /api/ocr/w9/:documentId
 */
router.get('/w9/:documentId', async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocument(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
    }

    const w9Data = await ocrService.extractW9Data(document);

    return res.json({
      success: true,
      data: w9Data,
    });
  } catch (error) {
    console.error('Error extracting W-9 data:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to extract W-9 data' },
    });
  }
});

/**
 * Extract license data
 * GET /api/ocr/license/:documentId
 */
router.get('/license/:documentId', async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocument(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
    }

    const licenseData = await ocrService.extractLicenseData(document);

    return res.json({
      success: true,
      data: licenseData,
    });
  } catch (error) {
    console.error('Error extracting license data:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to extract license data' },
    });
  }
});

/**
 * Get auto-populate suggestions
 * GET /api/ocr/auto-populate/:documentId
 */
router.get('/auto-populate/:documentId', async (req: Request, res: Response) => {
  try {
    const suggestion = await autoPopulateService.getSuggestedPopulation(req.params.documentId);

    return res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    console.error('Error getting auto-populate suggestion:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to get suggestions' },
    });
  }
});

/**
 * Apply auto-populate to business
 * POST /api/ocr/auto-populate/business
 */
router.post('/auto-populate/business', async (req: Request, res: Response) => {
  try {
    const { documentId, businessId } = req.body;

    if (!documentId || !businessId) {
      return res.status(400).json({
        success: false,
        error: { message: 'documentId and businessId are required' },
      });
    }

    const populatedData = await autoPopulateService.populateBusinessFromW9(documentId, businessId);

    return res.json({
      success: true,
      data: populatedData,
    });
  } catch (error) {
    console.error('Error auto-populating business:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to auto-populate' },
    });
  }
});

/**
 * Apply auto-populate to employee
 * POST /api/ocr/auto-populate/employee
 */
router.post('/auto-populate/employee', async (req: Request, res: Response) => {
  try {
    const { documentId, employeeId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'documentId is required' },
      });
    }

    const populatedData = await autoPopulateService.populateEmployeeFromLicense(documentId, employeeId);

    return res.json({
      success: true,
      data: populatedData,
    });
  } catch (error) {
    console.error('Error auto-populating employee:', error);
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to auto-populate' },
    });
  }
});

/**
 * Get processing job status
 * GET /api/ocr/status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = documentProcessingJobManager.getStatus();

    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get job status' },
    });
  }
});

/**
 * Manually trigger processing (admin only)
 * POST /api/ocr/trigger-processing
 */
router.post('/trigger-processing', async (_req: Request, res: Response) => {
  try {
    await documentProcessingJobManager.triggerProcessing();

    return res.json({
      success: true,
      message: 'Processing triggered',
    });
  } catch (error) {
    console.error('Error triggering processing:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to trigger processing' },
    });
  }
});

export default router;

