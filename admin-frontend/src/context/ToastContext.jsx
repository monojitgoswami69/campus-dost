import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = toast.id || Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast = {
      id,
      status: toast.status || 'pending',
      progress: toast.progress || 0,
      title: toast.title || '',
      message: toast.message || '',
      fileName: toast.fileName || '',
      action: toast.action || '',
      type: toast.type || '',
      bulkProgress: toast.bulkProgress || null,
      ...toast
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);
  const updateToast = useCallback((id, updates) => {
    setToasts((prev) =>
      prev.map((toast) => {
        if (toast.id === id) {
          const updatedToast = { ...toast, ...updates };
          
          // Dispatch data change events when operations complete
          if (updates.status === 'complete' && toast.status !== 'complete') {
            const eventType = toast.type || toast.action?.toLowerCase() || '';
            
            if (eventType.includes('upload') || eventType.includes('uploading')) {
              window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'upload' } }));
            } else if (eventType.includes('archive') || eventType.includes('archiving')) {
              window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'archive' } }));
            } else if (eventType.includes('restore') || eventType.includes('restoring')) {
              window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'restore' } }));
            } else if (eventType.includes('delete') || eventType.includes('deleting')) {
              window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'delete' } }));
            }
          }
          
          return updatedToast;
        }
        return toast;
      })
    );
  }, []);
  
  // Listen for custom events from FileComponents
  React.useEffect(() => {
    const handleAddToast = (e) => addToast(e.detail);
    const handleUpdateToast = (e) => updateToast(e.detail.id, e.detail);
    
    window.addEventListener('add-toast', handleAddToast);
    window.addEventListener('update-toast', handleUpdateToast);
    
    return () => {
      window.removeEventListener('add-toast', handleAddToast);
      window.removeEventListener('update-toast', handleUpdateToast);
    };
  }, [addToast, updateToast]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, title = 'Success') => {
    addToast({ status: 'complete', title, message });
  }, [addToast]);

  const showError = useCallback((message, title = 'Error') => {
    addToast({ status: 'error', title, message });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    updateToast,
    removeToast,
    showSuccess,
    showError
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
