import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/UI/Button';
import { useToast } from '../context/ToastContext';
import { FilePreview } from '../components/UI/FileComponents';
import { validateFile, formatBytes, cn } from '../utils/helpers';
import { api } from '../services/api';
import { 
  FileUp, 
  FolderUp, 
  Archive, 
  X, 
  FileText, 
  Upload,
  AlertCircle
} from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } }
};

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

const fileItemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

export default function AddDocumentPage() {
  const { addToast, updateToast } = useToast();
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'folder' | 'archive'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('online');
  const [uploading, setUploading] = useState(false);
  
  // File preview state - create doc object compatible with FilePreview component
  const [previewDoc, setPreviewDoc] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const uploadModes = [
    { id: 'file', label: 'Single File', icon: FileUp, description: 'Upload individual documents' },
    { id: 'folder', label: 'Folder', icon: FolderUp, description: 'Upload multiple files' },
  ];

  const acceptedFormats = {
    file: '.pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.json',
    folder: '',
  };

  const formatLabels = {
    file: 'PDF, Images (PNG, JPG, JPEG, WEBP), Text (TXT, MD), JSON',
    folder: 'All supported file types in folder',
  };

  // Drag Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  // Select Files
  const handleFilesSelect = (files) => {
    const validFiles = [];
    const skippedFiles = [];
    const errors = [];

    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else if (validation.error === 'File type not supported') {
        skippedFiles.push(file.name);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    // Show skipped message if any files were skipped
    if (skippedFiles.length > 0) {
      const skippedMessage = skippedFiles.map(name => `skipped ${name}, type unsupported`).join('\n');
      if (errors.length > 0) {
        setError(skippedMessage + '\n' + errors.join('\n'));
      } else {
        setError(skippedMessage);
      }
    } else if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError('');
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
    }
  };

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setError('');
  };

  const getActiveInputRef = () => {
    switch (uploadMode) {
      case 'folder': return folderInputRef;
      default: return fileInputRef;
    }
  };

  // Show preview modal for a specific file
  const handlePreviewFile = (file) => {
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Create doc object compatible with FilePreview component
    const doc = {
      id: null, // No ID for local files
      name: file.name,
      ext: ext,
      size: file.size,
      download_url: url,
      _isLocalFile: true,
      _blobUrl: url // Track blob URL for cleanup
    };
    
    setPreviewDoc(doc);
  };
  
  const closePreview = () => {
    if (previewDoc?._blobUrl) {
      URL.revokeObjectURL(previewDoc._blobUrl);
    }
    setPreviewDoc(null);
  };

  // Upload files to backend with status updates
  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError('');

    let toastId = null;

    try {
      let result;
      
      if (selectedFiles.length > 1) {
        // Multiple files upload - bulk progress
        let completedCount = 0;
        const totalCount = selectedFiles.length;
        let currentFileName = selectedFiles[0]?.name || '';
        
        // Calculate max filename length for consistent toast width
        const maxFileNameLength = Math.max(...selectedFiles.map(f => f.name.length));
        
        // Reset form immediately
        const filesToUpload = [...selectedFiles];
        setSelectedFiles([]);
        setError('');
        
        toastId = addToast({
          action: 'Uploading',
          fileName: currentFileName,
          status: 'uploading',
          progress: 0,
          bulkProgress: { current: 1, total: totalCount },
          _maxFileNameLength: maxFileNameLength,
        });
        
        result = await api.upload.multiple(filesToUpload, {
          source: 'upload',
          tags: [],
        }, (status, progress, fileIndex) => {
          if (status === 'complete' && fileIndex !== undefined) {
            completedCount++;
            // Update to next file
            if (completedCount < totalCount && filesToUpload[completedCount]) {
              currentFileName = filesToUpload[completedCount].name;
            }
          }
          updateToast(toastId, {
            status: 'uploading',
            progress: progress,
            fileName: currentFileName,
            bulkProgress: { current: completedCount + 1, total: totalCount },
          });
        });
        
        if (result.status === 'success' || result.results) {
          updateToast(toastId, {
            status: 'complete',
            action: 'Uploaded',
            progress: 100,
            fileName: `${totalCount} files`,
            bulkProgress: null,
          });
        } else {
          updateToast(toastId, {
            status: 'error',
            action: 'Upload failed',
            message: result.message || 'Upload failed',
          });
          setError(result.message || 'Upload failed');
        }
      } else {
        // Single file upload
        const file = selectedFiles[0];
        
        toastId = addToast({
          action: 'Uploading',
          fileName: file.name,
          status: 'uploading',
          progress: 0,
        });
        
        const handleStatusUpdate = (status, progress) => {
          updateToast(toastId, {
            status: 'uploading',
            progress: progress,
          });
        };
        
        // Store and clear immediately
        const fileToUpload = selectedFiles[0];
        setSelectedFiles([]);
        setError('');
        
        result = await api.upload.file(fileToUpload, {
          title: fileToUpload.name,
          source: 'upload',
          tags: [],
        }, handleStatusUpdate);
        
        if (result.status === 'success' || result.document_id) {
          updateToast(toastId, {
            status: 'complete',
            action: 'Uploaded',
            progress: 100,
          });
        } else {
          updateToast(toastId, {
            status: 'error',
            action: 'Upload failed',
            message: result.message || 'Upload failed',
          });
          setError(result.message || 'Upload failed');
        }
      }
      
      setServerStatus('online');
    } catch (err) {
      console.error('Upload error:', err);
      
      // Update toast with error if we created one
      if (toastId) {
        updateToast(toastId, {
          status: 'error',
          action: 'Upload failed',
          message: err.message || 'Upload failed',
        });
      }
      
      // Update UI state
      if (err.message?.includes('Network') || err.message?.includes('fetch') || err.status === 0) {
        setServerStatus('offline');
        setError('Server is offline. Please try again later.');
      } else if (err.status === 503) {
        setError('Service temporarily unavailable. Please try again later.');
      } else {
        setError(err.message || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);

  return (
    <motion.div 
      className="h-full w-full flex flex-col overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-3 p-1">
      
      <AnimatePresence>
        {serverStatus === 'offline' && (
          <motion.div 
            className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center gap-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AlertCircle className="w-5 h-5" />
            <span>Server is offline. Uploads are disabled.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Mode Selector */}
      <div className="bg-white rounded-lg border border-neutral-200 p-2">
        <div className="flex gap-1">
          {uploadModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setUploadMode(mode.id);
                clearAll();
              }}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors",
                uploadMode === mode.id
                  ? "bg-primary-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              <mode.icon className="w-4 h-4" />
              <span className="text-[11px] tracking-wide">{mode.id === 'file' ? 'Files' : 'Folder'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight">
            Upload {uploadMode === 'file' ? 'Document' : 'Folder'}
          </h2>
          {selectedFiles.length > 0 && (
            <button onClick={clearAll} className="text-[13px] text-neutral-500 hover:text-neutral-700 font-medium">
              Clear all
            </button>
          )}
        </div>

        {/* Dropzone */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragActive
              ? "border-primary-500 bg-primary-50"
              : error
              ? "border-red-300 bg-red-50"
              : "border-neutral-300 hover:border-primary-400 bg-neutral-50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            const ref = getActiveInputRef();
            if (ref.current) ref.current.click();
          }}
        >
          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.file}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center mb-4",
              dragActive ? "bg-primary-100" : "bg-neutral-100"
            )}>
              <Upload className={cn(
                "w-7 h-7",
                dragActive ? "text-primary-600" : "text-neutral-400"
              )} />
            </div>
            <p className="text-[15px] font-semibold mb-1 text-neutral-900 tracking-tight">
              {dragActive ? 'Drop files here' : 'Drag and drop, or click to browse'}
            </p>
            <p className="text-[13px] text-neutral-500">
              {formatLabels[uploadMode]}
            </p>
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-neutral-700 tracking-tight">
                Selected Files ({selectedFiles.length})
              </h3>
              <span className="text-[13px] text-neutral-500">
                Total: {formatBytes(totalSize)}
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <AnimatePresence mode="sync">
                {selectedFiles.map((file, index) => (
                  <motion.div 
                    key={file.name + index}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-100 gap-2"
                    variants={fileItemVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    layout
                    onClick={() => handlePreviewFile(file)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-white rounded-lg border border-neutral-200 flex-shrink-0">
                        <FileText className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-neutral-900 truncate text-[13px] tracking-tight">{file.name}</p>
                        <p className="text-[11px] text-neutral-500">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="p-1.5 hover:bg-neutral-200 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4 text-neutral-500" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Actions */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="secondary" onClick={clearAll} className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={uploading || serverStatus === 'offline'} className="w-full sm:w-auto justify-center">
              <Upload className="w-4 h-4 mr-2" />
              Upload {selectedFiles.length > 1 ? `${selectedFiles.length} Files` : 'File'}
            </Button>
          </div>
        )}
      </div>

      {/* File Preview Modal - Uses same component as KnowledgeBase/Archive pages */}
      {previewDoc && (
        <FilePreview
          doc={previewDoc}
          onClose={closePreview}
        />
      )}
      </div>
      </div>
    </motion.div>
  );
}
