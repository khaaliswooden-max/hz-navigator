import { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { ProgressBar, UploadProgress } from '../Common/ProgressBar';
import { Button } from '../Common/Button';

import type {
  DocumentCategory,
  UploadFileState,
  AllowedFileType,
} from '../../types/document';

import {
  CATEGORY_LABELS,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  getAcceptString,
  validateFile,
  formatFileSize,
  createUploadFileState,
  isImageType,
  getFileExtension,
} from '../../types/document';

import { uploadDocument } from '../../services/documentService';

interface FileUploadProps {
  /** Document category for uploaded files */
  category?: DocumentCategory;
  /** Business ID to associate documents with */
  businessId?: string;
  /** Allow multiple file uploads */
  multiple?: boolean;
  /** Maximum number of files (when multiple) */
  maxFiles?: number;
  /** Custom file types to accept (subset of allowed) */
  acceptTypes?: AllowedFileType[];
  /** Callback when upload completes */
  onUploadComplete?: (documentIds: string[]) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error, file: File) => void;
  /** Callback when files are selected */
  onFilesSelected?: (files: File[]) => void;
  /** Show category selector */
  showCategorySelector?: boolean;
  /** Additional description text */
  description?: string;
  /** Custom class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Compact variant */
  compact?: boolean;
}

/**
 * FileUpload - Drag-and-drop file upload component
 * 
 * Features:
 * - Drag-and-drop zone
 * - Click to browse
 * - File type validation
 * - Size limit (10MB)
 * - Multiple file support
 * - Progress bar
 * - Preview thumbnails
 */
