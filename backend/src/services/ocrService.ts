import { db } from './database.js';
import { documentService } from './documentService.js';
import crypto from 'crypto';

import type { Document } from '../types/document.js';

/**
 * OCR Processing Status
 */
export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'requires_review';

/**
 * Confidence level thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 95,
  MEDIUM: 80,
  LOW: 60,
};

/**
 * Extracted field with confidence
 */
export interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
  boundingBox?: BoundingBox;
  pageNumber?: number;
}

/**
 * Bounding box for field location
 */
export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Table cell
 */
export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  text: string;
  confidence: number;
}

/**
 * Extracted table
 */
export interface ExtractedTable {
  pageNumber: number;
  rows: number;
  columns: number;
  cells: TableCell[];
  confidence: number;
}

/**
 * OCR Result stored in document metadata
 */
export interface OCRResult {
  status: OCRStatus;
  processedAt?: string;
  processingTime?: number;
  textractJobId?: string;
  rawText?: string;
  fields: ExtractedField[];
  tables: ExtractedTable[];
  documentType?: 'w9' | 'license' | 'certificate' | 'contract' | 'unknown';
  structuredData?: W9Data | LicenseData | CertificateData;
  overallConfidence: number;
  pageCount: number;
  errors?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  approved?: boolean;
}

/**
 * W-9 Form extracted data
 */
export interface W9Data {
  businessName?: string;
  businessType?: string;
  exemptPayeeCode?: string;
  fatcaExemptionCode?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  accountNumbers?: string;
  ein?: string;
  ssn?: string;
  certificationDate?: string;
  signature?: boolean;
}

/**
 * License/ID extracted data
 */
export interface LicenseData {
  documentType?: string;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  issueDate?: string;
  expirationDate?: string;
  issuingAuthority?: string;
  licenseClass?: string;
  restrictions?: string;
  photo?: boolean;
}

/**
 * Certificate extracted data
 */
export interface CertificateData {
  certificateType?: string;
  certificateNumber?: string;
  businessName?: string;
  issueDate?: string;
  expirationDate?: string;
  issuingAgency?: string;
  status?: string;
}

/**
 * Textract response types (simplified for integration)
 */
interface TextractBlock {
  BlockType: 'PAGE' | 'LINE' | 'WORD' | 'KEY_VALUE_SET' | 'TABLE' | 'CELL' | 'SELECTION_ELEMENT';
  Text?: string;
  Confidence?: number;
  Geometry?: {
    BoundingBox: {
      Left: number;
      Top: number;
      Width: number;
      Height: number;
    };
  };
  EntityTypes?: string[];
  Relationships?: Array<{
    Type: string;
    Ids: string[];
  }>;
  Id: string;
  Page?: number;
  RowIndex?: number;
  ColumnIndex?: number;
  SelectionStatus?: 'SELECTED' | 'NOT_SELECTED';
}

interface TextractResponse {
  DocumentMetadata: {
    Pages: number;
  };
  Blocks: TextractBlock[];
  JobStatus?: string;
  NextToken?: string;
}

/**
 * AWS Textract Configuration
 */
const TEXTRACT_CONFIG = {
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  bucket: process.env['S3_BUCKET'] ?? 'hz-navigator-documents',
};

/**
 * OCR Service
 * 
 * Handles document OCR processing using AWS Textract
 */
