import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { formatBytes } from '../../utils/helpers';
import {
  FileText,
  File,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  FileJson,
  FileCode,
  FileType,
  Presentation,
  FileArchive,
  X,
  ExternalLink,
  AlertCircle,
  Save,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Shared utility function for class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

/**
 * FileTypeIcon - Displays an icon based on file extension
 */
export const FileTypeIcon = memo(function FileTypeIcon({ ext }) {
  const getIconConfig = (extension) => {
    const e = extension?.toLowerCase();
    const configs = {
      // Documents
      pdf: { bg: 'bg-red-50', text: 'text-red-600', icon: FileText },
      doc: { bg: 'bg-blue-50', text: 'text-blue-600', icon: FileText },
      docx: { bg: 'bg-blue-50', text: 'text-blue-600', icon: FileText },
      txt: { bg: 'bg-gray-50', text: 'text-gray-600', icon: FileType },
      md: { bg: 'bg-gray-50', text: 'text-gray-600', icon: FileText },
      // Spreadsheets
      xls: { bg: 'bg-green-50', text: 'text-green-600', icon: FileSpreadsheet },
      xlsx: { bg: 'bg-green-50', text: 'text-green-600', icon: FileSpreadsheet },
      csv: { bg: 'bg-green-50', text: 'text-green-600', icon: FileSpreadsheet },
      // Presentations
      ppt: { bg: 'bg-orange-50', text: 'text-orange-600', icon: Presentation },
      pptx: { bg: 'bg-orange-50', text: 'text-orange-600', icon: Presentation },
      // Images
      jpg: { bg: 'bg-purple-50', text: 'text-purple-600', icon: ImageIcon },
      jpeg: { bg: 'bg-purple-50', text: 'text-purple-600', icon: ImageIcon },
      png: { bg: 'bg-purple-50', text: 'text-purple-600', icon: ImageIcon },
      gif: { bg: 'bg-purple-50', text: 'text-purple-600', icon: ImageIcon },
      svg: { bg: 'bg-purple-50', text: 'text-purple-600', icon: ImageIcon },
      webp: { bg: 'bg-purple-50', text: 'text-purple-600', icon: ImageIcon },
      bmp: { bg: 'bg-purple-50', text: 'text-purple-600', icon: ImageIcon },
      // Data files
      json: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: FileJson },
      xml: { bg: 'bg-teal-50', text: 'text-teal-600', icon: FileCode },
      // Code files
      html: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: FileCode },
      css: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: FileCode },
      js: { bg: 'bg-amber-50', text: 'text-amber-600', icon: FileCode },
      ts: { bg: 'bg-blue-50', text: 'text-blue-600', icon: FileCode },
      jsx: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: FileCode },
      tsx: { bg: 'bg-blue-50', text: 'text-blue-600', icon: FileCode },
      py: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: FileCode },
      // Archives
      zip: { bg: 'bg-amber-50', text: 'text-amber-600', icon: FileArchive },
      rar: { bg: 'bg-amber-50', text: 'text-amber-600', icon: FileArchive },
      '7z': { bg: 'bg-amber-50', text: 'text-amber-600', icon: FileArchive },
    };
    return configs[e] || { bg: 'bg-gray-50', text: 'text-gray-600', icon: File };
  };

  const config = getIconConfig(ext);
  const Icon = config.icon;

  return (
    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
      <Icon className={cn('w-5 h-5', config.text)} aria-hidden="true" />
    </div>
  );
});

/**
 * TypeBadge - Displays a colored badge for file type
 */
