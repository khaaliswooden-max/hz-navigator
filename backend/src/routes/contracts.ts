import { Router } from 'express';
import { contractService } from '../services/contractService.js';

import type { Request, Response } from 'express';
import type { ContractFilters, CreateContractData, UpdateContractData } from '../types/contract.js';

const router = Router();

/**
 * @swagger
 * /api/contracts:
 *   get:
 *     summary: Get contracts with filters
 *     description: Returns a paginated list of contracts with comprehensive filtering options.
 *     tags: [Contracts]
 *     parameters:
 *       - $ref: '#/components/parameters/AgencyIdHeader'
 *       - name: fiscalYear
 *         in: query
 *         schema:
 *           type: integer
 *           example: 2024
 *       - name: fiscalQuarter
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 4
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, completed, terminated, pending, cancelled]
 *       - name: contractType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [hubzone_set_aside, hubzone_sole_source, price_preference, full_open, small_business, other]
 *       - name: isHubzoneContractor
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: contractorUei
 *         in: query
 *         schema:
 *           type: string
 *       - name: minValue
 *         in: query
 *         schema:
 *           type: number
 *       - name: maxValue
 *         in: query
 *         schema:
 *           type: number
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: ContractFilters = {
      agencyId: req.query.agencyId as string | undefined,
      fiscalYear: req.query.fiscalYear ? parseInt(req.query.fiscalYear as string, 10) : undefined,
      fiscalQuarter: req.query.fiscalQuarter ? parseInt(req.query.fiscalQuarter as string, 10) : undefined,
      status: req.query.status as ContractFilters['status'],
      contractType: req.query.contractType as ContractFilters['contractType'],
      isHubzoneContractor: req.query.isHubzoneContractor === 'true' ? true : 
                           req.query.isHubzoneContractor === 'false' ? false : undefined,
      contractorUei: req.query.contractorUei as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
      maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sortBy: req.query.sortBy as ContractFilters['sortBy'],
      sortOrder: req.query.sortOrder as ContractFilters['sortOrder'],
    };

    const { contracts, total } = await contractService.getAgencyContracts(filters);

    return res.json({
      success: true,
      data: contracts,
      pagination: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (filters.limit ?? 20)),
      },
    });
  } catch (error) {
    console.error('Error getting contracts:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get contracts' },
    });
  }
});

/**
 * @swagger
 * /api/contracts/{id}:
 *   get:
 *     summary: Get contract by ID
 *     description: Returns detailed information about a specific contract.
 *     tags: [Contracts]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contract details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Contract'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const contract = await contractService.getContract(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contract not found' },
      });
    }

    return res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Error getting contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get contract' },
    });
  }
});

/**
 * @swagger
 * /api/contracts:
 *   post:
 *     summary: Create a new contract
 *     description: Creates a new contract record for tracking HUBZone goal progress.
 *     tags: [Contracts]
 *     parameters:
 *       - $ref: '#/components/parameters/AgencyIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContractRequest'
 *     responses:
 *       201:
 *         description: Contract created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.body.agencyId;
    const createdBy = (req as Request & { user?: { id: string; name: string } }).user?.name;

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const data: CreateContractData = {
      contractNumber: req.body.contractNumber,
      title: req.body.title,
      description: req.body.description,
      contractorName: req.body.contractorName,
      contractorUei: req.body.contractorUei,
      contractorCageCode: req.body.contractorCageCode,
      isHubzoneContractor: req.body.isHubzoneContractor ?? false,
      awardDate: new Date(req.body.awardDate),
      awardValue: parseFloat(req.body.awardValue),
      contractType: req.body.contractType,
      awardType: req.body.awardType,
      naicsCodes: req.body.naicsCodes ?? [],
      psc: req.body.psc,
      periodOfPerformanceStart: new Date(req.body.periodOfPerformanceStart),
      periodOfPerformanceEnd: new Date(req.body.periodOfPerformanceEnd),
      status: req.body.status,
    };

    const contract = await contractService.createContract(agencyId, data, createdBy);

    return res.status(201).json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create contract' },
    });
  }
});

/**
 * Update contract
 * PUT /api/contracts/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updates: UpdateContractData = {};

    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.currentValue !== undefined) updates.currentValue = parseFloat(req.body.currentValue);
    if (req.body.obligatedAmount !== undefined) updates.obligatedAmount = parseFloat(req.body.obligatedAmount);
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.periodOfPerformanceEnd !== undefined) {
      updates.periodOfPerformanceEnd = new Date(req.body.periodOfPerformanceEnd);
    }

    const contract = await contractService.updateContract(req.params.id, updates);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contract not found' },
      });
    }

    return res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update contract' },
    });
  }
});

/**
 * Delete contract
 * DELETE /api/contracts/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await contractService.deleteContract(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contract not found' },
      });
    }

    return res.json({
      success: true,
      message: 'Contract deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete contract' },
    });
  }
});

/**
 * Get or set fiscal year goal
 * GET /api/contracts/goals/:fiscalYear
 */
