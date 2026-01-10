import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Save, History, FileText } from 'lucide-react';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { Modal } from '../components/UI/Modal';
import { cn } from '../utils/helpers';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } }
};

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export default function SystemInstructionsPage() {
  const [instructions, setInstructions] = useState('');
  const [originalInstructions, setOriginalInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError } = useToast();

  const hasUnsavedChanges = instructions !== originalInstructions;

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    setLoading(true);
    try {
      const data = await api.systemInstructions.get();
      const content = data.content || '';
      setInstructions(content);
      setOriginalInstructions(content);
    } catch (err) {
      showError('Failed to load instructions');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.systemInstructions.getHistory(3);
      setHistory(data.history || []);
    } catch (err) {
      showError('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.systemInstructions.save(instructions);
      setOriginalInstructions(instructions);
      showSuccess('Instructions saved successfully');
    } catch (err) {
      showError('Failed to save instructions');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreFromHistory = (item) => {
    setInstructions(item.content);
    setShowHistory(false);
    setSelectedHistoryItem(null);
    showSuccess('Instructions restored from history');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex-1 min-h-0 bg-white rounded-lg border border-neutral-200 flex items-center justify-center">
          <LoadingSpinner text="Loading system instructions..." />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="h-full flex flex-col gap-4"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div 
        className="flex-1 min-h-0 bg-white rounded-lg border border-neutral-200 flex flex-col overflow-hidden"
        variants={cardVariants}
      >
        <div className="p-3 border-b border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg border border-amber-200">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Unsaved</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg border border-green-200">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Saved</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShowHistory}
              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200"
              title="History"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 relative min-h-0">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="absolute inset-0 w-full h-full p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed text-neutral-900 bg-white placeholder-neutral-400"
            placeholder="Enter system instructions..."
            spellCheck={false}
          />
          <button 
            onClick={handleCopy}
            className={cn(
              "absolute top-4 right-4 p-2 rounded-lg transition-colors border flex items-center gap-1.5 px-3 bg-white shadow-sm z-10",
              copied 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "text-neutral-600 hover:bg-neutral-50 border-neutral-200"
            )}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium">Copied!</span>
              </>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
        <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500 text-right flex-shrink-0">
          {instructions.length} characters
        </div>
      </motion.div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowHistory(false);
              setSelectedHistoryItem(null);
            }}
            title="Instruction History"
          >
          <div className="space-y-3 sm:space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : history.length === 0 ? (
              <p className="text-neutral-500 text-center py-6 sm:py-8 text-sm">
                No history available yet. Changes will appear here after you save instructions.
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs sm:text-sm text-neutral-600 mb-3 sm:mb-4">
                  Showing the last {history.length} change{history.length !== 1 ? 's' : ''}:
                </p>
                {history.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="border-2 border-neutral-300/60 rounded-lg p-2.5 sm:p-4 hover:border-primary-400 transition-colors"
                  >
                    <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 flex-shrink-0" />
                          <span className="font-medium text-neutral-900 text-sm">
                            Version {history.length - index}
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-sm text-neutral-500 mt-1 truncate">
                          Saved by {item.backed_up_by || 'Unknown'} • {formatDate(item.backed_up_at)}
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => setSelectedHistoryItem(selectedHistoryItem === item.id ? null : item.id)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          {selectedHistoryItem === item.id ? 'Hide' : 'View'}
                        </button>
                        <button
                          onClick={() => handleRestoreFromHistory(item)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                    {selectedHistoryItem === item.id && (
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-neutral-200">
                        <div className="bg-neutral-50 rounded-lg p-2 sm:p-3 max-h-48 sm:max-h-60 overflow-auto">
                          <pre className="text-[10px] sm:text-xs font-mono text-neutral-700 whitespace-pre-wrap">
                            {item.content || 'No content available'}
                          </pre>
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-500 mt-1.5 sm:mt-2">
                          {item.content ? `${item.content.length} characters` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
