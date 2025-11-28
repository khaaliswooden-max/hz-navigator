import { useState, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Button, IconButton, ButtonGroup } from '../../components/Common/Button';
import { LoadingSpinner } from '../../components/Common/LoadingSpinner';
import { SearchInput } from '../../components/Common/DebouncedInput';
import { EmptyState } from '../../components/Common/EmptyState';
import { DocumentCard, CategoryBadge } from '../../components/Documents/DocumentCard';
import { DocumentViewer } from '../../components/Documents/DocumentViewer';
import { FileUpload } from '../../components/Documents/FileUpload';

import {
  getDocuments,
  deleteDocument,
  downloadDocument,
  bulkDownload,
  bulkDelete,
  bulkUpdateCategory,
  searchDocuments,
} from '../../services/documentService';

import type { Document, DocumentCategory, DocumentFilters, AllowedFileType } from '../../types/document';
import { CATEGORY_LABELS, ALLOWED_EXTENSIONS, formatFileSize } from '../../types/document';

type ViewMode = 'grid' | 'list';
type SortOption = 'uploadedAt' | 'filename' | 'fileSize' | 'category';

/**
 * Document Library Page
 * 
 * Features:
 * - Grid/list view toggle
 * - Filter by category, date, business, file type
 * - Search by filename or content
 * - Bulk actions
 * - Document expiration tracking
 */
