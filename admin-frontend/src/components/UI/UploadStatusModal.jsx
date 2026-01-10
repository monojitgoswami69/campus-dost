import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  X, 
  AlertCircle,
  FileText,
  Upload,
  Sparkles,
  Database,
  Cloud
} from 'lucide-react';
import { Button } from './Button';

const getModalVariants = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return {
    initial: { 
      opacity: 0, 
      y: isMobile ? '100%' : 20,
      scale: isMobile ? 1 : 0.95,
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 30 } 
    },
    exit: { 
      opacity: 0, 
      y: isMobile ? '100%' : 20,
      scale: isMobile ? 1 : 0.95,
      transition: { duration: 0.2 } 
    }
  };
};

const stepVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

// Upload status steps
export const UPLOAD_STEPS = {
  UPLOADING: { id: 'uploading', label: 'Uploading file...', icon: Upload },
  EXTRACTING: { id: 'extracting', label: 'Extracting text...', icon: FileText },
  CLEANING: { id: 'cleaning', label: 'Cleaning & chunking...', icon: Sparkles },
  EMBEDDING: { id: 'embedding', label: 'Generating embeddings...', icon: Database },
  STORING_GITHUB: { id: 'storing_github', label: 'Storing in GitHub...', icon: Cloud },
  STORING_DB: { id: 'storing_db', label: 'Saving to database...', icon: Database },
  COMPLETE: { id: 'complete', label: 'Upload complete!', icon: CheckCircle2 },
  ERROR: { id: 'error', label: 'Upload failed', icon: AlertCircle },
};

// Text upload steps
export const TEXT_UPLOAD_STEPS = {
  PROCESSING: { id: 'processing', label: 'Processing text...', icon: FileText },
  CLEANING: { id: 'cleaning', label: 'Cleaning & chunking...', icon: Sparkles },
  EMBEDDING: { id: 'embedding', label: 'Generating embeddings...', icon: Database },
  STORING_GITHUB: { id: 'storing_github', label: 'Storing in GitHub...', icon: Cloud },
  STORING_DB: { id: 'storing_db', label: 'Saving to database...', icon: Database },
  COMPLETE: { id: 'complete', label: 'Upload complete!', icon: CheckCircle2 },
  ERROR: { id: 'error', label: 'Upload failed', icon: AlertCircle },
};

/**
 * Step status indicator component
 */
function StepIndicator({ step, status, index }) {
  const Icon = step.icon;
  
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          container: 'bg-green-100 text-green-600 border-green-200',
          icon: 'text-green-600',
          text: 'text-green-700'
        };
      case 'active':
        return {
          container: 'bg-primary-100 text-primary-600 border-primary-200',
          icon: 'text-primary-600',
          text: 'text-primary-700'
        };
      case 'error':
        return {
          container: 'bg-red-100 text-red-600 border-red-200',
          icon: 'text-red-600',
          text: 'text-red-700'
        };
      default:
        return {
          container: 'bg-neutral-100 text-neutral-400 border-neutral-200',
          icon: 'text-neutral-400',
          text: 'text-neutral-500'
        };
    }
  };
  
  const styles = getStatusStyles();
  
  return (
    <motion.div
      className="flex items-center gap-3 py-2"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      transition={{ delay: index * 0.1 }}
    >
      <div className={`p-2 rounded-lg border ${styles.container}`}>
        {status === 'active' ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className={`w-5 h-5 ${styles.icon}`} />
          </motion.div>
        ) : status === 'completed' ? (
          <CheckCircle2 className={`w-5 h-5 ${styles.icon}`} />
        ) : status === 'error' ? (
          <AlertCircle className={`w-5 h-5 ${styles.icon}`} />
        ) : (
          <Circle className={`w-5 h-5 ${styles.icon}`} />
        )}
      </div>
      <span className={`font-medium ${styles.text}`}>{step.label}</span>
    </motion.div>
  );
}

/**
 * Upload Status Modal - Shows step-by-step progress during upload
 * Supports two modes:
 * 1. Simple mode: pass status string ('uploading', 'extracting', 'processing', 'embedding', 'storing')
 * 2. Advanced mode: pass steps array and currentStep
 */
export function UploadStatusModal({ 
  isOpen, 
  onClose, 
  // Simple mode props
  status = 'idle',
  progress = 0,
  fileName = '',
  // Advanced mode props
  steps = null, 
  currentStep = 0, 
  // Common props
  error = null,
  isComplete = false,
  onComplete = null
}) {
  if (!isOpen) return null;
  
  // Default steps for simple mode
  const defaultSteps = [
    { id: 'uploading', label: 'Uploading file...', icon: Upload },
    { id: 'extracting', label: 'Extracting text...', icon: FileText },
    { id: 'processing', label: 'Cleaning & chunking...', icon: Sparkles },
    { id: 'embedding', label: 'Generating embeddings...', icon: Database },
    { id: 'storing', label: 'Saving to knowledge base...', icon: Cloud },
  ];
  
  const activeSteps = steps || defaultSteps;
  
  // Calculate current step index from status string (simple mode)
  const getStepIndexFromStatus = () => {
    if (steps) return currentStep;
    const statusMap = {
      'idle': -1,
      'uploading': 0,
      'extracting': 1,
      'processing': 2,
      'embedding': 3,
      'storing': 4,
    };
    return statusMap[status] ?? -1;
  };
  
  const activeStepIndex = getStepIndexFromStatus();
  
  const getStepStatus = (index) => {
    if (error && index === activeStepIndex) return 'error';
    if (isComplete) return 'completed';
    if (index < activeStepIndex) return 'completed';
    if (index === activeStepIndex) return 'active';
    return 'pending';
  };
  
  return createPortal(
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-[100vw] sm:max-w-md overflow-hidden"
          variants={getModalVariants()}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className={`p-2 rounded-lg ${error ? 'bg-red-100' : isComplete ? 'bg-green-100' : 'bg-primary-100'}`}
                  animate={!isComplete && !error ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {error ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Upload className="w-5 h-5 text-primary-600" />
                  )}
                </motion.div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {error ? 'Upload Failed' : isComplete ? 'Upload Complete' : 'Uploading...'}
                  </h2>
                  {fileName && (
                    <p className="text-sm text-neutral-500 truncate max-w-[250px]">{fileName}</p>
                  )}
                </div>
              </div>
              {(isComplete || error) && (
                <motion.button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-4 space-y-1">
            {activeSteps.map((step, index) => (
              <StepIndicator 
                key={step.id} 
                step={step} 
                status={getStepStatus(index)}
                index={index}
              />
            ))}
          </div>
          
          {/* Error message */}
          {error && (
            <motion.div 
              className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
            {error && (
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            )}
            {isComplete && (
              <Button onClick={onComplete || onClose}>
                Done
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default UploadStatusModal;
