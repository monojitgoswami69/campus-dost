import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Upload,
  Trash2,
  Archive,
  RotateCcw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ToastItem = React.forwardRef(({ toast, onClose, isMobile }, ref) => {
  const { id, title, status, progress, type, message, fileName, action, bulkProgress, _maxFileNameLength } = toast;
  const isComplete = status === 'complete';
  const isError = status === 'error';
  const isProcessing = !isComplete && !isError;
  
  // Calculate toast width based on max filename length to prevent resizing
  const getToastWidth = () => {
    if (isMobile) return '100%';
    if (_maxFileNameLength) {
      // Estimate width: ~7px per character + padding (320px base minimum)
      const estimatedWidth = Math.max(320, Math.min(480, _maxFileNameLength * 7 + 140));
      return `${estimatedWidth}px`;
    }
    return '320px'; // default width
  };
  
  // Auto-dismiss complete/error toasts after different times
  useEffect(() => {
    if (isComplete || isError) {
      const timer = setTimeout(() => {
        onClose(id);
      }, isMobile ? 2000 : 5000); // 2s on mobile, 5s on desktop
      return () => clearTimeout(timer);
    }
  }, [isComplete, isError, id, onClose, isMobile]);

  const getIcon = () => {
    if (isError) return <AlertCircle className={isMobile ? "w-4 h-4 text-red-500" : "w-5 h-5 text-red-500"} />;
    if (isComplete) return <CheckCircle2 className={isMobile ? "w-4 h-4 text-green-500" : "w-5 h-5 text-green-500"} />;
    
    const act = (action || '').toLowerCase();
    const iconClass = isMobile ? "w-4 h-4" : "w-5 h-5";
    if (type === 'delete' || act.includes('deleting')) return <Trash2 className={`${iconClass} text-red-500`} />;
    if (type === 'restore' || act.includes('restoring')) return <RotateCcw className={`${iconClass} text-blue-500`} />;
    if (type === 'archive' || act.includes('archiving')) return <Archive className={`${iconClass} text-yellow-500`} />;
    return <Upload className={`${iconClass} text-primary-500`} />;
  };

  // Format action text
  const getActionText = () => {
    if (isError) return 'Failed';
    
    const act = (action || title || 'Processing').toLowerCase();
    
    if (isComplete) {
      // Past tense for completed actions
      if (act.includes('uploading')) return 'Uploaded';
      if (act.includes('archiving')) return 'Archived';
      if (act.includes('restoring')) return 'Restored';
      if (act.includes('deleting')) return 'Deleted';
      if (act.includes('saving')) return 'Saved';
      return 'Complete';
    }
    
    // Present continuous for ongoing actions
    if (bulkProgress) {
      // For bulk operations, show progress
      const displayAction = action ? action.charAt(0).toUpperCase() + action.slice(1) : 'Processing';
      return `${displayAction} ${bulkProgress.current} of ${bulkProgress.total}`;
    }
    
    // Capitalize first letter
    return action ? action.charAt(0).toUpperCase() + action.slice(1) : (title || 'Processing');
  };

  const getProgressPercentage = () => {
    if (bulkProgress) {
      return Math.floor((bulkProgress.current / bulkProgress.total) * 100);
    }
    return progress || 0;
  };

  // Mobile minimal version
  if (isMobile) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50, transition: { duration: 0.15 } }}
        className="bg-white shadow-lg border border-neutral-200 pointer-events-auto rounded-l-lg"
      >
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex-shrink-0">
            {isProcessing ? (
              <div className="animate-spin">{getIcon()}</div>
            ) : (
              getIcon()
            )}
          </div>
          <span className="text-[11px] font-semibold text-neutral-900 whitespace-nowrap tracking-tight">
            {isComplete ? 'Completed' : isError ? 'Failed' : getActionText()}
          </span>
        </div>
      </motion.div>
    );
  }

  // Desktop version
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50, transition: { duration: 0.15 } }}
      className="bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden pointer-events-auto"
      style={{ width: getToastWidth() }}
    >
      <div className="p-3 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isProcessing ? (
            <div className="animate-spin">{getIcon()}</div>
          ) : (
            getIcon()
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-bold text-neutral-900 tracking-tight">{getActionText()}</h4>
          {fileName && (
            <p className="text-[11px] text-neutral-600 break-words mt-1">{fileName}</p>
          )}
          {message && (
            <p className="text-[11px] text-neutral-500 mt-1">{message}</p>
          )}
          {isProcessing && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    type === 'delete' ? 'bg-red-500' :
                    type === 'restore' ? 'bg-blue-500' :
                    type === 'archive' ? 'bg-yellow-500' :
                    'bg-primary-500'
                  }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => onClose(id)}
          className="p-1 hover:bg-neutral-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>
    </motion.div>
  );
});

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (toasts.length === 0) return null;

  // Mobile: Small right-aligned popups
  if (isMobile) {
    return (
      <div className="fixed top-16 right-0 z-50 flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={removeToast} isMobile={true} />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop: Bottom-right corner
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} isMobile={false} />
        ))}
      </AnimatePresence>
    </div>
  );
};