export class OCRService {
  /**
   * Process a document for OCR extraction
   */
  async processDocument(documentId: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    // Get document from database
    const document = await documentService.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Update document status to processing
    await this.updateOCRStatus(documentId, 'processing');

    try {
      // Download document from S3
      const documentBuffer = await this.downloadFromS3(document.s3Key);

      // Send to AWS Textract
      const textractResponse = await this.analyzeDocument(documentBuffer, document.mimeType);

      // Parse Textract results
      const { fields, tables, rawText } = this.parseTextractResponse(textractResponse);

      // Detect document type
      const documentType = this.detectDocumentType(fields, rawText);

      // Extract structured data based on document type
      const structuredData = this.extractStructuredData(documentType, fields, tables, rawText);

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(fields);

      // Determine if review is required
      const status: OCRStatus = overallConfidence >= CONFIDENCE_THRESHOLDS.HIGH 
        ? 'completed' 
        : 'requires_review';

      // Create OCR result
      const result: OCRResult = {
        status,
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        rawText,
        fields,
        tables,
        documentType,
        structuredData,
        overallConfidence,
        pageCount: textractResponse.DocumentMetadata.Pages,
      };

      // Store result in document metadata
      await this.storeOCRResult(documentId, result);

      // Update document status
      await documentService.updateDocument(documentId, {
        status: status === 'completed' ? 'verified' : 'processing',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const result: OCRResult = {
        status: 'failed',
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        fields: [],
        tables: [],
        overallConfidence: 0,
        pageCount: 0,
        errors: [errorMessage],
      };

      await this.storeOCRResult(documentId, result);
      throw error;
    }
  }

  /**
   * Extract W-9 form data
   */
  async extractW9Data(document: Document): Promise<W9Data> {
    const ocrResult = await this.getOCRResult(document.id);
    
    if (!ocrResult || ocrResult.status === 'failed') {
      throw new Error('OCR result not available');
    }

    if (ocrResult.structuredData && ocrResult.documentType === 'w9') {
      return ocrResult.structuredData as W9Data;
    }

    // Extract W-9 specific fields
    return this.extractW9Fields(ocrResult.fields, ocrResult.rawText);
  }

  /**
   * Extract license/ID data
   */
  async extractLicenseData(document: Document): Promise<LicenseData> {
    const ocrResult = await this.getOCRResult(document.id);
    
    if (!ocrResult || ocrResult.status === 'failed') {
      throw new Error('OCR result not available');
    }

    if (ocrResult.structuredData && ocrResult.documentType === 'license') {
      return ocrResult.structuredData as LicenseData;
    }

    // Extract license specific fields
    return this.extractLicenseFields(ocrResult.fields, ocrResult.rawText);
  }

  /**
   * Get OCR result for a document
   */
  async getOCRResult(documentId: string): Promise<OCRResult | null> {
    const query = `
      SELECT metadata->'ocrResult' as ocr_result
      FROM documents
      WHERE id = $1
    `;

    const result = await db.query<{ ocr_result: OCRResult }>(query, [documentId]);
    
    if (result.rows.length === 0 || !result.rows[0].ocr_result) {
      return null;
    }

    return result.rows[0].ocr_result;
  }

  /**
   * Update extracted data after review
   */
  async updateExtractedData(
    documentId: string,
    updates: Partial<W9Data | LicenseData>,
    userId: string
  ): Promise<OCRResult> {
    const ocrResult = await this.getOCRResult(documentId);
    
    if (!ocrResult) {
      throw new Error('OCR result not found');
    }

    // Merge updates with existing structured data
    const updatedResult: OCRResult = {
      ...ocrResult,
      structuredData: {
        ...ocrResult.structuredData,
        ...updates,
      },
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
    };

    await this.storeOCRResult(documentId, updatedResult);
    return updatedResult;
  }

  /**
   * Approve extracted data
   */
  async approveExtraction(documentId: string, userId: string): Promise<void> {
    const ocrResult = await this.getOCRResult(documentId);
    
    if (!ocrResult) {
      throw new Error('OCR result not found');
    }

    const updatedResult: OCRResult = {
      ...ocrResult,
      status: 'completed',
      approved: true,
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
    };

    await this.storeOCRResult(documentId, updatedResult);
    
    // Update document status to verified
    await documentService.updateDocument(documentId, {
      status: 'verified',
    });
  }

  /**
   * Reject extraction and request reupload
   */
  async rejectExtraction(
    documentId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const ocrResult = await this.getOCRResult(documentId);
    
    if (!ocrResult) {
      throw new Error('OCR result not found');
    }

    const updatedResult: OCRResult = {
      ...ocrResult,
      status: 'failed',
      approved: false,
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
      errors: [...(ocrResult.errors ?? []), `Rejected: ${reason}`],
    };

    await this.storeOCRResult(documentId, updatedResult);
    
    // Update document status to rejected
    await documentService.updateDocument(documentId, {
      status: 'rejected',
    });
  }

  /**
   * Queue document for OCR processing
   */
  async queueForProcessing(documentId: string): Promise<void> {
    await this.updateOCRStatus(documentId, 'pending');
    
    // In production, this would add to a queue (SQS, Redis, etc.)
    // For now, we'll process synchronously or trigger background job
    console.info(`[OCR] Document ${documentId} queued for processing`);
  }

  /**
   * Get documents pending OCR processing
   */
  async getPendingDocuments(limit: number = 10): Promise<Document[]> {
    const query = `
      SELECT * FROM documents
      WHERE 
        deleted_at IS NULL
        AND status = 'uploaded'
        AND (
          metadata->'ocrResult' IS NULL
          OR metadata->'ocrResult'->>'status' = 'pending'
        )
        AND file_type IN ('pdf', 'jpg', 'jpeg', 'png')
      ORDER BY uploaded_at ASC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows.map(row => this.mapDocumentRow(row));
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Download document from S3
   */
  private async downloadFromS3(s3Key: string): Promise<Buffer> {
    // In production, use AWS SDK:
    // const s3 = new S3Client({ region: TEXTRACT_CONFIG.region });
    // const response = await s3.send(new GetObjectCommand({
    //   Bucket: TEXTRACT_CONFIG.bucket,
    //   Key: s3Key,
    // }));
    // return Buffer.from(await response.Body.transformToByteArray());

    // Simulated for development
    console.info(`[S3 Simulated] Downloading ${s3Key}`);
    
    // Return a sample PDF buffer for testing
    return Buffer.from('Simulated document content');
  }

  /**
   * Analyze document with AWS Textract
   */
  private async analyzeDocument(
    documentBuffer: Buffer,
    mimeType: string
  ): Promise<TextractResponse> {
    // In production, use AWS Textract SDK:
    // const textract = new TextractClient({ region: TEXTRACT_CONFIG.region });
    // const response = await textract.send(new AnalyzeDocumentCommand({
    //   Document: { Bytes: documentBuffer },
    //   FeatureTypes: ['FORMS', 'TABLES'],
    // }));
    // return response;

    // Simulated response for development
    console.info(`[Textract Simulated] Analyzing document (${mimeType})`);
    
    return this.generateSimulatedTextractResponse();
  }

  /**
   * Generate simulated Textract response for development
   */
  private generateSimulatedTextractResponse(): TextractResponse {
    // This simulates a W-9 form response
    const blocks: TextractBlock[] = [
      {
        Id: '1',
        BlockType: 'PAGE',
        Page: 1,
      },
      // Key-value pairs for W-9
      {
        Id: '2',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['KEY'],
        Text: 'Name',
        Confidence: 98.5,
        Relationships: [{ Type: 'VALUE', Ids: ['3'] }],
        Geometry: { BoundingBox: { Left: 0.1, Top: 0.1, Width: 0.2, Height: 0.02 } },
      },
      {
        Id: '3',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['VALUE'],
        Text: 'ABC Corporation',
        Confidence: 95.2,
        Geometry: { BoundingBox: { Left: 0.3, Top: 0.1, Width: 0.4, Height: 0.02 } },
      },
      {
        Id: '4',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['KEY'],
        Text: 'Business name',
        Confidence: 97.1,
        Relationships: [{ Type: 'VALUE', Ids: ['5'] }],
        Geometry: { BoundingBox: { Left: 0.1, Top: 0.15, Width: 0.2, Height: 0.02 } },
      },
      {
        Id: '5',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['VALUE'],
        Text: 'ABC Corporation LLC',
        Confidence: 94.8,
        Geometry: { BoundingBox: { Left: 0.3, Top: 0.15, Width: 0.4, Height: 0.02 } },
      },
      {
        Id: '6',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['KEY'],
        Text: 'Address',
        Confidence: 99.1,
        Relationships: [{ Type: 'VALUE', Ids: ['7'] }],
        Geometry: { BoundingBox: { Left: 0.1, Top: 0.25, Width: 0.2, Height: 0.02 } },
      },
      {
        Id: '7',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['VALUE'],
        Text: '123 Main Street, Suite 400',
        Confidence: 92.3,
        Geometry: { BoundingBox: { Left: 0.3, Top: 0.25, Width: 0.5, Height: 0.02 } },
      },
      {
        Id: '8',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['KEY'],
        Text: 'City, state, and ZIP code',
        Confidence: 96.5,
        Relationships: [{ Type: 'VALUE', Ids: ['9'] }],
        Geometry: { BoundingBox: { Left: 0.1, Top: 0.3, Width: 0.25, Height: 0.02 } },
      },
      {
        Id: '9',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['VALUE'],
        Text: 'Washington, DC 20001',
        Confidence: 93.7,
        Geometry: { BoundingBox: { Left: 0.35, Top: 0.3, Width: 0.35, Height: 0.02 } },
      },
      {
        Id: '10',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['KEY'],
        Text: 'Employer identification number',
        Confidence: 98.9,
        Relationships: [{ Type: 'VALUE', Ids: ['11'] }],
        Geometry: { BoundingBox: { Left: 0.1, Top: 0.5, Width: 0.3, Height: 0.02 } },
      },
      {
        Id: '11',
        BlockType: 'KEY_VALUE_SET',
        EntityTypes: ['VALUE'],
        Text: '12-3456789',
        Confidence: 97.8,
        Geometry: { BoundingBox: { Left: 0.4, Top: 0.5, Width: 0.2, Height: 0.02 } },
      },
      // Raw text lines
      {
        Id: '20',
        BlockType: 'LINE',
        Text: 'Form W-9 Request for Taxpayer Identification Number and Certification',
        Confidence: 99.5,
        Page: 1,
      },
      {
        Id: '21',
        BlockType: 'LINE',
        Text: 'Department of the Treasury Internal Revenue Service',
        Confidence: 99.2,
        Page: 1,
      },
    ];

    return {
      DocumentMetadata: { Pages: 1 },
      Blocks: blocks,
    };
  }

  /**
   * Parse Textract response into structured data
   */
  private parseTextractResponse(response: TextractResponse): {
    fields: ExtractedField[];
    tables: ExtractedTable[];
    rawText: string;
  } {
    const fields: ExtractedField[] = [];
    const tables: ExtractedTable[] = [];
    const textLines: string[] = [];

    // Create block map for relationship lookups
    const blockMap = new Map<string, TextractBlock>();
    for (const block of response.Blocks) {
      blockMap.set(block.Id, block);
    }

    // Process blocks
    for (const block of response.Blocks) {
      // Extract key-value pairs
      if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
        const valueBlock = this.findValueBlock(block, blockMap);
        if (valueBlock) {
          fields.push({
            key: block.Text ?? '',
            value: valueBlock.Text ?? '',
            confidence: ((block.Confidence ?? 0) + (valueBlock.Confidence ?? 0)) / 2,
            boundingBox: block.Geometry?.BoundingBox ? {
              left: block.Geometry.BoundingBox.Left,
              top: block.Geometry.BoundingBox.Top,
              width: block.Geometry.BoundingBox.Width,
              height: block.Geometry.BoundingBox.Height,
            } : undefined,
            pageNumber: block.Page,
          });
        }
      }

      // Extract text lines
      if (block.BlockType === 'LINE' && block.Text) {
        textLines.push(block.Text);
      }

      // Extract tables
      if (block.BlockType === 'TABLE') {
        const table = this.extractTable(block, blockMap);
        if (table) {
          tables.push(table);
        }
      }
    }

    return {
      fields,
      tables,
      rawText: textLines.join('\n'),
    };
  }

  /**
   * Find value block for a key block
   */
  private findValueBlock(
    keyBlock: TextractBlock,
    blockMap: Map<string, TextractBlock>
  ): TextractBlock | null {
    const valueRelation = keyBlock.Relationships?.find(r => r.Type === 'VALUE');
    if (!valueRelation?.Ids?.length) return null;

    const valueBlockId = valueRelation.Ids[0];
    return blockMap.get(valueBlockId) ?? null;
  }

  /**
   * Extract table from blocks
   */
  private extractTable(
    tableBlock: TextractBlock,
    blockMap: Map<string, TextractBlock>
  ): ExtractedTable | null {
    const cellRelation = tableBlock.Relationships?.find(r => r.Type === 'CHILD');
    if (!cellRelation?.Ids?.length) return null;

    const cells: TableCell[] = [];
    let maxRow = 0;
    let maxCol = 0;
    let totalConfidence = 0;

    for (const cellId of cellRelation.Ids) {
      const cellBlock = blockMap.get(cellId);
      if (cellBlock?.BlockType === 'CELL') {
        const rowIndex = cellBlock.RowIndex ?? 0;
        const colIndex = cellBlock.ColumnIndex ?? 0;
        
        maxRow = Math.max(maxRow, rowIndex);
        maxCol = Math.max(maxCol, colIndex);
        totalConfidence += cellBlock.Confidence ?? 0;

        cells.push({
          rowIndex,
          columnIndex: colIndex,
          text: cellBlock.Text ?? '',
          confidence: cellBlock.Confidence ?? 0,
        });
      }
    }

    return {
      pageNumber: tableBlock.Page ?? 1,
      rows: maxRow,
      columns: maxCol,
      cells,
      confidence: cells.length > 0 ? totalConfidence / cells.length : 0,
    };
  }

  /**
   * Detect document type based on content
   */
  private detectDocumentType(
    fields: ExtractedField[],
    rawText?: string
  ): OCRResult['documentType'] {
    const text = (rawText ?? '').toLowerCase();
    const fieldKeys = fields.map(f => f.key.toLowerCase()).join(' ');

    // W-9 detection
    if (
      text.includes('w-9') ||
      text.includes('form w9') ||
      text.includes('taxpayer identification') ||
      fieldKeys.includes('employer identification')
    ) {
      return 'w9';
    }

    // License/ID detection
    if (
      text.includes('driver') && text.includes('license') ||
      text.includes('identification card') ||
      fieldKeys.includes('date of birth') ||
      fieldKeys.includes('expiration date')
    ) {
      return 'license';
    }

    // Certificate detection
    if (
      text.includes('certificate') ||
      text.includes('certification') ||
      text.includes('hubzone')
    ) {
      return 'certificate';
    }

    // Contract detection
    if (
      text.includes('contract') ||
      text.includes('agreement') ||
      text.includes('parties')
    ) {
      return 'contract';
    }

    return 'unknown';
  }

  /**
   * Extract structured data based on document type
   */
  private extractStructuredData(
    documentType: OCRResult['documentType'],
    fields: ExtractedField[],
    tables: ExtractedTable[],
    rawText?: string
  ): W9Data | LicenseData | CertificateData | undefined {
    switch (documentType) {
      case 'w9':
        return this.extractW9Fields(fields, rawText);
      case 'license':
        return this.extractLicenseFields(fields, rawText);
      case 'certificate':
        return this.extractCertificateFields(fields, rawText);
      default:
        return undefined;
    }
  }

  /**
   * Extract W-9 specific fields
   */
  private extractW9Fields(fields: ExtractedField[], rawText?: string): W9Data {
    const data: W9Data = {};
    const fieldMap = new Map(fields.map(f => [f.key.toLowerCase(), f.value]));

    // Business name
    data.businessName = this.findFieldValue(fieldMap, [
      'name', 'business name', 'legal name', 'entity name'
    ]);

    // Business type
    data.businessType = this.findFieldValue(fieldMap, [
      'federal tax classification', 'business type', 'entity type'
    ]);

    // Address
    data.address = this.findFieldValue(fieldMap, [
      'address', 'street address', 'number, street'
    ]);

    // City, State, ZIP
    const cityStateZip = this.findFieldValue(fieldMap, [
      'city, state, and zip', 'city, state, zip', 'city state zip'
    ]);

    if (cityStateZip) {
      const parsed = this.parseCityStateZip(cityStateZip);
      data.city = parsed.city;
      data.state = parsed.state;
      data.zipCode = parsed.zip;
    }

    // EIN
    data.ein = this.findFieldValue(fieldMap, [
      'employer identification number', 'ein', 'tax id', 'federal tax id'
    ]);

    // Clean EIN format
    if (data.ein) {
      data.ein = data.ein.replace(/[^0-9-]/g, '');
    }

    // SSN (if present instead of EIN)
    data.ssn = this.findFieldValue(fieldMap, [
      'social security number', 'ssn'
    ]);

    // Account numbers
    data.accountNumbers = this.findFieldValue(fieldMap, [
      'account number', 'account numbers', 'list account numbers'
    ]);

    return data;
  }

  /**
   * Extract license/ID specific fields
   */
  private extractLicenseFields(fields: ExtractedField[], rawText?: string): LicenseData {
    const data: LicenseData = {};
    const fieldMap = new Map(fields.map(f => [f.key.toLowerCase(), f.value]));

    // Document type
    data.documentType = this.findFieldValue(fieldMap, [
      'type', 'document type', 'card type'
    ]) ?? 'Driver License';

    // ID Number
    data.idNumber = this.findFieldValue(fieldMap, [
      'id', 'dl', 'license number', 'id number', 'document number', 'lic no'
    ]);

    // Name fields
    data.firstName = this.findFieldValue(fieldMap, [
      'first name', 'fn', 'given name'
    ]);

    data.lastName = this.findFieldValue(fieldMap, [
      'last name', 'ln', 'surname', 'family name'
    ]);

    data.middleName = this.findFieldValue(fieldMap, [
      'middle name', 'mn', 'middle'
    ]);

    data.fullName = this.findFieldValue(fieldMap, [
      'name', 'full name'
    ]);

    // Parse full name if individual fields not found
    if (data.fullName && !data.firstName) {
      const nameParts = data.fullName.split(' ');
      if (nameParts.length >= 2) {
        data.firstName = nameParts[0];
        data.lastName = nameParts[nameParts.length - 1];
        if (nameParts.length > 2) {
          data.middleName = nameParts.slice(1, -1).join(' ');
        }
      }
    }

    // Date of birth
    data.dateOfBirth = this.findFieldValue(fieldMap, [
      'dob', 'date of birth', 'birth date', 'born'
    ]);

    // Address
    data.address = this.findFieldValue(fieldMap, [
      'address', 'street', 'addr'
    ]);

    // City, State, ZIP
    data.city = this.findFieldValue(fieldMap, ['city']);
    data.state = this.findFieldValue(fieldMap, ['state', 'st']);
    data.zipCode = this.findFieldValue(fieldMap, ['zip', 'zip code', 'postal code']);

    // Dates
    data.issueDate = this.findFieldValue(fieldMap, [
      'issue date', 'iss', 'issued'
    ]);

    data.expirationDate = this.findFieldValue(fieldMap, [
      'expiration', 'exp', 'expires', 'expiration date', 'valid until'
    ]);

    // License class
    data.licenseClass = this.findFieldValue(fieldMap, [
      'class', 'license class', 'type'
    ]);

    // Restrictions
    data.restrictions = this.findFieldValue(fieldMap, [
      'restrictions', 'restr', 'endorsements'
    ]);

    return data;
  }

  /**
   * Extract certificate specific fields
   */
  private extractCertificateFields(fields: ExtractedField[], rawText?: string): CertificateData {
    const data: CertificateData = {};
    const fieldMap = new Map(fields.map(f => [f.key.toLowerCase(), f.value]));

    data.certificateType = this.findFieldValue(fieldMap, [
      'certificate type', 'certification', 'type'
    ]);

    data.certificateNumber = this.findFieldValue(fieldMap, [
      'certificate number', 'cert no', 'number', 'id'
    ]);

    data.businessName = this.findFieldValue(fieldMap, [
      'business name', 'company', 'firm name', 'entity'
    ]);

    data.issueDate = this.findFieldValue(fieldMap, [
      'issue date', 'issued', 'effective date'
    ]);

    data.expirationDate = this.findFieldValue(fieldMap, [
      'expiration', 'expires', 'valid until', 'through'
    ]);

    data.issuingAgency = this.findFieldValue(fieldMap, [
      'issuing agency', 'issued by', 'authority'
    ]);

    data.status = this.findFieldValue(fieldMap, [
      'status', 'certification status'
    ]);

    return data;
  }

  /**
   * Find field value by multiple possible keys
   */
  private findFieldValue(
    fieldMap: Map<string, string>,
    possibleKeys: string[]
  ): string | undefined {
    for (const key of possibleKeys) {
      // Exact match
      if (fieldMap.has(key)) {
        return fieldMap.get(key);
      }

      // Partial match
      for (const [mapKey, value] of fieldMap) {
        if (mapKey.includes(key) || key.includes(mapKey)) {
          return value;
        }
      }
    }
    return undefined;
  }

  /**
   * Parse city, state, zip from combined string
   */
  private parseCityStateZip(value: string): { city?: string; state?: string; zip?: string } {
    // Pattern: City, STATE ZIP
    const match = value.match(/^(.+?),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
    
    if (match) {
      return {
        city: match[1].trim(),
        state: match[2].toUpperCase(),
        zip: match[3],
      };
    }

    return {};
  }

  /**
   * Calculate overall confidence from fields
   */
  private calculateOverallConfidence(fields: ExtractedField[]): number {
    if (fields.length === 0) return 0;
    
    const total = fields.reduce((sum, f) => sum + f.confidence, 0);
    return Math.round(total / fields.length);
  }

  /**
   * Update OCR status in document metadata
   */
  private async updateOCRStatus(documentId: string, status: OCRStatus): Promise<void> {
    const query = `
      UPDATE documents
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'),
        '{ocrResult,status}',
        to_jsonb($2::text)
      ),
      updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [documentId, status]);
  }

