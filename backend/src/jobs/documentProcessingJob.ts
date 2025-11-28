import { CronJob } from 'cron';
import { ocrService } from '../services/ocrService.js';
import { notificationService } from '../services/notificationService.js';

import type { Document } from '../types/document.js';
import type { OCRResult } from '../services/ocrService.js';

/**
 * Job configuration
 */
const JOB_CONFIG = {
  // Run every minute in development, every 5 minutes in production
  cronPattern: process.env['NODE_ENV'] === 'production' 
    ? '*/5 * * * *' 
    : '*/1 * * * *',
  batchSize: 5, // Process 5 documents per run
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds between retries
};

/**
 * Processing queue item
 */
interface QueueItem {
  documentId: string;
  userId: string;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

/**
 * Document Processing Job Manager
 * 
 * Handles background OCR processing of uploaded documents
 */
export class DocumentProcessingJobManager {
  private job: CronJob | null = null;
  private isProcessing = false;
  private processingQueue: QueueItem[] = [];
  private processedCount = 0;
  private errorCount = 0;

  /**
   * Start the background processing job
   */
  start(): void {
    if (this.job) {
      console.warn('[DocumentProcessingJob] Job already running');
      return;
    }

    this.job = new CronJob(
      JOB_CONFIG.cronPattern,
      () => this.runProcessingCycle(),
      null,
      true,
      'America/New_York'
    );

    console.info(`[DocumentProcessingJob] Started with pattern: ${JOB_CONFIG.cronPattern}`);
  }

  /**
   * Stop the background processing job
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.info('[DocumentProcessingJob] Stopped');
    }
  }

  /**
   * Manually trigger processing
   */
  async triggerProcessing(): Promise<void> {
    await this.runProcessingCycle();
  }

  /**
   * Add document to processing queue
   */
  queueDocument(documentId: string, userId: string): void {
    // Check if already in queue
    if (this.processingQueue.some(item => item.documentId === documentId)) {
      console.info(`[DocumentProcessingJob] Document ${documentId} already in queue`);
      return;
    }

    this.processingQueue.push({
      documentId,
      userId,
      attempts: 0,
    });

    console.info(`[DocumentProcessingJob] Queued document ${documentId}`);
  }

