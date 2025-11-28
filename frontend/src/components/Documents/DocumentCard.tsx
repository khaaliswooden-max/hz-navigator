import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Button, IconButton } from '../Common/Button';

import type { Document, DocumentCategory } from '../../types/document';
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatFileSize,
  isImageType,
  getFileExtension,
} from '../../types/document';

interface DocumentCardProps {
  /** Document data */
  document: Document;
  /** Card view mode */
  viewMode?: 'grid' | 'list';
  /** Whether the card is selected */
  selected?: boolean;
  /** Callback when selection changes */
  onSelect?: (document: Document, selected: boolean) => void;
  /** Callback when view is clicked */
  onView?: (document: Document) => void;
  /** Callback when download is clicked */
  onDownload?: (document: Document) => void;
  /** Callback when delete is clicked */
  onDelete?: (document: Document) => void;
  /** Callback when share is clicked */
  onShare?: (document: Document) => void;
  /** Show checkbox for selection */
  showCheckbox?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * DocumentCard - Display a document with thumbnail and actions
 */
export function DocumentCard({
  document,
  viewMode = 'grid',
  selected = false,
  onSelect,
  onView,
  onDownload,
  onDelete,
  onShare,
  showCheckbox = false,
  className,
}: DocumentCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = isImageType(document.fileType);
  const uploadDate = new Date(document.uploadedAt);
  const isExpired = document.metadata?.expiresAt 
    ? new Date(document.metadata.expiresAt) < new Date()
    : false;
  const isExpiringSoon = document.metadata?.expiresAt
    ? new Date(document.metadata.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false;

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(document, e.target.checked);
  }, [document, onSelect]);

  const handleCardClick = useCallback(() => {
    if (showCheckbox) {
      onSelect?.(document, !selected);
    } else {
      onView?.(document);
    }
  }, [document, selected, showCheckbox, onSelect, onView]);

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div
        className={clsx(
          'group relative bg-white rounded-xl border transition-all duration-200 cursor-pointer',
          'hover:shadow-lg hover:border-hubzone-300',
          selected && 'ring-2 ring-hubzone-500 border-hubzone-500',
          isExpired && 'opacity-60',
          className
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Selection Checkbox */}
        {showCheckbox && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className={clsx(
                'w-5 h-5 rounded border-2 cursor-pointer transition-all',
                'text-hubzone-600 focus:ring-hubzone-500',
                selected || showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            />
          </div>
        )}

        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-gray-100 rounded-t-xl overflow-hidden">
          {isImage && !imageError ? (
            <img
              src={`/api/documents/${document.id}/thumbnail`}
              alt={document.originalFilename}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileTypeIcon fileType={document.fileType} size="lg" />
            </div>
          )}

          {/* Expiration Badge */}
          {isExpired && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
              Expired
            </div>
          )}
          {!isExpired && isExpiringSoon && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded">
              Expiring Soon
            </div>
          )}

          {/* Hover Actions */}
          <div className={clsx(
            'absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity',
            showActions ? 'opacity-100' : 'opacity-0'
          )}>
            <IconButton
              variant="primary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onView?.(document); }}
              aria-label="View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </IconButton>
            <IconButton
              variant="primary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDownload?.(document); }}
              aria-label="Download"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm font-medium text-gray-900 truncate mb-1" title={document.originalFilename}>
            {document.originalFilename}
          </p>
          <div className="flex items-center justify-between">
            <CategoryBadge category={document.category} size="sm" />
            <span className="text-xs text-gray-500">
              {formatFileSize(document.fileSize)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {uploadDate.toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      className={clsx(
        'group flex items-center gap-4 p-4 bg-white rounded-lg border transition-all duration-200',
        'hover:shadow-md hover:border-hubzone-300 cursor-pointer',
        selected && 'ring-2 ring-hubzone-500 border-hubzone-500',
        isExpired && 'opacity-60',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded border-2 cursor-pointer text-hubzone-600 focus:ring-hubzone-500"
        />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
        <FileTypeIcon fileType={document.fileType} size="md" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate" title={document.originalFilename}>
            {document.originalFilename}
          </p>
          {isExpired && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
              Expired
            </span>
          )}
          {!isExpired && isExpiringSoon && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
              Expiring Soon
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <CategoryBadge category={document.category} size="sm" />
          <span>{formatFileSize(document.fileSize)}</span>
          <span>{uploadDate.toLocaleDateString()}</span>
          <StatusBadge status={document.status} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onView?.(document); }}
          aria-label="View"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDownload?.(document); }}
          aria-label="Download"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onShare?.(document); }}
          aria-label="Share"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDelete?.(document); }}
          aria-label="Delete"
          className="hover:text-red-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}

/**
 * File Type Icon
 */
export function FileTypeIcon({ 
  fileType, 
  size = 'md' 
}: { 
  fileType: string; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const type = fileType.toLowerCase();

  const iconColor = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    xls: 'text-green-600',
    xlsx: 'text-green-600',
    jpg: 'text-purple-500',
    jpeg: 'text-purple-500',
    png: 'text-purple-500',
  }[type] ?? 'text-gray-500';

  if (['jpg', 'jpeg', 'png'].includes(type)) {
    return (
      <svg className={clsx(sizeClasses[size], iconColor)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  if (['xls', 'xlsx'].includes(type)) {
    return (
      <svg className={clsx(sizeClasses[size], iconColor)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }

  return (
    <svg className={clsx(sizeClasses[size], iconColor)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

/**
 * Category Badge
 */
export function CategoryBadge({ 
  category, 
  size = 'md' 
}: { 
  category: DocumentCategory;
  size?: 'sm' | 'md';
}) {
  const colors: Record<DocumentCategory, string> = {
    certification: 'bg-hubzone-100 text-hubzone-700',
    employee_verification: 'bg-blue-100 text-blue-700',
    ownership: 'bg-purple-100 text-purple-700',
    contract: 'bg-amber-100 text-amber-700',
    compliance_report: 'bg-verified-100 text-verified-700',
    miscellaneous: 'bg-gray-100 text-gray-700',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
  };

  return (
    <span className={clsx(
      'inline-flex items-center rounded font-medium',
      colors[category],
      sizeClasses[size]
    )}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/**
 * Status Badge
 */
function StatusBadge({ status }: { status: Document['status'] }) {
  const colors = {
    pending: 'bg-gray-100 text-gray-600',
    uploaded: 'bg-blue-100 text-blue-700',
    processing: 'bg-blue-100 text-blue-700',
    verified: 'bg-verified-100 text-verified-700',
    rejected: 'bg-red-100 text-red-700',
    archived: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
      colors[status]
    )}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default DocumentCard;

