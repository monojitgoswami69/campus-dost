import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { Badge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { cn } from '../utils/helpers';
import { Send, X, Search, RefreshCw, ArrowUp, ArrowDown, ChevronDown, Check, AlertCircle, MessageSquare, Info } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  initial: { opacity: 0, y: 25, scale: 0.97 },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  }
};

export default function UnsolvedQueries() {
  const [loading, setLoading] = useState(true);
  const [handoffs, setHandoffs] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, answered: 0, dismissed: 0 });
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedHandoff, setSelectedHandoff] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, answered, dismissed
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState({ field: 'date', direction: 'desc' });
  
  // Dropdown state
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRefreshToast = false) => {
    if (showRefreshToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Fetch handoffs and stats from API
      const [handoffsResponse, statsResponse] = await Promise.all([
        api.handoffs.list({ limit: 500 }),
        api.handoffs.getStats(),
      ]);

      if (handoffsResponse.status === 'success') {
        // Transform handoffs to match expected format
        const transformedHandoffs = handoffsResponse.handoffs.map(h => ({
          id: h.id,
          question: h.query,
          llmResponse: h.llm_response || '',
          confidence: h.confidence || 0,
          similarityScore: h.similarity_score || 0,
          contextChunks: h.context_chunks || [],
          sessionId: h.session_id || '',
          date: formatDate(h.created_at),
          rawDate: new Date(h.created_at),
          status: h.status,
          answer: h.answer,
          answeredBy: h.answered_by,
          answeredAt: h.answered_at ? formatDate(h.answered_at) : null,
        }));
        setHandoffs(transformedHandoffs);
      }

      if (statsResponse.status === 'success') {
        setStats(statsResponse.stats);
      }

      if (showRefreshToast) {
        showSuccess('Data refreshed successfully');
      }
    } catch (err) {
      console.error('Failed to load handoffs:', err);
      showError('Failed to load handoff requests');
    } finally {
      if (showRefreshToast) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAnswer = (handoffId) => {
    const handoff = handoffs.find(h => h.id === handoffId);
    if (handoff) {
      setSelectedHandoff(handoff);
      setShowAnswerModal(true);
    }
  };

  const handleViewDetails = (handoffId) => {
    const handoff = handoffs.find(h => h.id === handoffId);
    if (handoff) {
      setSelectedHandoff(handoff);
      setShowDetailsModal(true);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      showError('Please enter an answer');
      return;
    }

    setSubmitting(true);
    try {
      await api.handoffs.answer(selectedHandoff.id, answer.trim());
      showSuccess('Answer submitted successfully');
      
      // Update the handoff status locally
      setHandoffs(prev => 
        prev.map(h => h.id === selectedHandoff.id 
          ? { ...h, status: 'answered', answer: answer.trim() } 
          : h
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        answered: prev.answered + 1,
      }));
      
      handleCloseModal();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async (handoffId) => {
    try {
      await api.handoffs.dismiss(handoffId);
      showSuccess('Handoff dismissed');
      
      // Update locally
      setHandoffs(prev => 
        prev.map(h => h.id === handoffId ? { ...h, status: 'dismissed' } : h)
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        dismissed: prev.dismissed + 1,
      }));
    } catch (err) {
      showError('Failed to dismiss handoff');
    }
  };

  const handleCloseModal = () => {
    setShowAnswerModal(false);
    setShowDetailsModal(false);
    setSelectedHandoff(null);
    setAnswer('');
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', color: 'bg-neutral-100 text-neutral-700' },
    { value: 'pending', label: 'Pending', color: 'bg-red-50 text-red-700' },
    { value: 'answered', label: 'Answered', color: 'bg-green-50 text-green-700' },
    { value: 'dismissed', label: 'Dismissed', color: 'bg-neutral-50 text-neutral-500' }
  ];

  const selectedStatusOption = statusOptions.find(opt => opt.value === statusFilter) || statusOptions[0];

  // Filtering and searching
  const filteredHandoffs = handoffs.filter(handoff => {
    const matchesSearch = handoff.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (handoff.llmResponse && handoff.llmResponse.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || handoff.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting - pending first, then by date
  const sortedHandoffs = [...filteredHandoffs].sort((a, b) => {
    // Always put pending first
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    
    // Then sort by date
    const { field, direction } = sortConfig;
    let comparison = 0;
    
    if (field === 'date') {
      comparison = (a.rawDate || 0) - (b.rawDate || 0);
    } else if (field === 'confidence') {
      comparison = (a.confidence || 0) - (b.confidence || 0);
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.field !== field) {
      return null;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      : <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <motion.div 
      className="h-full flex flex-col gap-4 md:gap-6 overflow-y-auto overflow-x-hidden py-2 px-1"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        <motion.div 
          className="bg-white rounded-lg p-4 border-2 border-neutral-200 shadow-sm"
          variants={cardVariants}
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-neutral-500" />
            <span className="text-xs font-medium text-neutral-500 uppercase">Total</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
        </motion.div>
        <motion.div 
          className="bg-white rounded-lg p-4 border-2 border-red-200 shadow-sm"
          variants={cardVariants}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-500 uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
        </motion.div>
        <motion.div 
          className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm"
          variants={cardVariants}
        >
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-green-500 uppercase">Answered</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.answered}</p>
        </motion.div>
        <motion.div 
          className="bg-white rounded-lg p-4 border-2 border-neutral-200 shadow-sm"
          variants={cardVariants}
        >
          <div className="flex items-center gap-2 mb-1">
            <X className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-medium text-neutral-400 uppercase">Dismissed</span>
          </div>
          <p className="text-2xl font-bold text-neutral-500">{stats.dismissed}</p>
        </motion.div>
      </div>

      {/* Handoffs Table */}
      <motion.div 
        className="bg-white rounded-lg sm:rounded-xl border-2 border-neutral-300/60 shadow-md overflow-hidden flex-shrink-0 mb-4"
        variants={cardVariants}
      >
        <div className="p-3 sm:p-4 md:p-6 border-b border-neutral-200">
          <div className="mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900">Human Handoff Requests</h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-0.5 sm:mt-1">
              Queries that the chatbot couldn't answer from context and require human intervention.
            </p>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-xs sm:text-sm"
              />
            </div>
            
            {/* Status Filter Dropdown */}
            <div className="relative flex-shrink-0">
              <motion.button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="w-[110px] sm:w-auto sm:min-w-[140px] px-2.5 sm:px-3 py-1.5 sm:py-2 border-2 border-neutral-300 rounded-lg hover:border-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-xs sm:text-sm font-medium bg-white transition-all shadow-sm flex items-center justify-center gap-1.5"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="hidden xs:inline">
                  {selectedStatusOption.label}
                </span>
                <span className="xs:hidden">
                  {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </span>
                <ChevronDown className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 transition-transform', statusDropdownOpen && 'rotate-180')} />
              </motion.button>
              
              <AnimatePresence>
                {statusDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setStatusDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 w-full bg-white border-2 border-neutral-200 rounded-lg shadow-xl z-20 overflow-hidden"
                    >
                      {statusOptions.map((option, index) => (
                        <motion.button
                          key={option.value}
                          onClick={() => {
                            setStatusFilter(option.value);
                            setStatusDropdownOpen(false);
                          }}
                          className={cn(
                            'w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors flex items-center justify-between gap-2',
                            statusFilter === option.value ? 'bg-primary-50 text-neutral-900' : 'hover:bg-neutral-50 text-neutral-700'
                          )}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ x: 4 }}
                        >
                          <span>{option.label}</span>
                          {statusFilter === option.value && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
              whileHover={{ scale: refreshing ? 1 : 1.05 }}
              whileTap={{ scale: refreshing ? 1 : 0.95 }}
            >
              <RefreshCw className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[40%]">
                  Question
                </th>
                <th 
                  className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors w-[12%]"
                  onClick={() => handleSort('confidence')}
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    Confidence
                    <SortIcon field="confidence" />
                  </div>
                </th>
                <th 
                  className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors w-[15%]"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    Date
                    <SortIcon field="date" />
                  </div>
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[12%]">
                  Status
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[18%]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sortedHandoffs.map((handoff, index) => (
                <motion.tr
                  key={handoff.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-900 align-middle">
                    <div className="truncate" title={handoff.question}>
                      "{handoff.question}"
                    </div>
                    {handoff.llmResponse && (
                      <div className="text-[10px] sm:text-xs text-neutral-500 truncate mt-0.5" title={handoff.llmResponse}>
                        Bot said: {handoff.llmResponse.substring(0, 60)}...
                      </div>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center align-middle">
                    <div className={cn(
                      "text-xs sm:text-sm font-medium",
                      handoff.confidence < 30 ? "text-red-600" : 
                      handoff.confidence < 60 ? "text-yellow-600" : "text-green-600"
                    )}>
                      {handoff.confidence}%
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-neutral-500 whitespace-nowrap text-center align-middle">
                    {handoff.date}
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center align-middle">
                    {handoff.status === 'pending' ? (
                      <Badge variant="danger" animate>
                        <span className="text-[10px] sm:text-xs">Pending</span>
                      </Badge>
                    ) : handoff.status === 'answered' ? (
                      <Badge variant="success" animate>
                        <span className="text-[10px] sm:text-xs">Answered</span>
                      </Badge>
                    ) : (
                      <Badge variant="neutral" animate>
                        <span className="text-[10px] sm:text-xs">Dismissed</span>
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <motion.button
                        onClick={() => handleViewDetails(handoff.id)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] sm:text-xs font-medium rounded transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="View Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </motion.button>
                      {handoff.status === 'pending' && (
                        <>
                          <motion.button
                            onClick={() => handleAnswer(handoff.id)}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-green-500 hover:bg-green-600 text-white text-[10px] sm:text-xs font-medium rounded-lg transition-colors shadow-sm"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Answer
                          </motion.button>
                          <motion.button
                            onClick={() => handleDismiss(handoff.id)}
                            className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-600 text-[10px] sm:text-xs font-medium rounded transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedHandoffs.length === 0 && (
          <div className="p-4 sm:p-6 md:p-8 text-center text-neutral-500 text-xs sm:text-sm">
            {searchQuery || statusFilter !== 'all' ? 'No handoffs match your filters' : 'No handoff requests yet'}
          </div>
        )}
      </motion.div>

      {/* Answer Modal */}
      <AnimatePresence>
        {showAnswerModal && selectedHandoff && (
          <Modal
            isOpen={true}
            onClose={handleCloseModal}
            title="Answer Handoff Request"
            size="large"
          >
            <div className="space-y-3 sm:space-y-4">
              {/* Query Info */}
              <div className="bg-neutral-50 rounded-lg p-3 sm:p-4 border border-neutral-200">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">User's Question</label>
                    <p className="text-xs sm:text-sm text-neutral-900 mt-1 break-words">"{selectedHandoff.query}"</p>
                  </div>
                  
                  {selectedHandoff.llm_response && (
                    <div className="pt-2 border-t border-neutral-200">
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Bot's Response (Uncertain)</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1 break-words bg-yellow-50 p-2 rounded border border-yellow-200">
                        {selectedHandoff.llm_response}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 pt-2 border-t border-neutral-200">
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Confidence</label>
                      <p className={cn(
                        "text-xs sm:text-sm font-medium mt-1",
                        selectedHandoff.confidence < 30 ? "text-red-600" : 
                        selectedHandoff.confidence < 60 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {selectedHandoff.confidence}%
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Similarity Score</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                        {(selectedHandoff.similarity_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Date</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                        {new Date(selectedHandoff.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {selectedHandoff.context_chunks && selectedHandoff.context_chunks.length > 0 && (
                    <div className="pt-2 border-t border-neutral-200">
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Context Used ({selectedHandoff.context_chunks.length} chunks)</label>
                      <div className="mt-1 max-h-24 overflow-y-auto space-y-1">
                        {selectedHandoff.context_chunks.slice(0, 3).map((chunk, i) => (
                          <p key={i} className="text-[10px] sm:text-xs text-neutral-500 bg-neutral-100 p-1.5 rounded truncate">
                            {chunk.substring(0, 150)}...
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Answer Input */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-neutral-900 mb-1.5 sm:mb-2">
                  Your Answer <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={6}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none text-xs sm:text-sm text-neutral-900 placeholder-neutral-400"
                />
                <p className="text-[10px] sm:text-xs text-neutral-500 mt-1">
                  {answer.length} characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-neutral-200">
                <motion.button
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !answer.trim()}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                  whileHover={{ scale: (submitting || !answer.trim()) ? 1 : 1.02 }}
                  whileTap={{ scale: (submitting || !answer.trim()) ? 1 : 0.98 }}
                >
                  {submitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </motion.div>
                      <span className="hidden xs:inline">Submitting...</span>
                      <span className="xs:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedHandoff && (
          <Modal
            isOpen={true}
            onClose={handleCloseModal}
            title="Handoff Request Details"
            size="large"
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-neutral-50 rounded-lg p-3 sm:p-4 border border-neutral-200">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">User's Question</label>
                    <p className="text-xs sm:text-sm text-neutral-900 mt-1 break-words">"{selectedHandoff.query}"</p>
                  </div>
                  
                  {selectedHandoff.llm_response && (
                    <div className="pt-2 border-t border-neutral-200">
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Bot's Response</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1 break-words bg-blue-50 p-2 rounded border border-blue-200">
                        {selectedHandoff.llm_response}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-2 border-t border-neutral-200">
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Status</label>
                      <div className="mt-1">
                        {selectedHandoff.status === 'pending' ? (
                          <Badge variant="danger"><span className="text-xs">Pending</span></Badge>
                        ) : selectedHandoff.status === 'answered' ? (
                          <Badge variant="success"><span className="text-xs">Answered</span></Badge>
                        ) : (
                          <Badge variant="neutral"><span className="text-xs">Dismissed</span></Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Confidence</label>
                      <p className={cn(
                        "text-xs sm:text-sm font-medium mt-1",
                        selectedHandoff.confidence < 30 ? "text-red-600" : 
                        selectedHandoff.confidence < 60 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {selectedHandoff.confidence}%
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Similarity</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                        {(selectedHandoff.similarity_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Created</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                        {new Date(selectedHandoff.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedHandoff.status === 'answered' && selectedHandoff.answer && (
                    <div className="pt-2 border-t border-neutral-200">
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Human Answer</label>
                      <p className="text-xs sm:text-sm text-neutral-900 mt-1 break-words bg-green-50 p-2 rounded border border-green-200">
                        {selectedHandoff.answer}
                      </p>
                      {selectedHandoff.answered_by && (
                        <p className="text-[10px] sm:text-xs text-neutral-500 mt-1">
                          Answered by: {selectedHandoff.answered_by} on {new Date(selectedHandoff.answered_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedHandoff.context_chunks && selectedHandoff.context_chunks.length > 0 && (
                    <div className="pt-2 border-t border-neutral-200">
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Context Chunks ({selectedHandoff.context_chunks.length})</label>
                      <div className="mt-1 max-h-40 overflow-y-auto space-y-2">
                        {selectedHandoff.context_chunks.map((chunk, i) => (
                          <div key={i} className="text-[10px] sm:text-xs text-neutral-600 bg-neutral-100 p-2 rounded">
                            <span className="font-semibold text-neutral-700">Chunk {i + 1}:</span>
                            <p className="mt-1">{chunk}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <motion.button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-medium rounded-lg transition-colors text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