  /**
   * Get queue status
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    queueLength: number;
    processedCount: number;
    errorCount: number;
  } {
    return {
      isRunning: this.job !== null,
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
    };
  }

  /**
   * Run a single processing cycle
   */
  private async runProcessingCycle(): Promise<void> {
    if (this.isProcessing) {
      console.info('[DocumentProcessingJob] Skipping cycle - already processing');
      return;
    }

    this.isProcessing = true;
    console.info('[DocumentProcessingJob] Starting processing cycle');

    try {
      // First, process items from in-memory queue
      await this.processQueuedItems();

      // Then, check database for pending documents
      await this.processPendingDocuments();
    } catch (error) {
      console.error('[DocumentProcessingJob] Cycle error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process items from in-memory queue
   */
  private async processQueuedItems(): Promise<void> {
    const itemsToProcess = this.processingQueue.splice(0, JOB_CONFIG.batchSize);

    for (const item of itemsToProcess) {
      try {
        await this.processDocument(item);
        this.processedCount++;
      } catch (error) {
        await this.handleProcessingError(item, error);
      }
    }
  }

  /**
   * Process documents pending in database
   */
  private async processPendingDocuments(): Promise<void> {
    try {
      const pendingDocs = await ocrService.getPendingDocuments(JOB_CONFIG.batchSize);

      for (const doc of pendingDocs) {
        // Skip if already in queue
        if (this.processingQueue.some(item => item.documentId === doc.id)) {
          continue;
        }

        try {
          await this.processDocument({
            documentId: doc.id,
            userId: doc.userId,
            attempts: 0,
          });
          this.processedCount++;
        } catch (error) {
          this.errorCount++;
          console.error(`[DocumentProcessingJob] Error processing ${doc.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[DocumentProcessingJob] Error fetching pending documents:', error);
    }
  }

  /**
   * Process a single document
   */
  private async processDocument(item: QueueItem): Promise<void> {
    console.info(`[DocumentProcessingJob] Processing document ${item.documentId}`);

    // Process with OCR
    const result = await ocrService.processDocument(item.documentId);

    // Send notification to user
    await this.notifyUser(item, result);

    console.info(
      `[DocumentProcessingJob] Completed ${item.documentId} - ` +
      `Status: ${result.status}, Confidence: ${result.overallConfidence}%`
    );
  }

  /**
   * Handle processing error with retry logic
   */
  private async handleProcessingError(item: QueueItem, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    item.attempts++;
    item.lastAttempt = new Date();
    item.error = errorMessage;

    console.error(
      `[DocumentProcessingJob] Error processing ${item.documentId} ` +
      `(attempt ${item.attempts}/${JOB_CONFIG.retryAttempts}):`,
      errorMessage
    );

    // Retry if under limit
    if (item.attempts < JOB_CONFIG.retryAttempts) {
      // Add back to queue with delay
      setTimeout(() => {
        this.processingQueue.push(item);
      }, JOB_CONFIG.retryDelay);
    } else {
      // Max retries reached - send failure notification
      this.errorCount++;
      await this.notifyUserOfFailure(item, errorMessage);
    }
  }

  /**
   * Notify user of OCR completion
   */
  private async notifyUser(item: QueueItem, result: OCRResult): Promise<void> {
    try {
      const notificationData = {
        userId: item.userId,
        type: 'document_processed' as const,
        title: this.getNotificationTitle(result),
        message: this.getNotificationMessage(result),
        data: {
          documentId: item.documentId,
          status: result.status,
          confidence: result.overallConfidence,
          documentType: result.documentType,
        },
      };

      // Use notification service if available
      if (notificationService && typeof notificationService.sendNotification === 'function') {
        await notificationService.sendNotification(notificationData);
      } else {
        console.info('[DocumentProcessingJob] Notification:', notificationData);
      }
    } catch (error) {
      console.error('[DocumentProcessingJob] Error sending notification:', error);
    }
  }

  /**
   * Notify user of processing failure
   */
  private async notifyUserOfFailure(item: QueueItem, error: string): Promise<void> {
    try {
      const notificationData = {
        userId: item.userId,
        type: 'document_error' as const,
        title: 'Document Processing Failed',
        message: `We couldn't process your document. Please try uploading again or contact support.`,
        data: {
          documentId: item.documentId,
          error,
        },
      };

      if (notificationService && typeof notificationService.sendNotification === 'function') {
        await notificationService.sendNotification(notificationData);
      } else {
        console.info('[DocumentProcessingJob] Failure notification:', notificationData);
      }
    } catch (error) {
      console.error('[DocumentProcessingJob] Error sending failure notification:', error);
    }
  }

  /**
   * Get notification title based on result
   */
  private getNotificationTitle(result: OCRResult): string {
    switch (result.status) {
      case 'completed':
        return 'Document Processed Successfully';
      case 'requires_review':
        return 'Document Needs Review';
      case 'failed':
        return 'Document Processing Failed';
      default:
        return 'Document Processing Update';
    }
  }

  /**
   * Get notification message based on result
   */
  private getNotificationMessage(result: OCRResult): string {
    const docType = this.getDocumentTypeLabel(result.documentType);

    switch (result.status) {
      case 'completed':
        return `Your ${docType} has been processed with ${result.overallConfidence}% confidence. ` +
               `Data has been extracted and is ready for use.`;
      case 'requires_review':
        return `Your ${docType} has been processed but requires manual review. ` +
               `Please verify the extracted information.`;
      case 'failed':
        return `We couldn't process your ${docType}. ` +
               `Please ensure the document is clear and try uploading again.`;
      default:
        return `Your ${docType} is being processed.`;
    }
  }

  /**
   * Get human-readable document type label
   */
  private getDocumentTypeLabel(type?: string): string {
    switch (type) {
      case 'w9':
        return 'W-9 form';
      case 'license':
        return 'license/ID';
      case 'certificate':
        return 'certificate';
      case 'contract':
        return 'contract';
      default:
        return 'document';
    }
  }
}

/**
 * Auto-populate service for extracted data
 */
export class AutoPopulateService {
  /**
   * Auto-populate business form from W-9 data
   */
  static async populateBusinessFromW9(
    documentId: string,
    businessId: string
  ): Promise<Record<string, unknown>> {
    const ocrResult = await ocrService.getOCRResult(documentId);

    if (!ocrResult || ocrResult.documentType !== 'w9' || !ocrResult.structuredData) {
      throw new Error('W-9 data not available');
    }

    const w9Data = ocrResult.structuredData as {
      businessName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      ein?: string;
    };

    // Return data that can be used to update business record
    return {
      name: w9Data.businessName,
      ein: w9Data.ein,
      primaryAddress: {
        street1: w9Data.address,
        city: w9Data.city,
        state: w9Data.state,
        zipCode: w9Data.zipCode,
      },
      ocrSource: {
        documentId,
        confidence: ocrResult.overallConfidence,
        extractedAt: ocrResult.processedAt,
      },
    };
  }

  /**
   * Auto-populate employee form from license data
   */
  static async populateEmployeeFromLicense(
    documentId: string,
    employeeId?: string
  ): Promise<Record<string, unknown>> {
    const ocrResult = await ocrService.getOCRResult(documentId);

    if (!ocrResult || ocrResult.documentType !== 'license' || !ocrResult.structuredData) {
      throw new Error('License data not available');
    }

    const licenseData = ocrResult.structuredData as {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      fullName?: string;
      dateOfBirth?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      idNumber?: string;
      expirationDate?: string;
    };

    // Return data that can be used to update employee record
    return {
      firstName: licenseData.firstName,
      lastName: licenseData.lastName,
      middleName: licenseData.middleName,
      dateOfBirth: licenseData.dateOfBirth,
      residentialAddress: {
        street1: licenseData.address,
        city: licenseData.city,
        state: licenseData.state,
        zipCode: licenseData.zipCode,
      },
      identificationNumber: licenseData.idNumber,
      identificationExpiry: licenseData.expirationDate,
      ocrSource: {
        documentId,
        confidence: ocrResult.overallConfidence,
        extractedAt: ocrResult.processedAt,
      },
    };
  }

  /**
   * Get suggested auto-population based on document type
   */
  static async getSuggestedPopulation(documentId: string): Promise<{
    documentType: string;
    canPopulate: 'business' | 'employee' | 'none';
    confidence: number;
    fields: Record<string, unknown>;
  }> {
    const ocrResult = await ocrService.getOCRResult(documentId);

    if (!ocrResult || ocrResult.status === 'failed') {
      return {
        documentType: 'unknown',
        canPopulate: 'none',
        confidence: 0,
        fields: {},
      };
    }

    switch (ocrResult.documentType) {
      case 'w9':
        return {
          documentType: 'w9',
          canPopulate: 'business',
          confidence: ocrResult.overallConfidence,
          fields: await this.populateBusinessFromW9(documentId, ''),
        };

      case 'license':
        return {
          documentType: 'license',
          canPopulate: 'employee',
          confidence: ocrResult.overallConfidence,
          fields: await this.populateEmployeeFromLicense(documentId),
        };

      default:
        return {
          documentType: ocrResult.documentType ?? 'unknown',
          canPopulate: 'none',
          confidence: ocrResult.overallConfidence,
          fields: ocrResult.structuredData ?? {},
        };
    }
  }
}

// Export singleton instance
export const documentProcessingJobManager = new DocumentProcessingJobManager();
export const autoPopulateService = AutoPopulateService;

