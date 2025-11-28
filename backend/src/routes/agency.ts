import { Router } from 'express';
import { agencyService } from '../services/agencyService.js';

import type { Request, Response } from 'express';

const router = Router();

/**
 * Search for contractors
 * GET /api/agency/contractors/search
 */
router.get('/contractors/search', async (req: Request, res: Response) => {
  try {
    const { legalName, ueiNumber, cageCode } = req.query;

    if (!legalName && !ueiNumber && !cageCode) {
      return res.status(400).json({
        success: false,
        error: { message: 'At least one search parameter is required' },
      });
    }

    const results = await agencyService.searchContractors({
      legalName: legalName as string | undefined,
      ueiNumber: ueiNumber as string | undefined,
      cageCode: cageCode as string | undefined,
    });

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error searching contractors:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to search contractors' },
    });
  }
});

/**
 * Verify a single contractor by UEI number
 * GET /api/agency/verify/:ueiNumber
 */
router.get('/verify/:ueiNumber', async (req: Request, res: Response) => {
  try {
    const { ueiNumber } = req.params;
    const agencyId = req.headers['x-agency-id'] as string | undefined;
    const verifiedBy = (req as Request & { user?: { id: string; name: string } }).user?.name;

    if (!ueiNumber) {
      return res.status(400).json({
        success: false,
        error: { message: 'UEI number is required' },
      });
    }

    const verification = await agencyService.verifyContractor(
      ueiNumber,
      agencyId,
      verifiedBy
    );

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found with this UEI number' },
      });
    }

    return res.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    console.error('Error verifying contractor:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to verify contractor' },
    });
  }
});

/**
 * Bulk verify contractors
 * POST /api/agency/verify/bulk
 */
router.post('/verify/bulk', async (req: Request, res: Response) => {
  try {
    const { ueiNumbers } = req.body;
    const agencyId = req.headers['x-agency-id'] as string || 'default';
    const requestedBy = (req as Request & { user?: { id: string; name: string } }).user?.name || 'Unknown';

    if (!Array.isArray(ueiNumbers) || ueiNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'UEI numbers array is required' },
      });
    }

    if (ueiNumbers.length > 500) {
      return res.status(400).json({
        success: false,
        error: { message: 'Maximum 500 UEI numbers per request' },
      });
    }

    const result = await agencyService.bulkVerifyContractors({
      ueiNumbers,
      agencyId,
      requestedBy,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error bulk verifying contractors:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to bulk verify contractors' },
    });
  }
});

/**
 * Get verification history
 * GET /api/agency/verifications/history
 */
router.get('/verifications/history', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string;
    const {
      businessId,
      ueiNumber,
      status,
      riskLevel,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const { records, total } = await agencyService.getVerificationHistory({
      agencyId,
      businessId: businessId as string | undefined,
      ueiNumber: ueiNumber as string | undefined,
      status: status as 'valid' | 'expired' | 'non_compliant' | 'pending' | 'not_found' | undefined,
      riskLevel: riskLevel as 'low' | 'medium' | 'high' | 'critical' | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.json({
      success: true,
      data: records,
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        total,
        totalPages: Math.ceil(total / (limit ? parseInt(limit as string, 10) : 20)),
      },
    });
  } catch (error) {
    console.error('Error getting verification history:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get verification history' },
    });
  }
});

/**
 * Generate verification report (PDF data)
 * GET /api/agency/report/:businessId
 */
router.get('/report/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const agencyId = req.headers['x-agency-id'] as string || 'default';
    const verifierName = (req as Request & { user?: { id: string; name: string } }).user?.name;

    const report = await agencyService.generateVerificationReport(
      businessId,
      agencyId,
      verifierName
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found' },
      });
    }

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating verification report:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to generate verification report' },
    });
  }
});

export default router;

