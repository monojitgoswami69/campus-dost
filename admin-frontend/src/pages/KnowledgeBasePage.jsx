import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBytes, formatRelativeTime, formatDateTime, fetchWithStatus, cn } from "../utils/helpers";
import { api } from "../services/api";
import { Badge } from "../components/UI/Badge";
import { Input } from "../components/UI/Input";
import { Button } from "../components/UI/Button";
import { Modal } from "../components/UI/Modal";
import { ConfirmationModal } from "../components/UI/ConfirmationModal";
import { EmptyState } from "../components/UI/EmptyState";
import { FilePreview, FileTypeIcon, TypeBadge } from "../components/UI/FileComponents";
import { LoadingSpinner } from "../components/UI/LoadingSpinner";
import { useToast } from "../context/ToastContext";
import { useDebounce } from "../hooks/useHooks";
import {
  FileText,
  CheckCircle,
  HardDrive,
  Clock,
  Search,
  Download,
  Archive,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// --- Helper Components ---

// Skeleton for metric cards
function MetricCardSkeleton() {
  return (
    <div className="bg-white p-3 rounded-lg border border-neutral-200">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-neutral-100 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, colorClass, bgClass, index = 0, loading = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="bg-white p-3 rounded-lg border border-neutral-200"
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("p-2 rounded-lg", bgClass)}>
          <Icon className={cn("w-4 h-4", colorClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wide block">{title}</span>
          {loading ? (
            <div className="h-6 w-12 bg-neutral-100 rounded animate-pulse mt-1" />
          ) : (
            <span className="text-xl font-bold text-neutral-900 tracking-tight block">{value}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Combined Metrics Card for Mobile
function CombinedMetricsCard({ metrics, loading = false }) {
  return (
    <div className="sm:hidden bg-white rounded-lg border border-neutral-200 p-3">
      <div className="grid grid-cols-4 gap-1 sm:gap-2">
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto bg-blue-50 rounded-lg flex items-center justify-center mb-1">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
          </div>
          {loading ? (
            <div className="h-4 sm:h-6 w-6 sm:w-8 mx-auto bg-neutral-200 rounded animate-pulse mb-1" />
          ) : (
            <div className="text-sm sm:text-lg font-bold text-neutral-900">{metrics.total}</div>
          )}
          <div className="text-[7px] sm:text-[9px] text-neutral-500 whitespace-pre-line leading-tight">{"Total\nDocs"}</div>
        </div>
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto bg-green-50 rounded-lg flex items-center justify-center mb-1">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
          </div>
          {loading ? (
            <div className="h-4 sm:h-6 w-6 sm:w-8 mx-auto bg-neutral-200 rounded animate-pulse mb-1" />
          ) : (
            <div className="text-sm sm:text-lg font-bold text-neutral-900">{metrics.active}</div>
          )}
          <div className="text-[7px] sm:text-[9px] text-neutral-500 whitespace-pre-line leading-tight">{"Active\nDocs"}</div>
        </div>
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto bg-purple-50 rounded-lg flex items-center justify-center mb-1">
            <HardDrive className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
          </div>
          {loading ? (
            <div className="h-4 sm:h-6 w-8 sm:w-12 mx-auto bg-neutral-200 rounded animate-pulse mb-1" />
          ) : (
            <div className="text-sm sm:text-lg font-bold text-neutral-900 truncate">{metrics.storage}</div>
          )}
          <div className="text-[7px] sm:text-[9px] text-neutral-500 whitespace-pre-line leading-tight">{"Storage\nUsed"}</div>
        </div>
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto bg-yellow-50 rounded-lg flex items-center justify-center mb-1">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
          </div>
          {loading ? (
            <div className="h-4 sm:h-6 w-8 sm:w-12 mx-auto bg-neutral-200 rounded animate-pulse mb-1" />
          ) : (
            <div className="text-sm sm:text-lg font-bold text-neutral-900 truncate">
              {metrics.lastUpdated && metrics.lastUpdated !== 'Never' ? (() => {
                try {
                  const date = new Date(metrics.lastUpdated);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } catch {
                  return 'N/A';
                }
              })() : 'N/A'}
            </div>
          )}
          <div className="text-[7px] sm:text-[9px] text-neutral-500 whitespace-pre-line leading-tight">{"Last\nUpdated"}</div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function KnowledgeBasePage() {
  const { addToast, updateToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [serverStatus, setServerStatus] = useState('online');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Dashboard metrics from API
  const [dashboardMetrics, setDashboardMetrics] = useState({
    total: 0,
    active: 0,
    storage: '0.00 GB',
    lastUpdated: null,
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'single' or 'bulk'
    doc: null, // for single archive
  });

  // Start in "paint-first" mode; fetch hydrates after initial render
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Load dashboard stats from API
  const loadDashboardStats = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const response = await api.dashboard.getStats();
      const stats = response.stats || {};

      // Use pre-calculated total_size_bytes from metrics collection
      const totalSize = stats.total_size_bytes || 0;
      const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

      // Format last_updated - show exact date instead of relative time
      let lastUpdated = 'N/A';
      if (stats.last_updated) {
        try {
          const date = new Date(stats.last_updated);
          if (!isNaN(date.getTime())) {
            lastUpdated = date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
          }
        } catch (e) {
          console.error('Failed to parse last_updated:', e);
        }
      }

      setDashboardMetrics({
        total: stats.total_documents || 0,
        active: stats.active_documents || 0,
        storage: `${sizeInGB} GB`,
        lastUpdated: lastUpdated,
      });
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Load files from API
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.documents.list();

      // Transform API response to match expected format
      const docs = (response.documents || response || []).map((doc, i) => {
        const name = doc.filename || doc.name || 'Unknown';
        const ext = name.split('.').pop().toLowerCase();

        // Determine type category for icon styling
        let type = 'default';
        if (ext === 'pdf') type = 'pdf';
        else if (['doc', 'docx'].includes(ext)) type = 'docx';
        else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'xlsx';
        else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) type = 'image';
        else if (['txt', 'md'].includes(ext)) type = 'text';

        return {
          id: doc.id || doc.document_id || `doc-${i}`,
          name: name,
          description: doc.description || doc.metadata?.description || '',
          type: type,
          ext: ext,
          size: doc.size || doc.file_size || 0,
          uploadDate: doc.uploaded_at || doc.created_at || new Date().toISOString(),
          lastUsed: doc.last_accessed || doc.updated_at || doc.uploaded_at,
          status: doc.status || 'active',
          download_url: doc.download_url,
          source: 'api',
          chunks: doc.chunks || doc.chunk_count || 0,
        };
      });

      setDocuments(docs);
      setServerStatus('online');
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError('Failed to load documents');
      setServerStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadDashboardStats();
  }, [loadDocuments, loadDashboardStats]);

  // Listen for data changes from operations (upload, archive, restore)
  useEffect(() => {
    const handleDataChange = (e) => {
      const changeType = e.detail?.type;
      if (changeType === 'upload' || changeType === 'archive' || changeType === 'restore') {
        // Refetch documents and stats when data changes
        loadDocuments();
        loadDashboardStats();
      }
    };

    const handleRefresh = () => {
      loadDocuments();
      loadDashboardStats();
    };

    window.addEventListener('data-changed', handleDataChange);
    window.addEventListener('refresh:knowledge-base', handleRefresh);
    return () => {
      window.removeEventListener('data-changed', handleDataChange);
      window.removeEventListener('refresh:knowledge-base', handleRefresh);
    };
  }, [loadDocuments, loadDashboardStats]);

  // Filter logic
  const filteredDocs = useMemo(() => {
    let docs = documents;

    if (debouncedSearch) {
      docs = docs.filter((doc) =>
        doc.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        doc.description.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    return docs;
  }, [debouncedSearch, documents]);



  // Use dashboard metrics from API - lastUpdated is already formatted
  const metrics = useMemo(() => {
    return {
      total: dashboardMetrics.total,
      active: dashboardMetrics.active,
      storage: dashboardMetrics.storage,
      lastUpdated: dashboardMetrics.lastUpdated || 'Never',
    };
  }, [dashboardMetrics]);

  const handleDelete = async (doc) => {
    try {
      await api.documents.delete(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      loadDashboardStats(); // Refresh metrics
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Open confirmation modal for single archive
  const handleArchiveClick = (doc) => {
    setConfirmModal({
      isOpen: true,
      type: 'single',
      doc: doc,
    });
  };

  // Execute single archive after confirmation
  const handleArchiveConfirm = async () => {
    const fileName = confirmModal.doc?.name || 'file';

    closeConfirmModal();

    // Show toast notification
    const toastId = addToast({
      action: 'Archiving',
      fileName: fileName,
      status: 'processing',
      progress: 0,
    });

    try {
      updateToast(toastId, { status: 'processing', progress: 30 });

      if (confirmModal.doc) {
        await api.documents.archive(confirmModal.doc.id);
        setDocuments(prev => prev.filter(d => d.id !== confirmModal.doc.id));
        
        // Update metrics locally
        setDashboardMetrics(prev => ({
          ...prev,
          active: Math.max(0, prev.active - 1)
        }));
      }

      loadDashboardStats(); // Refresh metrics from server to be sure
      updateToast(toastId, {
        status: 'complete',
        action: 'Archived',
        progress: 100,
      });
    } catch (err) {
      console.error('Failed to archive document:', err);
      updateToast(toastId, {
        status: 'error',
        action: 'Archive failed',
        message: err.message || 'Archive failed. Please try again.',
      });
    }
  };

  // Close confirmation modal
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, doc: null });
  };

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    // Check if all documents (across all pages) are selected
    const allSelected = filteredDocs.length > 0 &&
      filteredDocs.every(d => selectedIds.has(d.id));

    if (allSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all documents across all pages
      setSelectedIds(new Set(filteredDocs.map(d => d.id)));
    }
  };

  // Open confirmation modal for bulk archive
  const handleBulkArchiveClick = () => {
    setConfirmModal({
      isOpen: true,
      type: 'bulk',
      doc: null,
    });
  };

  // Execute bulk archive after confirmation
  const handleBulkArchiveConfirm = async () => {
    const totalFiles = selectedIds.size;

    closeConfirmModal();

    let currentFileName = '';
    let maxFileNameLength = 0;
    const docsToArchive = documents.filter(d => selectedIds.has(d.id));
    maxFileNameLength = Math.max(...docsToArchive.map(d => d.name?.length || 0));
    currentFileName = docsToArchive[0]?.name || 'file';

    // Show toast notification for bulk operation
    const toastId = addToast({
      action: 'Archiving',
      fileName: currentFileName,
      status: 'processing',
      progress: 0,
      type: 'archive',
      bulkProgress: { current: 1, total: totalFiles },
      _maxFileNameLength: maxFileNameLength,
    });

    try {
      let completedCount = 0;

      // Archive each selected document sequentially with real-time updates
      for (const doc of docsToArchive) {
        await api.documents.archive(doc.id);
        completedCount++;
        
        // Remove from list in real-time
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(doc.id);
          return newSet;
        });
        
        // Update metrics locally in real-time
        setDashboardMetrics(prev => ({
          ...prev,
          active: Math.max(0, prev.active - 1)
        }));
        
        // Update to next file
        if (completedCount < totalFiles && docsToArchive[completedCount]) {
          currentFileName = docsToArchive[completedCount].name;
        }
        
        updateToast(toastId, {
          status: 'processing',
          progress: Math.floor((completedCount / totalFiles) * 100),
          fileName: currentFileName,
          bulkProgress: { current: completedCount + 1, total: totalFiles },
        });
      }

      loadDashboardStats(); // Refresh metrics
      updateToast(toastId, {
        status: 'complete',
        action: 'Archived',
        fileName: `${totalFiles} files`,
        progress: 100,
        bulkProgress: null,
      });
    } catch (err) {
      console.error('Failed to bulk archive:', err);
      updateToast(toastId, {
        status: 'error',
        action: 'Archive failed',
        message: err.message || 'Archive failed. Please try again.',
      });
    }
  };

  // Get selected file names for bulk confirmation
  const getSelectedFileNames = () => {
    return documents.filter(d => selectedIds.has(d.id)).map(d => d.name);
  };

  // Download a single document
  const handleDownload = async (doc) => {
    try {
      // Use the api service which handles auth properly
      const blob = await api.knowledgeBase.download(doc.id);

      // Create blob and download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Download failed. Please try again.');
    }
  };

  // Bulk download selected documents as ZIP
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;

    try {
      const documentIds = Array.from(selectedIds);
      const blob = await api.batchDownload(documentIds, 'knowledge-base');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documents_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk download failed:', err);
      alert('Download failed. Please try again.');
    }
  };

  const handleSaveDocument = async (doc, newContent) => {
    try {
      // The FilePreview component handles the delete and upload
      // Just reload the document list after edit
      await loadDocuments();
      await loadDashboardStats();
    } catch (err) {
      console.error('Failed to reload after edit:', err);
      throw err;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Sticky Header Section */}
      <div className="flex-shrink-0 space-y-3 mb-3 px-1">
        {/* Metrics - Combined on mobile, grid on desktop */}
        <CombinedMetricsCard metrics={metrics} loading={metricsLoading} />

        {/* Metrics Grid - Desktop only */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Documents"
          value={metrics.total}
          icon={FileText}
          bgClass="bg-blue-50"
          colorClass="text-blue-600"
          index={0}
          loading={metricsLoading}
        />
        <MetricCard
          title="Active Documents"
          value={metrics.active}
          icon={CheckCircle}
          bgClass="bg-green-50"
          colorClass="text-green-600"
          index={1}
          loading={metricsLoading}
        />
        <MetricCard
          title="Storage Used"
          value={metrics.storage}
          icon={HardDrive}
          bgClass="bg-purple-50"
          colorClass="text-purple-600"
          index={2}
          loading={metricsLoading}
        />
        <MetricCard
          title="Last Updated"
          value={metrics.lastUpdated && metrics.lastUpdated !== 'Never' ? (() => {
            try {
              const date = new Date(metrics.lastUpdated);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } catch {
              return metrics.lastUpdated;
            }
          })() : 'Never'}
          icon={Clock}
          bgClass="bg-yellow-50"
          colorClass="text-yellow-600"
          index={3}
          loading={metricsLoading}
        />
      </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 bg-white border-2 border-neutral-300/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 placeholder-neutral-400 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-1.5 sm:gap-2 justify-center sm:justify-start flex-wrap">
            <button
              onClick={handleBulkArchiveClick}
              disabled={selectedIds.size === 0}
              className={cn(
                "px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 min-h-[36px]",
                selectedIds.size > 0
                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                  : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
              )}
            >
              <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Archive</span> {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
            <button
              onClick={handleBulkDownload}
              disabled={selectedIds.size === 0}
              className={cn(
                "px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 min-h-[36px]",
                selectedIds.size > 0
                  ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
              )}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Download</span> {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
            <button
              onClick={() => { loadDocuments(); loadDashboardStats(); }}
              disabled={loading || metricsLoading}
              className="hidden lg:flex p-1.5 sm:p-2 rounded-lg text-sm font-medium transition-colors bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", (loading || metricsLoading) && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section - fits to screen with internal scrolling */}
      <div className="flex-1 min-h-0 px-0.5 sm:px-1">
        {/* Table */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden h-full flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-fixed min-w-[280px]">
              {filteredDocs.length > 0 && (
                <thead className="sticky top-0 z-10 bg-neutral-50">
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="w-8 xs:w-10 sm:w-12 pl-2 xs:pl-3 sm:pl-4 pr-1 sm:pr-2 py-2 text-center align-middle">
                      <div className="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          className="rounded border-neutral-300 text-primary-600 w-3.5 h-3.5 sm:w-4 sm:h-4"
                          checked={filteredDocs.length > 0 && filteredDocs.every(d => selectedIds.has(d.id))}
                          onChange={toggleAll}
                        />
                        <span className="text-[7px] xs:text-[8px] sm:text-[9px] font-medium text-neutral-400 uppercase">All</span>
                      </div>
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Document</th>
                    <th className="hidden md:table-cell w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Type</th>
                    <th className="hidden lg:table-cell w-20 sm:w-24 px-2 sm:px-3 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Size</th>
                    <th className="hidden lg:table-cell w-24 sm:w-28 px-2 sm:px-3 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Added On</th>
                    <th className="w-[90px] xs:w-[110px] sm:w-[130px] md:w-[180px] pl-2 sm:pl-3 pr-2 xs:pr-3 sm:pr-4 md:pr-10 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Actions</th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-neutral-100">
                {!loading && filteredDocs.map((doc, index) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={cn("hover:bg-neutral-50 transition-colors", selectedIds.has(doc.id) && "bg-primary-50")}
                  >
                    <td className={cn("w-8 xs:w-10 sm:w-12 pl-2 xs:pl-3 sm:pl-4 pr-1 sm:pr-2 py-2 sm:py-3 text-center align-middle", selectedIds.has(doc.id) && "border-l-2 border-l-primary-500")}>
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300 text-primary-600 w-3.5 h-3.5 sm:w-4 sm:h-4"
                        checked={selectedIds.has(doc.id)}
                        onChange={() => toggleSelection(doc.id)}
                      />
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle">
                      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
                        <div className="flex-shrink-0 hidden sm:block">
                          <FileTypeIcon ext={doc.ext} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="font-medium sm:font-semibold text-neutral-900 hover:text-blue-600 text-left transition-colors text-xs sm:text-sm break-words w-full line-clamp-2"
                            title={doc.name}
                          >
                            {doc.name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-3 text-center align-middle">
                      <TypeBadge ext={doc.ext} />
                    </td>
                    <td className="hidden lg:table-cell w-20 sm:w-24 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-neutral-600 text-center align-middle">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="hidden lg:table-cell w-24 sm:w-28 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-neutral-600 text-center align-middle">
                      {(() => {
                        const date = new Date(doc.uploadDate);
                        const month = date.toLocaleDateString('en-US', { month: 'short' });
                        const day = date.getDate();
                        const year = date.getFullYear();
                        return <span className="whitespace-pre-line">{`${month} ${day}\n${year}`}</span>;
                      })()}
                    </td>
                    <td className="w-[90px] xs:w-[110px] sm:w-[130px] md:w-[180px] pl-2 sm:pl-3 pr-2 xs:pr-3 sm:pr-4 md:pr-10 py-2 sm:py-3 align-middle">
                      <div className="flex items-center justify-center gap-1 flex-nowrap">
                        <button
                          onClick={() => handleArchiveClick(doc)}
                          className="px-2 sm:px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors"
                        >
                          <span className="hidden sm:inline">Archive</span>
                          <Archive className="sm:hidden w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="px-2 sm:px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                        >
                          <span className="hidden sm:inline">Download</span>
                          <Download className="sm:hidden w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}

                {filteredDocs.length === 0 && !loading && (
                  <tr className="h-full">
                    <td colSpan="6" className="h-full">
                      <div className="flex flex-col items-center justify-center text-center text-neutral-500 min-h-[400px]">
                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                          <Search className="w-6 h-6 text-neutral-400" />
                        </div>
                        <p className="font-medium">No documents found</p>
                        <p className="text-sm mt-1">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-neutral-500">
                      <LoadingSpinner text="Loading documents..." />
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <FilePreview
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
            onSave={handleSaveDocument}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.type === 'bulk' ? handleBulkArchiveConfirm : handleArchiveConfirm}
        title={confirmModal.type === 'bulk' ? 'Archive Selected Documents' : 'Archive Document'}
        message={
          confirmModal.type === 'bulk'
            ? `Are you sure you want to archive ${selectedIds.size} document${selectedIds.size > 1 ? 's' : ''}? They will be moved to the archive.`
            : `Are you sure you want to archive "${confirmModal.doc?.name}"? It will be moved to the archive.`
        }
        actionType="archive"
        confirmLabel="Archive"
        itemNames={confirmModal.type === 'bulk' ? getSelectedFileNames() : []}
      />
    </motion.div>
  );
}