export default function Library() {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 24;

  // Filters
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Modals
  const [viewerDocument, setViewerDocument] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'category' | 'download' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('miscellaneous');

  // Loading states
  const [bulkLoading, setBulkLoading] = useState(false);

  // Load documents
  useEffect(() => {
    loadDocuments();
  }, [page, filters]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getDocuments({
        ...filters,
        page,
        limit,
        sortBy: filters.sortBy ?? 'uploadedAt',
        sortOrder: filters.sortOrder ?? 'desc',
      });

      setDocuments(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setPage(1);

    if (query.trim()) {
      setLoading(true);
      try {
        const response = await searchDocuments(query, {
          ...filters,
          page: 1,
          limit,
        });
        setDocuments(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    } else {
      loadDocuments();
    }
  }, [filters, limit]);

  // Filter handlers
  const handleFilterChange = useCallback((key: keyof DocumentFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setPage(1);
  }, []);

  // Selection handlers
  const handleSelectDocument = useCallback((document: Document, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(document.id);
      } else {
        next.delete(document.id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  }, [documents, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  // Document actions
  const handleView = useCallback((document: Document) => {
    setViewerDocument(document);
  }, []);

  const handleDownload = useCallback(async (document: Document) => {
    await downloadDocument(document);
  }, []);

  const handleDelete = useCallback(async (document: Document) => {
    if (!confirm(`Delete "${document.originalFilename}"?`)) return;

    try {
      await deleteDocument(document.id);
      setDocuments(prev => prev.filter(d => d.id !== document.id));
      setTotal(prev => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }, []);

  const handleShare = useCallback((document: Document) => {
    // Will be handled by viewer
    setViewerDocument(document);
  }, []);

  // Bulk actions
  const handleBulkDownload = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading(true);
    try {
      await bulkDownload(Array.from(selectedIds));
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download documents');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} documents?`)) return;

    setBulkLoading(true);
    try {
      await bulkDelete(Array.from(selectedIds));
      setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
      setTotal(prev => prev - selectedIds.size);
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete documents');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection]);

  const handleBulkCategoryChange = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading(true);
    try {
      await bulkUpdateCategory(Array.from(selectedIds), selectedCategory);
      // Refresh documents
      await loadDocuments();
      clearSelection();
      setBulkAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, selectedCategory, clearSelection]);

  // Stats
  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);
    const expiringSoon = documents.filter(d => {
      if (!d.metadata?.expiresAt) return false;
      const expires = new Date(d.metadata.expiresAt);
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return expires < soon && expires > new Date();
    }).length;
    const expired = documents.filter(d => {
      if (!d.metadata?.expiresAt) return false;
      return new Date(d.metadata.expiresAt) < new Date();
    }).length;

    return { totalSize, expiringSoon, expired };
  }, [documents]);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.category || filters.fileType || filters.uploadedAfter || filters.uploadedBefore || searchQuery);
  }, [filters, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {total} document{total !== 1 ? 's' : ''} • {formatFileSize(stats.totalSize)}
                  {stats.expiringSoon > 0 && (
                    <span className="text-amber-600 ml-2">
                      • {stats.expiringSoon} expiring soon
                    </span>
                  )}
                  {stats.expired > 0 && (
                    <span className="text-red-600 ml-2">
                      • {stats.expired} expired
                    </span>
                  )}
                </p>
              </div>

              <Button variant="primary" onClick={() => setShowUpload(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Documents
              </Button>
            </div>

            {/* Search and Filters Bar */}
            <div className="mt-4 flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <SearchInput
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search documents..."
                  debounceMs={300}
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {hasActiveFilters && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-hubzone-600 text-white text-xs rounded-full">
                    !
                  </span>
                )}
              </Button>

              {/* View Mode Toggle */}
              <ButtonGroup attached>
                <IconButton
                  variant={viewMode === 'grid' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </IconButton>
                <IconButton
                  variant={viewMode === 'list' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </IconButton>
              </ButtonGroup>

              {/* Selection Mode Toggle */}
              <Button
                variant={selectionMode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) clearSelection();
                }}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Select
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="py-4 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Category */}
                <div>
                  <label className="label text-xs">Category</label>
                  <select
                    value={filters.category ?? ''}
                    onChange={(e) => handleFilterChange('category', e.target.value as DocumentCategory)}
                    className="input text-sm py-2"
                  >
                    <option value="">All categories</option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* File Type */}
                <div>
                  <label className="label text-xs">File Type</label>
                  <select
                    value={filters.fileType ?? ''}
                    onChange={(e) => handleFilterChange('fileType', e.target.value as AllowedFileType)}
                    className="input text-sm py-2"
                  >
                    <option value="">All types</option>
                    {ALLOWED_EXTENSIONS.map(ext => (
                      <option key={ext} value={ext}>.{ext.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="label text-xs">From Date</label>
                  <input
                    type="date"
                    value={filters.uploadedAfter ?? ''}
                    onChange={(e) => handleFilterChange('uploadedAfter', e.target.value)}
                    className="input text-sm py-2"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="label text-xs">To Date</label>
                  <input
                    type="date"
                    value={filters.uploadedBefore ?? ''}
                    onChange={(e) => handleFilterChange('uploadedBefore', e.target.value)}
                    className="input text-sm py-2"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="label text-xs">Sort By</label>
                  <select
                    value={filters.sortBy ?? 'uploadedAt'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value as SortOption)}
                    className="input text-sm py-2"
                  >
                    <option value="uploadedAt">Date Uploaded</option>
                    <option value="filename">Filename</option>
                    <option value="fileSize">File Size</option>
                    <option value="category">Category</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="label text-xs">Order</label>
                  <select
                    value={filters.sortOrder ?? 'desc'}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                    className="input text-sm py-2"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Active filters:</span>
                  {filters.category && (
                    <CategoryBadge category={filters.category} size="sm" />
                  )}
                  {filters.fileType && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                      .{filters.fileType.toUpperCase()}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                      Search: "{searchQuery}"
                    </span>
                  )}
                  <Button variant="ghost" size="xs" onClick={clearFilters}>
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Selection Bar */}
          {selectionMode && selectedIds.size > 0 && (
            <div className="py-3 border-t border-gray-200 bg-hubzone-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === documents.length && documents.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-hubzone-600"
                    />
                    <span className="text-sm text-gray-700">
                      {selectedIds.size} selected
                    </span>
                  </label>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDownload}
                    loading={bulkLoading}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download ZIP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkAction('category')}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Change Category
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleBulkDelete}
                    loading={bulkLoading}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? 'No documents found' : 'No documents yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your filters or search query'
                : 'Upload your first document to get started'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setShowUpload(true)}>
                  Upload Documents
                </Button>
              )
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                viewMode="grid"
                selected={selectedIds.has(document.id)}
                onSelect={handleSelectDocument}
                onView={handleView}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onShare={handleShare}
                showCheckbox={selectionMode}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                viewMode="list"
                selected={selectedIds.has(document.id)}
                onSelect={handleSelectDocument}
                onView={handleView}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onShare={handleShare}
                showCheckbox={selectionMode}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {/* Document Viewer Modal */}
      <DocumentViewer
        document={viewerDocument}
        isOpen={viewerDocument !== null}
        onClose={() => setViewerDocument(null)}
        onDelete={handleDelete}
      />

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            <FileUpload
              showCategorySelector
              multiple
              maxFiles={10}
              onUploadComplete={(documentIds) => {
                setShowUpload(false);
                loadDocuments();
              }}
            />
          </div>
        </div>
      )}

      {/* Bulk Category Change Modal */}
      {bulkAction === 'category' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Change Category
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Move {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} to a different category.
            </p>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
              className="input w-full mb-4"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setBulkAction(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkCategoryChange}
                loading={bulkLoading}
              >
                Move Documents
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