export const TypeBadge = memo(function TypeBadge({ ext }) {
  const getStyle = (extension) => {
    const map = {
      pdf: 'bg-red-100 text-red-700',
      doc: 'bg-blue-100 text-blue-700',
      docx: 'bg-blue-100 text-blue-700',
      xls: 'bg-green-100 text-green-700',
      xlsx: 'bg-green-100 text-green-700',
      csv: 'bg-green-100 text-green-700',
      ppt: 'bg-orange-100 text-orange-700',
      pptx: 'bg-orange-100 text-orange-700',
      jpg: 'bg-purple-100 text-purple-700',
      jpeg: 'bg-purple-100 text-purple-700',
      png: 'bg-purple-100 text-purple-700',
      gif: 'bg-purple-100 text-purple-700',
      txt: 'bg-gray-100 text-gray-700',
      md: 'bg-gray-100 text-gray-700',
      json: 'bg-yellow-100 text-yellow-700',
      xml: 'bg-teal-100 text-teal-700',
      html: 'bg-cyan-100 text-cyan-700',
      css: 'bg-indigo-100 text-indigo-700',
      js: 'bg-amber-100 text-amber-700',
    };
    return map[extension?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide', getStyle(ext))}>
      {ext}
    </span>
  );
});

// File type detection helpers
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'log'];
const CODE_EXTENSIONS = ['json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'xml', 'py', 'java', 'c', 'cpp', 'h', 'rb', 'go', 'rs', 'php', 'sh', 'yaml', 'yml'];
const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

/**
 * CustomPDFViewer - A custom PDF viewer using react-pdf
 */
const CustomPDFViewer = ({ url }) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col h-full bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-white border-b border-neutral-200 shadow-sm z-10">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium text-neutral-600 font-mono">
            {numPages ? `${numPages} Pages` : 'Loading...'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            className="p-1 sm:p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-600 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="text-xs sm:text-sm font-medium text-neutral-600 min-w-[40px] sm:min-w-[60px] text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(2.5, s + 0.1))}
            className="p-1 sm:p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-600 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Document Container */}
      <div className="flex-1 overflow-auto p-2 sm:p-8 bg-neutral-100/50">
        <div className="flex justify-center min-h-full">
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-64 w-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-64 text-red-500 w-full">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>Failed to load PDF</p>
              </div>
            }
            className="flex flex-col gap-4 sm:gap-6"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="bg-white shadow-md"
                loading={
                  <div className="h-[800px] w-[600px] bg-white animate-pulse rounded-sm" />
                }
              />
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
};

/**
 * FilePreview - Full-screen modal for previewing files
 * Fetches content from GitHub via backend API
 * @param {Object} doc - Document object with id, name, ext, etc.
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onSave - Callback when file is saved (optional)
 * @param {boolean} isArchived - Whether the document is archived (uses archive API)
 */