export function FileUpload({
  category: initialCategory,
  businessId,
  multiple = true,
  maxFiles = 10,
  acceptTypes,
  onUploadComplete,
  onUploadError,
  onFilesSelected,
  showCategorySelector = false,
  description,
  className,
  disabled = false,
  compact = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadFileState[]>([]);
  const [category, setCategory] = useState<DocumentCategory>(initialCategory ?? 'miscellaneous');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  // Accept string based on props
  const acceptString = acceptTypes
    ? acceptTypes.map(t => `.${t}`).join(',')
    : getAcceptString();

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  /**
   * Handle file selection from input or drop
   */
  const handleFilesAdded = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: UploadFileState[] = [];
    const errors: string[] = [];

    // Validate each file
    for (const file of fileArray) {
      // Check max files limit
      if (validFiles.length + files.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Check if file type is in acceptTypes (if specified)
      if (acceptTypes) {
        const ext = getFileExtension(file.name) as AllowedFileType;
        if (!acceptTypes.includes(ext)) {
          errors.push(`${file.name}: File type not accepted`);
          continue;
        }
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      validFiles.push(createUploadFileState(file));
    }

    if (errors.length > 0) {
      console.warn('File validation errors:', errors);
    }

    if (validFiles.length > 0) {
      setFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
      onFilesSelected?.(validFiles.map(f => f.file));
    }
  }, [files.length, maxFiles, multiple, acceptTypes, onFilesSelected]);

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFilesAdded(droppedFiles);
    }
  }, [disabled, handleFilesAdded]);

  /**
   * Handle click to browse
   */
  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
      // Reset input value to allow re-selecting same file
      e.target.value = '';
    }
  }, [handleFilesAdded]);

  /**
   * Remove file from queue
   */
  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  /**
   * Upload all files
   */
  const handleUploadAll = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const uploadedIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const fileState = files[i];
      if (fileState.status !== 'queued') continue;

      // Update status to uploading
      setFiles(prev => prev.map(f =>
        f.id === fileState.id ? { ...f, status: 'uploading' as const } : f
      ));

      try {
        const document = await uploadDocument(
          fileState.file,
          { category, businessId },
          (progress) => {
            setFiles(prev => prev.map(f =>
              f.id === fileState.id ? { ...f, progress } : f
            ));
          }
        );

        uploadedIds.push(document.id);

        // Update status to complete
        setFiles(prev => prev.map(f =>
          f.id === fileState.id
            ? { ...f, status: 'complete' as const, progress: 100, documentId: document.id }
            : f
        ));
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Upload failed');
        
        // Update status to error
        setFiles(prev => prev.map(f =>
          f.id === fileState.id
            ? { ...f, status: 'error' as const, error: err.message }
            : f
        ));

        onUploadError?.(err, fileState.file);
      }
    }

    setIsUploading(false);

    if (uploadedIds.length > 0) {
      onUploadComplete?.(uploadedIds);
    }
  }, [files, isUploading, category, businessId, onUploadComplete, onUploadError]);

  /**
   * Cancel upload for a file
   */
  const handleCancelUpload = useCallback((fileId: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId && f.status === 'uploading'
        ? { ...f, status: 'cancelled' as const }
        : f
    ));
  }, []);

  /**
   * Retry failed upload
   */
  const handleRetryUpload = useCallback(async (fileId: string) => {
    const fileState = files.find(f => f.id === fileId);
    if (!fileState || fileState.status !== 'error') return;

    // Reset to queued and trigger upload
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'queued' as const, error: undefined, progress: 0 } : f
    ));
  }, [files]);

  /**
   * Clear all files
   */
  const handleClearAll = useCallback(() => {
    files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
  }, [files]);

  // Calculate stats
  const queuedCount = files.filter(f => f.status === 'queued').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const completeCount = files.filter(f => f.status === 'complete').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Category Selector */}
      {showCategorySelector && (
        <div>
          <label htmlFor="upload-category" className="label">
            Document Category
          </label>
          <select
            id="upload-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="input"
            disabled={disabled || isUploading}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={clsx(
          'relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer',
          'hover:border-hubzone-400 hover:bg-hubzone-50/50',
          'focus-within:ring-2 focus-within:ring-hubzone-500 focus-within:ring-offset-2',
          compact ? 'p-4' : 'p-8',
          isDragging && 'border-hubzone-500 bg-hubzone-50 scale-[1.02]',
          disabled && 'opacity-50 cursor-not-allowed hover:border-gray-300 hover:bg-transparent',
          !isDragging && !disabled && 'border-gray-300 bg-white'
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        aria-label="Upload files"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleInputChange}
          className="sr-only"
          disabled={disabled}
          aria-hidden="true"
        />

        {/* Drop Zone Content */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* Icon */}
          <div className={clsx(
            'rounded-full p-4 mb-4 transition-colors',
            isDragging ? 'bg-hubzone-100' : 'bg-gray-100'
          )}>
            <svg
              className={clsx(
                'w-10 h-10 transition-colors',
                isDragging ? 'text-hubzone-600' : 'text-gray-400'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <p className={clsx(
              'font-semibold',
              isDragging ? 'text-hubzone-700' : 'text-gray-700'
            )}>
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500">
              or <span className="text-hubzone-600 font-medium hover:text-hubzone-700">browse</span> to upload
            </p>
            {description && (
              <p className="text-sm text-gray-500 mt-2">{description}</p>
            )}
          </div>

          {/* File Type Info */}
          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-400">
              Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
            </p>
            <p className="text-xs text-gray-400">
              Maximum {formatFileSize(MAX_FILE_SIZE)} per file
              {multiple && ` • Up to ${maxFiles} files`}
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {/* Summary Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {files.length} file{files.length !== 1 ? 's' : ''} ({formatFileSize(totalSize)})
            </p>
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <span className="text-xs text-red-600">
                  {errorCount} failed
                </span>
              )}
              {completeCount > 0 && (
                <span className="text-xs text-verified-600">
                  {completeCount} uploaded
                </span>
              )}
              {(queuedCount > 0 || uploadingCount > 0) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearAll}
                  disabled={isUploading}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* File Items */}
          <div className="space-y-2">
            {files.map((fileState) => (
              <FileItem
                key={fileState.id}
                fileState={fileState}
                onRemove={handleRemoveFile}
                onCancel={handleCancelUpload}
                onRetry={handleRetryUpload}
              />
            ))}
          </div>

          {/* Upload Button */}
          {queuedCount > 0 && (
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleUploadAll}
                loading={isUploading}
                loadingText="Uploading..."
                disabled={disabled}
              >
                Upload {queuedCount} file{queuedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual file item in the upload queue
 */
function FileItem({
  fileState,
  onRemove,
  onCancel,
  onRetry,
}: {
  fileState: UploadFileState;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const { id, file, progress, status, error, previewUrl } = fileState;
  const isImage = isImageType(getFileExtension(file.name));

  return (
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
      status === 'error' && 'border-red-200 bg-red-50',
      status === 'complete' && 'border-verified-200 bg-verified-50',
      status !== 'error' && status !== 'complete' && 'border-gray-200 bg-white'
    )}>
      {/* Thumbnail / Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileTypeIcon fileType={getFileExtension(file.name) as AllowedFileType} />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>

        {/* Progress Bar */}
        {status === 'uploading' && (
          <div className="mt-2">
            <ProgressBar value={progress} size="sm" color="primary" />
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-2">
        {/* Status Icon */}
        {status === 'complete' && (
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-verified-100 text-verified-600 flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}

        {/* Actions */}
        {status === 'queued' && (
          <button
            onClick={() => onRemove(id)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            aria-label="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {status === 'uploading' && (
          <button
            onClick={() => onCancel(id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label="Cancel upload"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={() => onRetry(id)}
            className="p-1.5 text-hubzone-600 hover:text-hubzone-700 hover:bg-hubzone-50 rounded transition-colors"
            aria-label="Retry upload"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * File type icon component
 */
function FileTypeIcon({ fileType }: { fileType: AllowedFileType | string }) {
  const type = fileType.toLowerCase();

  const iconColor = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    xls: 'text-green-500',
    xlsx: 'text-green-500',
    jpg: 'text-purple-500',
    jpeg: 'text-purple-500',
    png: 'text-purple-500',
  }[type] ?? 'text-gray-500';

  if (['jpg', 'jpeg', 'png'].includes(type)) {
    return (
      <svg className={clsx('w-6 h-6', iconColor)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  if (['xls', 'xlsx'].includes(type)) {
    return (
      <svg className={clsx('w-6 h-6', iconColor)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    );
  }

  // Default document icon (PDF, DOC, DOCX)
  return (
    <svg className={clsx('w-6 h-6', iconColor)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export default FileUpload;

