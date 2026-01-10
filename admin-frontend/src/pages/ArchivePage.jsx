import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBytes, formatRelativeTime, formatDateTime, fetchWithStatus, cn } from "../utils/helpers";
import { useDebounce } from "../hooks/useHooks";
import { api } from "../services/api";
import { FilePreview, FileTypeIcon, TypeBadge } from "../components/UI/FileComponents";
import { ConfirmationModal } from "../components/UI/ConfirmationModal";
import { LoadingSpinner } from "../components/UI/LoadingSpinner";
import { useToast } from "../context/ToastContext";
import {
  Archive,
  Search,
  Download,
  Trash2,
  RotateCcw,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } }
};

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

// --- Main Page Component ---

export default function ArchivePage() {
  const { addToast, updateToast } = useToast();
  const [archiveFiles, setArchiveFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('online');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null, // 'delete' or 'restore'
    type: null,   // 'single' or 'bulk'
    file: null,   // for single operations
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Load archived files from API
  const loadArchiveFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.archive.list();
      
      // Transform API response to match expected format
      const files = (response.files || response || []).map((file, i) => {
        const name = file.filename || file.name || 'Unknown';
        const ext = name.split('.').pop().toLowerCase();
        return {
          id: file.id || file.archive_id || `arch-${i}`,
          name: name,
          ext: ext,
          size: file.size || file.file_size || 0,
          deleted_at: file.archived_at || file.deleted_at || new Date().toISOString(),
          download_url: file.download_url,
          original_id: file.original_document_id,
        };
      });
      
      setArchiveFiles(files);
      setServerStatus('online');
    } catch (err) {
      console.error("Failed to load archive:", err);
      setServerStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchiveFiles();
  }, [loadArchiveFiles]);

  // Listen for data changes from operations (archive, restore, delete)
  useEffect(() => {
    const handleDataChange = (e) => {
      const changeType = e.detail?.type;
      if (changeType === 'archive' || changeType === 'restore' || changeType === 'delete') {
        // Refetch archive files when data changes
        loadArchiveFiles();
      }
    };

    const handleRefresh = () => {
      loadArchiveFiles();
    };

    window.addEventListener('data-changed', handleDataChange);
    window.addEventListener('refresh:archive', handleRefresh);
    return () => {
      window.removeEventListener('data-changed', handleDataChange);
      window.removeEventListener('refresh:archive', handleRefresh);
    };
  }, [loadArchiveFiles]);

  // Filter logic
  const filteredFiles = useMemo(() => {
    let files = archiveFiles;

    if (debouncedSearch) {
      files = files.filter((file) =>
        file.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    return files;
  }, [debouncedSearch, archiveFiles]);



  // -------- RESTORE FILE -------- //
  const handleRestoreClick = (file) => {
    setConfirmModal({
      isOpen: true,
      action: 'restore',
      type: 'single',
      file: file,
    });
  };

  const handleRestoreConfirm = async () => {
    const isBulk = confirmModal.type === 'bulk';
    const totalFiles = isBulk ? selectedIds.size : 1;
    
    closeConfirmModal();
    
    let currentFileName = '';
    let maxFileNameLength = 0;
    let filesToRestore = [];
    
    if (isBulk) {
      filesToRestore = archiveFiles.filter(f => selectedIds.has(f.id));
      maxFileNameLength = Math.max(...filesToRestore.map(f => f.name?.length || 0));
      currentFileName = filesToRestore[0]?.name || 'file';
    } else {
      currentFileName = confirmModal.file?.name || 'file';
      maxFileNameLength = currentFileName.length;
    }
    
    // Show toast notification
    const toastId = addToast({
      action: 'Restoring',
      fileName: currentFileName,
      status: 'processing',
      progress: 0,
      type: 'restore',
      bulkProgress: isBulk ? { current: 1, total: totalFiles } : null,
      _maxFileNameLength: maxFileNameLength,
    });
    
    try {
      let completedCount = 0;
      
      if (isBulk) {
        // Bulk restore - process sequentially with real-time updates
        for (const file of filesToRestore) {
          await api.archive.restore(file.id);
          completedCount++;
          
          // Remove from list in real-time
          setArchiveFiles(prev => prev.filter(f => f.id !== file.id));
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(file.id);
            return newSet;
          });

          // Update metrics locally
          window.dispatchEvent(new CustomEvent('dashboard-metrics-update', {
            detail: {
              total_documents: 0,
              active_documents: 1,
              archived_documents: -1,
              total_size: 0
            }
          }));
          
          // Update to next file
          if (completedCount < totalFiles && filesToRestore[completedCount]) {
            currentFileName = filesToRestore[completedCount].name;
          }
          
          updateToast(toastId, {
            status: 'processing',
            progress: Math.floor((completedCount / totalFiles) * 100),
            fileName: currentFileName,
            bulkProgress: { current: completedCount + 1, total: totalFiles },
          });
        }
      } else if (confirmModal.file) {
        // Single restore
        await api.archive.restore(confirmModal.file.id);
        setArchiveFiles((prev) => prev.filter((f) => f.id !== confirmModal.file.id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(confirmModal.file.id);
          return newSet;
        });

        // Update metrics locally
        window.dispatchEvent(new CustomEvent('dashboard-metrics-update', {
          detail: {
            total_documents: 0,
            active_documents: 1,
            archived_documents: -1,
            total_size: 0
          }
        }));
      }
      
      updateToast(toastId, {
        status: 'complete',
        action: 'Restored',
        fileName: isBulk ? `${totalFiles} files` : currentFileName,
        progress: 100,
        bulkProgress: null,
      });
    } catch (err) {
      console.error('Restore failed:', err);
      updateToast(toastId, {
        status: 'error',
        action: 'Restore failed',
        message: err.message || 'Restore failed. Please try again.',
      });
    }
  };

  // -------- DELETE FILE PERMANENTLY -------- //
  const handleDeleteClick = (file) => {
    setConfirmModal({
      isOpen: true,
      action: 'delete',
      type: 'single',
      file: file,
    });
  };

  const handleDeleteConfirm = async () => {
    const isBulk = confirmModal.type === 'bulk';
    const totalFiles = isBulk ? selectedIds.size : 1;
    
    closeConfirmModal();
    
    let currentFileName = '';
    let maxFileNameLength = 0;
    let filesToDelete = [];
    
    if (isBulk) {
      filesToDelete = archiveFiles.filter(f => selectedIds.has(f.id));
      maxFileNameLength = Math.max(...filesToDelete.map(f => f.name?.length || 0));
      currentFileName = filesToDelete[0]?.name || 'file';
    } else {
      currentFileName = confirmModal.file?.name || 'file';
      maxFileNameLength = currentFileName.length;
    }
    
    // Show toast notification
    const toastId = addToast({
      action: 'Deleting',
      fileName: currentFileName,
      status: 'processing',
      progress: 0,
      type: 'delete',
      bulkProgress: isBulk ? { current: 1, total: totalFiles } : null,
      _maxFileNameLength: maxFileNameLength,
    });
    
    try {
      let completedCount = 0;
      
      if (isBulk) {
        // Bulk delete - process sequentially to show progress
        for (const file of filesToDelete) {
          if (!file.id || (typeof file.id === 'string' && file.id.startsWith('arch-'))) continue;
          
          await api.archive.deletePermanent(file.id);
          completedCount++;

          // Remove from list in real-time
          setArchiveFiles(prev => prev.filter(f => f.id !== file.id));
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(file.id);
            return newSet;
          });

          // Update metrics locally
          window.dispatchEvent(new CustomEvent('dashboard-metrics-update', {
            detail: {
              total_documents: -1,
              active_documents: 0,
              archived_documents: -1,
              total_size: -(file.size || 0)
            }
          }));
          
          // Update to next file
          if (completedCount < totalFiles && filesToDelete[completedCount]) {
            currentFileName = filesToDelete[completedCount].name;
          }
          
          updateToast(toastId, {
            status: 'processing',
            progress: Math.floor((completedCount / totalFiles) * 100),
            fileName: currentFileName,
            bulkProgress: { current: completedCount + 1, total: totalFiles },
          });
        }
        
        setArchiveFiles(prev => prev.filter(f => !selectedIds.has(f.id)));
        setSelectedIds(new Set());
      } else if (confirmModal.file) {
        // Single delete
        if (!confirmModal.file.id || (typeof confirmModal.file.id === 'string' && confirmModal.file.id.startsWith('arch-'))) {
          throw new Error('Invalid file ID');
        }
        await api.archive.deletePermanent(confirmModal.file.id);
        setArchiveFiles((prev) => prev.filter((f) => f.id !== confirmModal.file.id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(confirmModal.file.id);
          return newSet;
        });

        // Update metrics locally
        window.dispatchEvent(new CustomEvent('dashboard-metrics-update', {
          detail: {
            total_documents: -1,
            active_documents: 0,
            archived_documents: -1,
            total_size: -(confirmModal.file.size || 0)
          }
        }));
      }
      
      updateToast(toastId, {
        status: 'complete',
        action: 'Deleted',
        fileName: isBulk ? `${totalFiles} files` : currentFileName,
        progress: 100,
        bulkProgress: null,
      });
    } catch (err) {
      console.error('Delete failed:', err);
      updateToast(toastId, {
        status: 'error',
        action: 'Delete failed',
        message: err.message || 'Delete failed. Please try again.',
      });
    }
  };

  // Close confirmation modal
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, action: null, type: null, file: null });
  };

  // -------- DOWNLOAD FILE -------- //
  const handleDownload = async (file) => {
    if (!file.id || (typeof file.id === 'string' && file.id.startsWith('arch-'))) {
      alert('Cannot download this file: Invalid ID');
      return;
    }

    try {
      // Use the api service which handles auth properly
      const response = await api.archive.download(file.id);
      
      // Get filename from Content-Disposition header or use file name
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = file.name;
      if (contentDisposition) {
        // Try to match filename="name" or filename=name
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Download failed. Please try again.');
    }
  };

  // Selection handlers
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
    const allSelected = filteredFiles.length > 0 && 
      filteredFiles.every(f => selectedIds.has(f.id));
    
    if (allSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all documents across all pages
      setSelectedIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  // Bulk actions - open confirmation modals
  const handleBulkDeleteClick = () => {
    setConfirmModal({
      isOpen: true,
      action: 'delete',
      type: 'bulk',
      file: null,
    });
  };

  const handleBulkRestoreClick = () => {
    setConfirmModal({
      isOpen: true,
      action: 'restore',
      type: 'bulk',
      file: null,
    });
  };

  // Get selected file names for bulk confirmation
  const getSelectedFileNames = () => {
    return archiveFiles.filter(f => selectedIds.has(f.id)).map(f => f.name);
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const documentIds = Array.from(selectedIds);
      const blob = await api.batchDownload(documentIds, 'archive');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `archived_documents_${new Date().toISOString().slice(0, 10)}.zip`;
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

  return (
    <motion.div 
      className="h-full flex flex-col overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Sticky Header Section */}
      <div className="flex-shrink-0 space-y-3 mb-3 px-1">
        {/* Server Offline Banner */}
        <AnimatePresence>
          {serverStatus === 'offline' && (
            <motion.div 
              className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center gap-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AlertCircle className="w-5 h-5" />
              <span>Server is offline. Archive may not be up to date.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search archived files..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 placeholder-neutral-400 text-[14px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <button 
              onClick={handleBulkDeleteClick}
              disabled={selectedIds.size === 0 || loading}
              className={cn(
                "px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-2",
                selectedIds.size > 0 
                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" 
                  : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
              )}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xs:inline">Delete</span> {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
            <button 
              onClick={handleBulkRestoreClick}
              disabled={selectedIds.size === 0 || loading}
              className={cn(
                "px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-2",
                selectedIds.size > 0 
                  ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100" 
                  : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
              )}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden xs:inline">Restore</span> {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
            <button 
              onClick={handleBulkDownload}
              disabled={selectedIds.size === 0}
              className={cn(
                "px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-2",
                selectedIds.size > 0 
                  ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100" 
                  : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
              )}
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Download</span> {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
            <button 
              onClick={loadArchiveFiles}
              disabled={loading}
              className="hidden lg:block p-2 rounded-lg text-sm font-medium transition-colors bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
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
              {filteredFiles.length > 0 && (
                <thead className="sticky top-0 z-10 bg-neutral-50">
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="w-8 xs:w-10 sm:w-12 pl-2 xs:pl-3 sm:pl-4 pr-1 sm:pr-2 py-2 text-center align-middle">
                      <div className="flex flex-col items-center gap-0.5">
                        <input 
                          type="checkbox" 
                          className="rounded border-neutral-300 text-primary-600 w-3.5 h-3.5 sm:w-4 sm:h-4"
                          checked={filteredFiles.length > 0 && filteredFiles.every(f => selectedIds.has(f.id))}
                          onChange={toggleAll}
                        />
                        <span className="text-[7px] xs:text-[8px] sm:text-[9px] font-medium text-neutral-400 uppercase">All</span>
                      </div>
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Document</th>
                    <th className="hidden md:table-cell w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Type</th>
                    <th className="hidden lg:table-cell w-20 sm:w-24 px-2 sm:px-3 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Size</th>
                    <th className="hidden lg:table-cell w-24 sm:w-28 px-2 sm:px-3 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Archived On</th>
                    <th className="w-[90px] xs:w-[110px] sm:w-[130px] md:w-[180px] pl-2 sm:pl-3 pr-2 xs:pr-3 sm:pr-4 md:pr-10 py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider align-middle">Actions</th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-neutral-100">
                  {!loading && filteredFiles.map((file, index) => (
                    <motion.tr 
                      key={file.id} 
                      className={cn("hover:bg-neutral-50/50 transition-colors group", selectedIds.has(file.id) ? "bg-primary-50/50" : "")}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <td className={cn("w-8 xs:w-10 sm:w-12 pl-2 xs:pl-3 sm:pl-4 pr-1 sm:pr-2 py-2 sm:py-3 text-center align-middle", selectedIds.has(file.id) && "border-l-2 border-l-primary-500")}>
                        <input 
                          type="checkbox" 
                          className="rounded border-neutral-300 text-primary-600 w-3.5 h-3.5 sm:w-4 sm:h-4"
                          checked={selectedIds.has(file.id)}
                          onChange={() => toggleSelection(file.id)}
                        />
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle">
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
                          <div className="flex-shrink-0 hidden sm:block">
                            <FileTypeIcon ext={file.ext} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <button 
                              onClick={() => setPreviewDoc(file)}
                              className="font-semibold text-neutral-900 hover:text-blue-600 text-left transition-colors text-[12px] sm:text-[13px] break-words w-full line-clamp-2 tracking-tight"
                              title={file.name}
                            >
                              {file.name}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-3 text-center align-middle">
                        <TypeBadge ext={file.ext} />
                      </td>
                      <td className="hidden lg:table-cell w-20 sm:w-24 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-neutral-600 text-center align-middle whitespace-nowrap">
                        {formatBytes(file.size)}
                      </td>
                      <td className="hidden lg:table-cell w-24 sm:w-28 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-neutral-600 text-center align-middle">
                        {(() => {
                          const date = new Date(file.deleted_at);
                          const month = date.toLocaleDateString('en-US', { month: 'short' });
                          const day = date.getDate();
                          const year = date.getFullYear();
                          return <span className="whitespace-pre-line">{`${month} ${day}\n${year}`}</span>;
                        })()}
                      </td>
                      <td className="w-[90px] xs:w-[110px] sm:w-[130px] md:w-[180px] pl-2 sm:pl-3 pr-2 xs:pr-3 sm:pr-4 md:pr-10 py-2 sm:py-3 align-middle">
                        <div className="flex items-center justify-center gap-1 flex-nowrap">
                          <button 
                            onClick={() => handleRestoreClick(file)}
                            disabled={loading}
                            className="px-2 sm:px-3 py-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            <span className="hidden sm:inline">Restore</span>
                            <RotateCcw className="sm:hidden w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDownload(file)}
                            className="px-2 sm:px-3 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                          >
                            <span className="hidden sm:inline">Download</span>
                            <Download className="sm:hidden w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
              
              {filteredFiles.length === 0 && !loading && (
                <tr className="h-full">
                  <td colSpan="6" className="h-full">
                    <div className="flex flex-col items-center justify-center text-center text-neutral-500 min-h-[400px]">
                      <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                        <Archive className="w-6 h-6 text-neutral-400" />
                      </div>
                      <p className="font-semibold text-[15px] tracking-tight">No archived files</p>
                      <p className="text-[13px] mt-1">Files you archive will appear here</p>
                    </div>
                  </td>
                </tr>
              )}
              
              {loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-neutral-500">
                    <LoadingSpinner text="Loading archived files..." />
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
            onSave={(doc, newContent) => {
              console.log('Saved changes to', doc.name);
            }}
            isArchived={true}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.action === 'delete' ? handleDeleteConfirm : handleRestoreConfirm}
        title={
          confirmModal.action === 'delete'
            ? confirmModal.type === 'bulk' ? 'Delete Selected Files' : 'Delete File'
            : confirmModal.type === 'bulk' ? 'Restore Selected Files' : 'Restore File'
        }
        message={
          confirmModal.action === 'delete'
            ? confirmModal.type === 'bulk'
              ? `Are you sure you want to permanently delete ${selectedIds.size} file${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`
              : `Are you sure you want to permanently delete "${confirmModal.file?.name}"? This action cannot be undone.`
            : confirmModal.type === 'bulk'
              ? `Are you sure you want to restore ${selectedIds.size} file${selectedIds.size > 1 ? 's' : ''} to the knowledge base?`
              : `Are you sure you want to restore "${confirmModal.file?.name}" to the knowledge base?`
        }
        actionType={confirmModal.action || 'delete'}
        confirmLabel={confirmModal.action === 'delete' ? 'Delete' : 'Restore'}
        itemNames={confirmModal.type === 'bulk' ? getSelectedFileNames() : []}
        loading={loading}
      />
    </motion.div>
  );
}