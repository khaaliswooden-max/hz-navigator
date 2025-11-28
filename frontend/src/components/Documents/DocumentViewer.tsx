import { useState, useEffect, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { Button, IconButton } from '../Common/Button';
import { LoadingSpinner } from '../Common/LoadingSpinner';

import { getDownloadUrl, downloadDocument } from '../../services/documentService';
import { generateShareLink } from '../../services/documentService';

import type { Document } from '../../types/document';
import { formatFileSize, isImageType } from '../../types/document';

interface DocumentViewerProps {
  /** Document to view */
  document: Document | null;
  /** Whether the viewer is open */
  isOpen: boolean;
  /** Callback when viewer is closed */
  onClose: () => void;
  /** Callback when document is deleted */
  onDelete?: (document: Document) => void;
  /** Additional class name */
  className?: string;
}

/**
 * DocumentViewer - Modal viewer for documents
 * 
 * Features:
 * - In-browser PDF viewer
 * - Image viewer with zoom
 * - Download, print, share buttons
 * - Document metadata display
 */
export function DocumentViewer({
  document,
  isOpen,
  onClose,
  onDelete,
  className,
}: DocumentViewerProps) {
  // className is reserved for future use with the modal wrapper
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load document preview URL
  useEffect(() => {
    if (!document || !isOpen) return;

    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    loadPreview();
  }, [document?.id, isOpen]);

  const loadPreview = async () => {
    if (!document) return;

    try {
      const { downloadUrl } = await getDownloadUrl(document.id);
      setPreviewUrl(downloadUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        setZoom(100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDownload = useCallback(async () => {
    if (!document) return;
    await downloadDocument(document);
  }, [document]);

  const handlePrint = useCallback(() => {
    if (previewUrl) {
      const printWindow = window.open(previewUrl, '_blank');
      printWindow?.print();
    }
  }, [previewUrl]);

  const handleShare = useCallback(async () => {
    if (!document) return;

    try {
      const { shareUrl: url } = await generateShareLink(document.id, 60); // 60 minute expiry
      setShareUrl(url);
      setShowShareModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    }
  }, [document]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = window.document.createElement('textarea');
      textArea.value = shareUrl;
      window.document.body.appendChild(textArea);
      textArea.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [shareUrl]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 50));
  }, []);

  const handleDelete = useCallback(() => {
    if (document && onDelete) {
      onDelete(document);
      onClose();
    }
  }, [document, onDelete, onClose]);

  if (!isOpen || !document) return null;

  const isImage = isImageType(document.fileType);
  const isPdf = document.fileType === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-gray-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
          <div>
            <h2 className="text-white font-medium truncate max-w-md" title={document.originalFilename}>
              {document.originalFilename}
            </h2>
            <p className="text-gray-400 text-sm">
              {formatFileSize(document.fileSize)} • {new Date(document.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Zoom controls (for images) */}
          {isImage && (
            <div className="flex items-center gap-1 px-2 border-r border-gray-700">
              <IconButton
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="text-white hover:bg-gray-700 disabled:opacity-50"
                aria-label="Zoom out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </IconButton>
              <span className="text-white text-sm w-12 text-center">{zoom}%</span>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="text-white hover:bg-gray-700 disabled:opacity-50"
                aria-label="Zoom in"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </IconButton>
            </div>
          )}

          {/* Action buttons */}
          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white hover:bg-gray-700"
            aria-label="Download"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </IconButton>

          {isPdf && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={handlePrint}
              className="text-white hover:bg-gray-700"
              aria-label="Print"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </IconButton>
          )}

          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="text-white hover:bg-gray-700"
            aria-label="Share"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </IconButton>

          {onDelete && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-white hover:bg-red-600"
              aria-label="Delete"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          )}
        </div>
      </header>

      {/* Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4"
      >
        {loading && (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner className="w-8 h-8 text-white" />
            <p className="text-gray-400">Loading document...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={loadPreview}>
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && previewUrl && (
          <>
            {isPdf ? (
              <iframe
                src={previewUrl}
                className="w-full h-full bg-white rounded-lg"
                title={document.originalFilename}
              />
            ) : isImage ? (
              <img
                src={previewUrl}
                alt={document.originalFilename}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom / 100})` }}
                draggable={false}
              />
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-700 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 mb-4">
                  Preview not available for this file type.
                </p>
                <Button variant="primary" onClick={handleDownload}>
                  Download to View
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Share Document
              </h3>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setShowShareModal(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Anyone with this link can view and download the document. Link expires in 1 hour.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={shareUrl ?? ''}
                readOnly
                className="input flex-1 text-sm"
              />
              <Button
                variant={copySuccess ? 'success' : 'primary'}
                size="sm"
                onClick={handleCopyLink}
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setShowShareModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline document preview for embedding in pages
 */
export function DocumentPreview({
  document,
  className,
  height = '400px',
}: {
  document: Document;
  className?: string;
  height?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreview();
  }, [document.id]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { downloadUrl } = await getDownloadUrl(document.id);
      setPreviewUrl(downloadUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const isImage = isImageType(document.fileType);
  const isPdf = document.fileType === 'pdf';

  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center bg-gray-100 rounded-lg', className)} style={{ height }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !previewUrl) {
    return (
      <div className={clsx('flex items-center justify-center bg-gray-100 rounded-lg', className)} style={{ height }}>
        <p className="text-gray-500">Preview unavailable</p>
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={previewUrl}
        className={clsx('w-full rounded-lg', className)}
        style={{ height }}
        title={document.originalFilename}
      />
    );
  }

  if (isImage) {
    return (
      <div className={clsx('flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden', className)} style={{ height }}>
        <img
          src={previewUrl}
          alt={document.originalFilename}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center justify-center bg-gray-100 rounded-lg', className)} style={{ height }}>
      <p className="text-gray-500">Preview not available for this file type</p>
    </div>
  );
}

export default DocumentViewer;

