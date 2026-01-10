import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { Badge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { cn } from '../utils/helpers';
import { Send, X, Search, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Check } from 'lucide-react';

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

export default function QueryAnalytics() {
  const [loading, setLoading] = useState(true);
  const [studentQueries, setStudentQueries] = useState([]);
  const [unsolvedQueries, setUnsolvedQueries] = useState([]);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showQueryDetailModal, setShowQueryDetailModal] = useState(false);
  const [selectedStudentQuery, setSelectedStudentQuery] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and Filter states
  const [studentQuerySearch, setStudentQuerySearch] = useState('');
  const [unsolvedQuerySearch, setUnsolvedQuerySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, solved
  
  // Pagination states
  const [studentQueriesPage, setStudentQueriesPage] = useState(1);
  const [unsolvedQueriesPage, setUnsolvedQueriesPage] = useState(1);
  const [itemsPerPage] = useState(5);
  
  // Sorting states
  const [studentQueriesSort, setStudentQueriesSort] = useState({ field: 'timestamp', direction: 'desc' });
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
      // Mock data - replace with actual API calls
      setStudentQueries([
        {
          id: 1,
          query: "When are the semester exams?",
          confidence: 98,
          response: "The final semester exams start on March 15th, 2026 and will continue until March 30th, 2026. The exam schedule has been posted on the student portal under 'Academic Calendar'. Students are advised to check their individual exam timetables for specific dates and times. Please ensure you arrive at the examination hall at least 30 minutes before the scheduled start time.",
          timestamp: "2026-01-10",
          timestampValue: new Date('2026-01-10').getTime()
        },
        {
          id: 2,
          query: "hostel fee structure",
          confidence: 95,
          response: "The hostel fees are detailed in the accommodation section of our website. For the academic year 2025-2026, single occupancy rooms are $3,500 per semester, double occupancy rooms are $2,800 per semester, and triple occupancy rooms are $2,200 per semester. These fees include utilities, Wi-Fi, and basic maintenance. Meal plans are available separately starting from $1,200 per semester for the basic plan.",
          timestamp: "2026-01-09",
          timestampValue: new Date('2026-01-09').getTime()
        },
        {
          id: 3,
          query: "how to apply for scholarship",
          confidence: 72,
          response: "I found some information on scholarships available at our institution. To apply, you need to log into the student portal and navigate to the 'Financial Aid' section. There, you'll find various scholarship opportunities including merit-based, need-based, and department-specific scholarships. The application deadline for the spring semester is typically February 1st. Required documents include your academic transcripts, a personal statement, and two letters of recommendation. For more specific guidance, I recommend contacting the Financial Aid Office at financialaid@university.edu or calling (555) 123-4567.",
          timestamp: "2026-01-08",
          timestampValue: new Date('2026-01-08').getTime()
        },
        {
          id: 4,
          query: "What are the library hours?",
          confidence: 88,
          response: "The library is open from 8 AM to 10 PM Monday through Friday during the regular semester. On Saturdays, the library operates from 10 AM to 6 PM, and on Sundays from 12 PM to 8 PM. During finals week, the library extends its hours to 24/7 access. Please note that the reference desk is staffed from 9 AM to 5 PM on weekdays. Study rooms can be reserved online through the library website.",
          timestamp: "2026-01-07",
          timestampValue: new Date('2026-01-07').getTime()
        },
        {
          id: 5,
          query: "course registration deadline",
          confidence: 91,
          response: "Course registration closes on January 20th, 2026 for the Spring semester. Students must complete their registration before this deadline to avoid late registration fees of $100. Early registration is highly encouraged as popular courses fill up quickly. You can add or drop courses without penalty until January 27th, 2026. After this date, withdrawals will appear on your transcript. For assistance with course selection, please schedule an appointment with your academic advisor.",
          timestamp: "2026-01-06",
          timestampValue: new Date('2026-01-06').getTime()
        },
        {
          id: 6,
          query: "parking permit application",
          confidence: 85,
          response: "You can apply for parking permits through the Campus Security Office website at security.university.edu/parking. The application process requires your vehicle information, including make, model, year, and license plate number. Student parking permits cost $150 per semester for regular lots and $300 per semester for premium covered parking. Applications are processed within 3-5 business days. Once approved, you can pick up your physical permit at the Security Office in Building A, Room 105, or opt for a digital permit that can be displayed on your phone.",
          timestamp: "2026-01-05",
          timestampValue: new Date('2026-01-05').getTime()
        }
      ]);

      setUnsolvedQueries([
        {
          id: 1,
          question: "Can I change my major in the third year?",
          userEmail: "student123@example.com",
          date: "2024-09-12",
          dateValue: new Date('2024-09-12').getTime(),
          status: "pending"
        },
        {
          id: 2,
          question: "Are pets allowed in the dorms?",
          userEmail: "another.student@example.com",
          date: "2024-09-11",
          dateValue: new Date('2024-09-11').getTime(),
          status: "solved"
        },
        {
          id: 3,
          question: "Specific question about research funding for project X",
          userEmail: "research.scholar@example.com",
          date: "2024-09-10",
          dateValue: new Date('2024-09-10').getTime(),
          status: "pending"
        },
        {
          id: 4,
          question: "How to access the student portal?",
          userEmail: "newstudent@example.com",
          date: "2024-09-09",
          dateValue: new Date('2024-09-09').getTime(),
          status: "pending"
        },
        {
          id: 5,
          question: "Transcript request process",
          userEmail: "graduate@example.com",
          date: "2024-09-08",
          dateValue: new Date('2024-09-08').getTime(),
          status: "solved"
        }
      ]);
      
      if (showRefreshToast) {
        showSuccess('Data refreshed successfully');
      }
    } catch (err) {
      showError('Failed to load query analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAnswer = (queryId) => {
    const query = unsolvedQueries.find(q => q.id === queryId);
    if (query) {
      setSelectedQuery(query);
      setAnswer('');
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
      // TODO: Add API call to submit answer
      // await api.queries.submitAnswer(selectedQuery.id, answer);
      
      // For now, just show success and update local state
      showSuccess('Answer submitted successfully');
      
      // Update the query status to 'solved'
      setUnsolvedQueries(prev => 
        prev.map(q => q.id === selectedQuery.id ? { ...q, status: 'solved' } : q)
      );
      
      setShowAnswerModal(false);
      setSelectedQuery(null);
      setAnswer('');
    } catch (err) {
      showError('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAnswerModal(false);
    setSelectedQuery(null);
    setAnswer('');
  };

  const handleQueryClick = (query) => {
    setSelectedStudentQuery(query);
    setShowQueryDetailModal(true);
  };

  const handleCloseQueryDetailModal = () => {
    setShowQueryDetailModal(false);
    setSelectedStudentQuery(null);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
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
  const filteredStudentQueries = studentQueries.filter(query => {
    const matchesSearch = query.query.toLowerCase().includes(studentQuerySearch.toLowerCase()) ||
                         query.response.toLowerCase().includes(studentQuerySearch.toLowerCase());
    return matchesSearch;
  });

  const filteredUnsolvedQueries = unsolvedQueries.filter(query => {
    const matchesSearch = query.question.toLowerCase().includes(unsolvedQuerySearch.toLowerCase()) ||
                         query.userEmail.toLowerCase().includes(unsolvedQuerySearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || query.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting
  const sortedStudentQueries = [...filteredStudentQueries].sort((a, b) => {
    const { field, direction } = studentQueriesSort;
    let aValue, bValue;
    
    if (field === 'confidence') {
      aValue = a.confidence;
      bValue = b.confidence;
    } else if (field === 'timestamp') {
      aValue = a.timestampValue;
      bValue = b.timestampValue;
    } else {
      aValue = a[field];
      bValue = b[field];
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedUnsolvedQueries = [...filteredUnsolvedQueries].sort((a, b) => {
    const { field, direction } = unsolvedQueriesSort;
    let aValue, bValue;
    
    if (field === 'date') {
      aValue = a.dateValue;
      bValue = b.dateValue;
    } else {
      aValue = a[field];
      bValue = b[field];
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const paginatedStudentQueries = sortedStudentQueries.slice(
    (studentQueriesPage - 1) * itemsPerPage,
    studentQueriesPage * itemsPerPage
  );

  const paginatedUnsolvedQueries = sortedUnsolvedQueries.slice(
    (unsolvedQueriesPage - 1) * itemsPerPage,
    unsolvedQueriesPage * itemsPerPage
  );

  const totalStudentPages = Math.ceil(sortedStudentQueries.length / itemsPerPage);
  const totalUnsolvedPages = Math.ceil(sortedUnsolvedQueries.length / itemsPerPage);

  const handleSort = (table, field) => {
    if (table === 'student') {
      setStudentQueriesSort(prev => ({
        field,
        direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setUnsolvedQueriesSort(prev => ({
        field,
        direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    }
  };

  const SortIcon = ({ table, field }) => {
    const sort = table === 'student' ? studentQueriesSort : unsolvedQueriesSort;
    if (sort.field !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sort.direction === 'asc' ? 
      <ArrowUp className="w-3.5 h-3.5" /> : 
      <ArrowDown className="w-3.5 h-3.5" />;
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex-1 min-h-0 bg-white rounded-xl border-2 border-neutral-300/60 shadow-md flex items-center justify-center">
          <LoadingSpinner text="Loading query analytics..." />
        </div>
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
      {/* Student Query Logs Section */}
      <motion.div 
        className="bg-white rounded-lg sm:rounded-xl border-2 border-neutral-300/60 shadow-md overflow-hidden flex-shrink-0"
        variants={cardVariants}
      >
        <div className="p-3 sm:p-4 md:p-6 border-b border-neutral-200">
          <div className="mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900">Student Query Logs</h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-0.5 sm:mt-1">
              Review recent queries to understand student needs and improve responses.
            </p>
          </div>
          
          {/* Search Bar with Refresh Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search queries or responses..."
                value={studentQuerySearch}
                onChange={(e) => {
                  setStudentQuerySearch(e.target.value);
                  setStudentQueriesPage(1);
                }}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-xs sm:text-sm"
              />
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
          <table className="w-full min-w-[320px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Query
                </th>
                <th 
                  className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors w-16 sm:w-20 md:w-24"
                  onClick={() => handleSort('student', 'confidence')}
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    <span className="hidden xs:inline">Confidence</span>
                    <span className="xs:hidden">Conf.</span>
                    <SortIcon table="student" field="confidence" />
                  </div>
                </th>
                <th className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Response
                </th>
                <th className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-16 sm:w-24 md:w-32">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {paginatedStudentQueries.map((query, index) => (
                <motion.tr
                  key={query.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleQueryClick(query)}
                  className="hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-900 align-middle">
                    <div className="max-w-[180px] xs:max-w-[220px] sm:max-w-xs truncate" title={query.query}>
                      "{query.query}"
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-center align-middle">
                    <span className={cn('font-semibold', getConfidenceColor(query.confidence))}>
                      {query.confidence}%
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-600 align-middle">
                    <div className="max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-3xl truncate" title={query.response}>
                      "{query.response}"
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-neutral-500 whitespace-nowrap align-middle">
                    {query.timestamp}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedStudentQueries.length === 0 && (
          <div className="p-4 sm:p-6 md:p-8 text-center text-neutral-500 text-xs sm:text-sm">
            {studentQuerySearch ? 'No queries match your search' : 'No query logs available'}
          </div>
        )}

        {/* Pagination Controls */}
        {sortedStudentQueries.length > 0 && (
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 bg-neutral-50">
            <div className="text-[10px] sm:text-xs md:text-sm text-neutral-600 text-center sm:text-left">
              Showing {((studentQueriesPage - 1) * itemsPerPage) + 1} to {Math.min(studentQueriesPage * itemsPerPage, sortedStudentQueries.length)} of {sortedStudentQueries.length} queries
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={() => setStudentQueriesPage(prev => Math.max(1, prev - 1))}
                disabled={studentQueriesPage === 1}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border-2 border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: studentQueriesPage === 1 ? 1 : 1.05 }}
                whileTap={{ scale: studentQueriesPage === 1 ? 1 : 0.95 }}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.button>
              <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium">
                {studentQueriesPage} / {totalStudentPages}
              </span>
              <motion.button
                onClick={() => setStudentQueriesPage(prev => Math.min(totalStudentPages, prev + 1))}
                disabled={studentQueriesPage === totalStudentPages}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border-2 border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: studentQueriesPage === totalStudentPages ? 1 : 1.05 }}
                whileTap={{ scale: studentQueriesPage === totalStudentPages ? 1 : 0.95 }}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Unsolved Queries Section */}
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
          
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search questions or emails..."
                value={unsolvedQuerySearch}
                onChange={(e) => {
                  setUnsolvedQuerySearch(e.target.value);
                  setUnsolvedQueriesPage(1);
                }}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-xs sm:text-sm"
              />
            </div>
            
            {/* Custom Dropdown */}
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
                            setUnsolvedQueriesPage(1);
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  User Email
                </th>
                <th 
                  className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors w-16 sm:w-20 md:w-28"
                  onClick={() => handleSort('unsolved', 'date')}
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    Date
                    <SortIcon table="unsolved" field="date" />
                  </div>
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-16 sm:w-20 md:w-24">
                  Status
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-16 sm:w-20 md:w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {paginatedUnsolvedQueries.map((query, index) => (
                <motion.tr
                  key={query.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-900 align-middle">
                    <div className="max-w-[140px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl truncate" title={query.question}>
                      "{query.question}"
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-600 align-middle">
                    <div className="max-w-[120px] sm:max-w-xs md:max-w-sm lg:max-w-md truncate" title={query.userEmail}>
                      {query.userEmail}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-neutral-500 whitespace-nowrap align-middle">
                    {query.date}
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 align-middle">
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
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 align-middle">
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

        {/* Pagination Controls */}
        {sortedUnsolvedQueries.length > 0 && (
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 bg-neutral-50">
            <div className="text-[10px] sm:text-xs md:text-sm text-neutral-600 text-center sm:text-left">
              Showing {((unsolvedQueriesPage - 1) * itemsPerPage) + 1} to {Math.min(unsolvedQueriesPage * itemsPerPage, sortedUnsolvedQueries.length)} of {sortedUnsolvedQueries.length} queries
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={() => setUnsolvedQueriesPage(prev => Math.max(1, prev - 1))}
                disabled={unsolvedQueriesPage === 1}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border-2 border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: unsolvedQueriesPage === 1 ? 1 : 1.05 }}
                whileTap={{ scale: unsolvedQueriesPage === 1 ? 1 : 0.95 }}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.button>
              <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium">
                {unsolvedQueriesPage} / {totalUnsolvedPages}
              </span>
              <motion.button
                onClick={() => setUnsolvedQueriesPage(prev => Math.min(totalUnsolvedPages, prev + 1))}
                disabled={unsolvedQueriesPage === totalUnsolvedPages}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border-2 border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: unsolvedQueriesPage === totalUnsolvedPages ? 1 : 1.05 }}
                whileTap={{ scale: unsolvedQueriesPage === totalUnsolvedPages ? 1 : 0.95 }}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Query Detail Modal */}
      <AnimatePresence>
        {showQueryDetailModal && selectedStudentQuery && (
          <Modal
            isOpen={true}
            onClose={handleCloseQueryDetailModal}
            title="Query Details"
            size="large"
          >
            <div className="space-y-3 sm:space-y-4">
              {/* Query Information */}
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-3 sm:p-4 md:p-5 border-2 border-primary-200">
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-primary-700 uppercase tracking-wide">Query</label>
                    <p className="text-sm sm:text-base text-neutral-900 mt-1 sm:mt-1.5 font-medium break-words">"{selectedStudentQuery.query}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 pt-2 sm:pt-3 border-t border-primary-200">
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-primary-700 uppercase tracking-wide">Confidence Score</label>
                      <p className={cn('text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1', getConfidenceColor(selectedStudentQuery.confidence))}>
                        {selectedStudentQuery.confidence}%
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-primary-700 uppercase tracking-wide">Timestamp</label>
                      <p className="text-xs sm:text-sm text-neutral-700 mt-1 sm:mt-1.5 font-medium">{selectedStudentQuery.timestamp}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Section */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-neutral-900 mb-1.5 sm:mb-2">
                  Bot Response
                </label>
                <div className="bg-neutral-50 rounded-lg p-3 sm:p-4 border-2 border-neutral-200 min-h-[100px] sm:min-h-[120px] max-h-[300px] overflow-y-auto">
                  <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap break-words">
                    {selectedStudentQuery.response}
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

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
              {/* Query Details */}
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