import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { Badge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { cn } from '../utils/helpers';
import { Send, X, Search, RefreshCw, ArrowUp, ArrowDown, ChevronDown, Check } from 'lucide-react';

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
  const [unsolvedQueries, setUnsolvedQueries] = useState([]);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and Filter states
  const [unsolvedQuerySearch, setUnsolvedQuerySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, solved
  
  // Sorting states
  const [unsolvedQueriesSort, setUnsolvedQueriesSort] = useState({ field: 'date', direction: 'desc' });
  
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
      // Mock data - replace with actual API call
      const mockQueries = [
        {
          id: 1,
          question: "Can I change my major in the third year?",
          userEmail: "student123@example.com",
          date: "Jan 10, 2026",
          status: "pending",
          rawDate: new Date('2026-01-10')
        },
        {
          id: 2,
          question: "Are pets allowed in the dorms?",
          userEmail: "another.student@example.com",
          date: "Jan 9, 2026",
          status: "solved",
          rawDate: new Date('2026-01-09')
        },
        {
          id: 3,
          question: "Specific question about research funding for project X",
          userEmail: "research.scholar@example.com",
          date: "Jan 8, 2026",
          status: "pending",
          rawDate: new Date('2026-01-08')
        },
        {
          id: 4,
          question: "How to access the student portal?",
          userEmail: "newstudent@example.com",
          date: "Jan 7, 2026",
          status: "pending",
          rawDate: new Date('2026-01-07')
        },
        {
          id: 5,
          question: "Transcript request process",
          userEmail: "graduate@example.com",
          date: "Jan 6, 2026",
          status: "solved",
          rawDate: new Date('2026-01-06')
        },
        {
          id: 6,
          question: "How do I apply for on-campus housing for next semester?",
          userEmail: "housing.seeker@example.com",
          date: "Jan 5, 2026",
          status: "pending",
          rawDate: new Date('2026-01-05')
        },
        {
          id: 7,
          question: "What are the requirements for graduating with honors?",
          userEmail: "topstudent@example.com",
          date: "Jan 4, 2026",
          status: "solved",
          rawDate: new Date('2026-01-04')
        },
        {
          id: 8,
          question: "Can I take summer courses at another university?",
          userEmail: "summer.student@example.com",
          date: "Jan 3, 2026",
          status: "pending",
          rawDate: new Date('2026-01-03')
        },
        {
          id: 9,
          question: "How do I report a maintenance issue in my dorm room?",
          userEmail: "maintenance.need@example.com",
          date: "Jan 2, 2026",
          status: "solved",
          rawDate: new Date('2026-01-02')
        },
        {
          id: 10,
          question: "Is there a student discount for public transportation?",
          userEmail: "commuter@example.com",
          date: "Jan 1, 2026",
          status: "pending",
          rawDate: new Date('2026-01-01')
        }
      ];

      setUnsolvedQueries(mockQueries);
    } catch (err) {
      showError('Failed to load data');
    } finally {
      if (showRefreshToast) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleAnswer = (queryId) => {
    const query = unsolvedQueries.find(q => q.id === queryId);
    if (query) {
      setSelectedQuery(query);
      setShowAnswerModal(true);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      showError('Please enter an answer');
      return;
    }

    setSubmitting(true);
    try {
      await api.answerQuery(selectedQuery.id, { answer: answer.trim() });
      showSuccess('Answer submitted successfully');
      
      // Update the query status locally
      setUnsolvedQueries(prev => 
        prev.map(q => q.id === selectedQuery.id ? { ...q, status: 'solved' } : q)
      );
      
      handleCloseModal();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAnswerModal(false);
    setSelectedQuery(null);
    setAnswer('');
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', color: 'bg-neutral-100 text-neutral-700' },
    { value: 'pending', label: 'Pending', color: 'bg-red-50 text-red-700' },
    { value: 'solved', label: 'Solved', color: 'bg-green-50 text-green-700' }
  ];

  const selectedStatusOption = statusOptions.find(opt => opt.value === statusFilter) || statusOptions[0];

  // Filtering and searching
  const filteredUnsolvedQueries = unsolvedQueries.filter(query => {
    const matchesSearch = query.question.toLowerCase().includes(unsolvedQuerySearch.toLowerCase()) ||
                         query.userEmail.toLowerCase().includes(unsolvedQuerySearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || query.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting
  const sortedUnsolvedQueries = [...filteredUnsolvedQueries].sort((a, b) => {
    const { field, direction } = unsolvedQueriesSort;
    let comparison = 0;
    
    if (field === 'date') {
      comparison = a.rawDate - b.rawDate;
    } else if (field === 'status') {
      comparison = a.status.localeCompare(b.status);
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field) => {
    setUnsolvedQueriesSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ field }) => {
    if (unsolvedQueriesSort.field !== field) {
      return null;
    }
    return unsolvedQueriesSort.direction === 'asc' 
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
      {/* Unsolved Queries Table */}
      <motion.div 
        className="bg-white rounded-lg sm:rounded-xl border-2 border-neutral-300/60 shadow-md overflow-hidden flex-shrink-0 mb-4"
        variants={cardVariants}
      >
        <div className="p-3 sm:p-4 md:p-6 border-b border-neutral-200">
          <div className="mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900">Unsolved Queries</h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-0.5 sm:mt-1">
              Queries that the bot failed to answer and required human intervention.
            </p>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search questions or emails..."
                value={unsolvedQuerySearch}
                onChange={(e) => {
                  setUnsolvedQuerySearch(e.target.value);
                }}
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
                  {statusFilter === 'all' ? 'All' : statusFilter === 'pending' ? 'Pending' : 'Solved'}
                </span>
                <ChevronDown className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 transition-transform', statusDropdownOpen && 'rotate-180')} />
              </motion.button>
              
              <AnimatePresence>
                {statusDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setStatusDropdownOpen(false)}
                    />
                    
                    {/* Dropdown Menu */}
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
                          <span>
                            {option.label}
                          </span>
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
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[35%] sm:w-[30%] md:w-[25%]">
                  Question
                </th>
                <th className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[25%] md:w-[30%]">
                  User Email
                </th>
                <th 
                  className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors w-[15%] md:w-[15%]"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    Date
                    <SortIcon field="date" />
                  </div>
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[15%] sm:w-[12%] md:w-[12%]">
                  Status
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[15%] sm:w-[13%] md:w-[13%]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sortedUnsolvedQueries.map((query, index) => (
                <motion.tr
                  key={query.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-900 align-middle">
                    <div className="truncate" title={query.question}>
                      "{query.question}"
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-600 align-middle">
                    <div className="truncate" title={query.userEmail}>
                      {query.userEmail}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-neutral-500 whitespace-nowrap text-center align-middle">
                    {query.date}
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center align-middle">
                    {query.status === 'pending' ? (
                      <Badge variant="danger" animate>
                        <span className="text-[10px] sm:text-xs">Pending</span>
                      </Badge>
                    ) : (
                      <Badge variant="success" animate>
                        <span className="text-[10px] sm:text-xs">Solved</span>
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center align-middle">
                    {query.status === 'pending' && (
                      <motion.button
                        onClick={() => handleAnswer(query.id)}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-green-500 hover:bg-green-600 text-white text-[10px] sm:text-xs md:text-sm font-medium rounded-lg transition-colors shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Answer
                      </motion.button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedUnsolvedQueries.length === 0 && (
          <div className="p-4 sm:p-6 md:p-8 text-center text-neutral-500 text-xs sm:text-sm">
            {unsolvedQuerySearch || statusFilter !== 'all' ? 'No queries match your filters' : 'No unsolved queries'}
          </div>
        )}
      </motion.div>

      {/* Answer Modal */}
      <AnimatePresence>
        {showAnswerModal && selectedQuery && (
          <Modal
            isOpen={true}
            onClose={handleCloseModal}
            title="Answer Query"
            size="large"
          >
            <div className="space-y-3 sm:space-y-4">
              {/* Query Info */}
              <div className="bg-neutral-50 rounded-lg p-3 sm:p-4 border border-neutral-200">
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Question</label>
                    <p className="text-xs sm:text-sm text-neutral-900 mt-1 break-words">"{selectedQuery.question}"</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 pt-2 border-t border-neutral-200">
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">User Email</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1 break-all">{selectedQuery.userEmail}</p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase">Date</label>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1">{selectedQuery.date}</p>
                    </div>
                  </div>
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
    </motion.div>
  );
}