  /**
   * Store complete OCR result in document metadata
   */
  private async storeOCRResult(documentId: string, result: OCRResult): Promise<void> {
    const query = `
      UPDATE documents
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'),
        '{ocrResult}',
        $2::jsonb
      ),
      updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [documentId, JSON.stringify(result)]);
  }

  /**
   * Map database row to Document
   */
  private mapDocumentRow(row: Record<string, unknown>): Document {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      businessId: row['business_id'] as string | undefined,
      category: row['category'] as Document['category'],
      filename: row['filename'] as string,
      originalFilename: row['original_filename'] as string,
      fileSize: parseInt(row['file_size'] as string, 10),
      fileType: row['file_type'] as Document['fileType'],
      mimeType: row['mime_type'] as string,
      s3Bucket: row['s3_bucket'] as string,
      s3Key: row['s3_key'] as string,
      s3VersionId: row['s3_version_id'] as string | undefined,
      status: row['status'] as Document['status'],
      metadata: typeof row['metadata'] === 'string'
        ? JSON.parse(row['metadata'])
        : (row['metadata'] ?? {}),
      description: row['description'] as string | undefined,
      tags: row['tags'] as string[] ?? [],
      uploadedAt: new Date(row['uploaded_at'] as string),
      uploadedBy: row['uploaded_by'] as string,
      updatedAt: new Date(row['updated_at'] as string),
      deletedAt: row['deleted_at'] ? new Date(row['deleted_at'] as string) : undefined,
    };
  }
}

// Export singleton instance
export const ocrService = new OCRService();