export function FilePreview({ doc, onClose, onSave, isArchived = false }) {
  const [content, setContent] = useState(null);
  const [editedContent, setEditedContent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const ext = doc?.ext?.toLowerCase();
  const isImage = IMAGE_EXTENSIONS.includes(ext);
  const isPDF = ext === 'pdf';
  const isTxt = ext === 'txt';
  const isText = TEXT_EXTENSIONS.includes(ext);
  const isCode = CODE_EXTENSIONS.includes(ext);
  const isOffice = OFFICE_EXTENSIONS.includes(ext);

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      // Need either doc.id for API fetch or download_url for direct fetch
      if (!doc?.id && !doc?.download_url) {
        setError('No document ID or URL available');
        setLoading(false);
        return;
      }

      try {
        // For images and PDFs, use preview endpoint to get blob URL
        if (isImage || isPDF) {
          if (doc.id) {
            try {
              const { api } = await import('../../services/api');
              const previewUrl = isArchived 
                ? await api.archive.preview?.(doc.id) || await api.knowledgeBase.preview(doc.id)
                : await api.knowledgeBase.preview(doc.id);
              
              if (isMounted) {
                setContent(previewUrl);
              }
            } catch (apiErr) {
              console.warn('Preview API failed, trying download_url:', apiErr);
              if (doc.download_url && isMounted) {
                setContent(doc.download_url);
              } else {
                throw apiErr;
              }
            }
          } else if (doc.download_url) {
            setContent(doc.download_url);
          }
        } else if (isText || isCode) {
          // For text files, fetch as text
          let text;

          if (doc.id) {
            try {
              const { api } = await import('../../services/api');
              // Use getContent for text files
              if (isArchived) {
                text = await api.archive.getContent(doc.id);
              } else {
                text = await api.documents.getContent(doc.id);
              }
            } catch (apiErr) {
              console.warn('API fetch failed, trying download_url:', apiErr);
              if (doc.download_url) {
                const response = await fetch(doc.download_url);
                if (!response.ok) throw new Error('Failed to fetch file');
                text = await response.text();
              } else {
                throw apiErr;
              }
            }
          } else if (doc.download_url) {
            const response = await fetch(doc.download_url);
            if (!response.ok) throw new Error('Failed to fetch file');
            text = await response.text();
          }

          if (isMounted && text) {
            setContent(text);
            setEditedContent(text);
          }
        }
        if (isMounted) setLoading(false);
      } catch (e) {
        console.error('Failed to load file:', e);
        if (isMounted) {
          setError('Failed to load file content');
          setLoading(false);
        }
      }
    }

    loadContent();
    return () => { 
      isMounted = false;
      // Cleanup blob URLs
      if (content && typeof content === 'string' && content.startsWith('blob:')) {
        URL.revokeObjectURL(content);
      }
    };
  }, [doc, isText, isCode, isImage, isPDF, isArchived]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleSave = async () => {
    if (!isTxt || !isEditing) return;

    setIsSaving(true);
    
    try {
      // Import dynamically to avoid circular dependencies
      const { api } = await import('../../services/api');
      
      // Delete the old file first
      if (doc.id) {
        await api.documents.delete(doc.id);
      }
      
      // Upload new version with same filename
      const result = await api.text.upload(doc.name, editedContent);
      
      // Show success toast
      window.dispatchEvent(new CustomEvent('add-toast', {
        detail: {
          id: Date.now(),
          action: 'Edited',
          fileName: doc.name,
          status: 'complete',
          progress: 100,
        }
      }));
      
      // Close the preview modal
      onClose();
      
      // Trigger page refresh if callback provided
      if (onSave) await onSave(doc, editedContent);
    } catch (e) {
      console.error('Failed to save file:', e);
      window.dispatchEvent(new CustomEvent('add-toast', {
        detail: {
          id: Date.now(),
          action: 'Edit failed',
          message: e.message || 'Failed to save changes',
          status: 'error',
        }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = doc.download_url;
    a.download = doc.name;
    a.click();
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4" role="status" aria-label="Loading file">
          <div className="w-12 h-12 border-4 border-neutral-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-700">Loading Preview</p>
            <p className="text-xs text-neutral-500 mt-1">Please wait...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-neutral-500">
          <AlertCircle className="w-12 h-12 mb-4 text-red-400" aria-hidden="true" />
          <p className="font-medium">{error}</p>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center bg-neutral-100 rounded-lg p-4 min-h-96">
          <img
            src={content || doc.download_url}
            alt={doc.name}
            className="max-w-full max-h-[60vh] object-contain rounded shadow-sm"
          />
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="w-full h-[70vh]">
          <CustomPDFViewer url={content || doc.download_url} />
        </div>
      );
    }

    if (isText || isCode) {
      if (isTxt && isEditing) {
        return (
          <div className="bg-white rounded-lg overflow-hidden border border-neutral-200 shadow-sm h-[60vh] sm:h-[70vh]">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full p-3 sm:p-6 font-mono text-xs sm:text-sm text-neutral-800 bg-white resize-none focus:outline-none"
              spellCheck={false}
              aria-label={`Edit content of ${doc.name}`}
            />
          </div>
        );
      }

      return (
        <div className="bg-white rounded-lg overflow-hidden border border-neutral-200 shadow-sm h-[60vh] sm:h-[70vh] relative">
          <button
            onClick={() => {
              navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={cn(
              "absolute top-2 sm:top-4 right-2 sm:right-4 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 z-10",
              copied 
                ? "bg-green-100 text-green-700" 
                : "text-neutral-600 bg-neutral-100 hover:bg-neutral-200"
            )}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden xs:inline">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden xs:inline">Copy</span>
              </>
            )}
          </button>
          <pre className="p-3 sm:p-6 overflow-auto h-full text-xs sm:text-sm font-mono text-neutral-800 whitespace-pre-wrap break-words bg-white leading-relaxed">
            <code>{content}</code>
          </pre>
        </div>
      );
    }

    if (isOffice) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-neutral-500 bg-neutral-50 rounded-lg">
          <FileText className="w-16 h-16 mb-4 text-neutral-300" aria-hidden="true" />
          <p className="font-medium text-neutral-700 mb-2">Office Document Preview</p>
          <p className="text-sm text-neutral-500 mb-6 text-center max-w-md">
            Office documents (.{ext}) cannot be previewed directly in the browser.
          </p>
          <button
            onClick={() => window.open(doc.download_url, '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Download File
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-96 text-neutral-500 bg-neutral-50 rounded-lg">
        <File className="w-16 h-16 mb-4 text-neutral-300" aria-hidden="true" />
        <p className="font-medium text-neutral-700 mb-2">Preview Not Available</p>
        <p className="text-sm text-neutral-500 mb-6 text-center max-w-md">
          This file type (.{ext}) cannot be previewed in the browser.
        </p>
        <button
          onClick={() => window.open(doc.download_url, '_blank')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download File
        </button>
      </div>
    );
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-preview-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-[100vw] sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        initial={{ 
          opacity: 0, 
          y: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 20,
          scale: typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 0.95,
        }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: 1,
        }}
        exit={{ 
          opacity: 0, 
          y: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 20,
          scale: typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 0.95,
        }}
        transition={{ 
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      >
        {/* Header */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="hidden xs:block">
              <FileTypeIcon ext={doc.ext} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="file-preview-title" className="text-sm sm:text-lg font-semibold text-neutral-900 truncate">{doc.name}</h2>
              <p className="text-xs sm:text-sm text-neutral-500">{formatBytes(doc.size)} • {doc.ext?.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isTxt && isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 disabled:opacity-50"
                  aria-busy={isSaving}
                >
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                  <span className="hidden xs:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </>
            ) : (
              <>
                {isTxt && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Edit"
                    aria-label="Edit file"
                  >
                    <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  onClick={() => window.open(doc.download_url, '_blank')}
                  className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700 min-w-[32px] min-h-[32px] flex items-center justify-center hidden xs:flex"
                  title="Open in new tab"
                  aria-label="Open file in new tab"
                >
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title="Download"
                  aria-label="Download file"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                </button>
              </>
            )}
            <motion.button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700 min-w-[32px] min-h-[32px] flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              title="Close"
              aria-label="Close preview"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="p-2 sm:p-6 overflow-auto bg-white flex-1">
          {renderPreview()}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/**
 * RawFilePreview - Preview for raw File objects before upload
 * This is used in AddDocumentPage to preview files before they are uploaded
 */
export function RawFilePreview({ file, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const ext = file?.name?.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isText = ['txt', 'md', 'json', 'csv', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'yaml', 'yml'].includes(ext);
  const isPDF = ext === 'pdf';

  useEffect(() => {
    if (!file) return;

    setLoading(true);
    setError(null);

    if (isImage || isPDF) {
      // Create object URL for images and PDFs
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setLoading(false);
      return () => URL.revokeObjectURL(url);
    } else if (isText) {
      // Read text files
      const reader = new FileReader();
      reader.onload = (e) => {
        setContent(e.target.result);
        setLoading(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setLoading(false);
    }
  }, [file, isImage, isPDF, isText]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2">
          <AlertCircle className="w-8 h-8" />
          <span>{error}</span>
        </div>
      );
    }

    if (isImage && previewUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    if (isPDF && previewUrl) {
      return (
        <div className="h-full w-full">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={file.name}
          />
        </div>
      );
    }

    if (isText && content) {
      return (
        <pre className="font-mono text-sm whitespace-pre-wrap overflow-auto p-4 bg-neutral-50 rounded-lg h-full">
          {content}
        </pre>
      );
    }

    // Unsupported file type
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
        <FileText className="w-16 h-16" />
        <div className="text-center">
          <p className="font-medium text-neutral-900">{file.name}</p>
          <p className="text-sm">Preview not available for this file type</p>
          <p className="text-xs mt-2">Size: {formatBytes(file.size)}</p>
        </div>
      </div>
    );
  };

  if (!file) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-neutral-900 truncate">{file.name}</h2>
              <p className="text-sm text-neutral-500">{formatBytes(file.size)}</p>
            </div>
          </div>
          <motion.button
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-[400px]">
          {renderPreview()}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