router.get('/goals/:fiscalYear', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.query.agencyId as string;
    const fiscalYear = parseInt(req.params.fiscalYear, 10);

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const goal = await contractService.getFiscalYearGoal(agencyId, fiscalYear);

    return res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error('Error getting fiscal year goal:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get fiscal year goal' },
    });
  }
});

/**
 * Set fiscal year goal
 * POST /api/contracts/goals/:fiscalYear
 */
router.post('/goals/:fiscalYear', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.body.agencyId;
    const fiscalYear = parseInt(req.params.fiscalYear, 10);

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const { goalPercentage, totalContractingGoal, notes } = req.body;

    const goal = await contractService.setFiscalYearGoal(
      agencyId,
      fiscalYear,
      goalPercentage ?? 3.0,
      totalContractingGoal ?? 0,
      notes
    );

    return res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error('Error setting fiscal year goal:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to set fiscal year goal' },
    });
  }
});

/**
 * @swagger
 * /api/contracts/progress/{fiscalYear}:
 *   get:
 *     summary: Get HUBZone goal progress
 *     description: Returns the current progress toward HUBZone contracting goals for a fiscal year.
 *     tags: [Contracts]
 *     parameters:
 *       - $ref: '#/components/parameters/AgencyIdHeader'
 *       - name: fiscalYear
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2024
 *     responses:
 *       200:
 *         description: Goal progress data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GoalProgress'
 *       400:
 *         description: Agency ID required
 */
router.get('/progress/:fiscalYear', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.query.agencyId as string;
    const fiscalYear = parseInt(req.params.fiscalYear, 10);

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const progress = await contractService.calculateGoalProgress(agencyId, fiscalYear);

    return res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to calculate goal progress' },
    });
  }
});

/**
 * Get contract summary
 * GET /api/contracts/summary/:fiscalYear
 */
router.get('/summary/:fiscalYear', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.query.agencyId as string;
    const fiscalYear = parseInt(req.params.fiscalYear, 10);

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const summary = await contractService.getContractSummary(agencyId, fiscalYear);

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting contract summary:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get contract summary' },
    });
  }
});

/**
 * Get top contractors
 * GET /api/contracts/top-contractors/:fiscalYear
 */
router.get('/top-contractors/:fiscalYear', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.query.agencyId as string;
    const fiscalYear = parseInt(req.params.fiscalYear, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const contractors = await contractService.getTopContractors(agencyId, fiscalYear, limit);

    return res.json({
      success: true,
      data: contractors,
    });
  } catch (error) {
    console.error('Error getting top contractors:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get top contractors' },
    });
  }
});

/**
 * Generate fiscal year report
 * GET /api/contracts/report/:fiscalYear
 */
router.get('/report/:fiscalYear', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.query.agencyId as string;
    const fiscalYear = parseInt(req.params.fiscalYear, 10);

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const report = await contractService.generateFiscalYearReport(agencyId, fiscalYear);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating fiscal year report:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to generate fiscal year report' },
    });
  }
});

/**
 * Validate contract with SAM.gov
 * GET /api/contracts/validate/:contractNumber
 */
router.get('/validate/:contractNumber', async (req: Request, res: Response) => {
  try {
    const result = await contractService.validateWithSam(req.params.contractNumber);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error validating with SAM.gov:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to validate with SAM.gov' },
    });
  }
});

/**
 * Export for FPDS-NG
 * GET /api/contracts/export/fpds/:fiscalYear
 */
router.get('/export/fpds/:fiscalYear', async (req: Request, res: Response) => {
  try {
    const agencyId = req.headers['x-agency-id'] as string || req.query.agencyId as string;
    const fiscalYear = parseInt(req.params.fiscalYear, 10);

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agency ID is required' },
      });
    }

    const csv = await contractService.exportForFPDS(agencyId, fiscalYear);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fpds_export_fy${fiscalYear}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting for FPDS:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to export for FPDS-NG' },
    });
  }
});

export default router;

