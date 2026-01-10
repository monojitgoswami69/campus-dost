import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { Modal } from '../components/UI/Modal';
import { cn } from '../utils/helpers';
import { Search, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';

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
  const [showQueryDetailModal, setShowQueryDetailModal] = useState(false);
  const [selectedStudentQuery, setSelectedStudentQuery] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and Filter states
  const [studentQuerySearch, setStudentQuerySearch] = useState('');
  
  // Sorting states
  const [studentQueriesSort, setStudentQueriesSort] = useState({ field: 'timestamp', direction: 'desc' });
  
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
    } catch (err) {
      showError('Failed to load query analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  // Filtering and searching
  const filteredStudentQueries = studentQueries.filter(query => {
    const matchesSearch = query.query.toLowerCase().includes(studentQuerySearch.toLowerCase()) ||
                         query.response.toLowerCase().includes(studentQuerySearch.toLowerCase());
    return matchesSearch;
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

  const handleSort = (field) => {
    setStudentQueriesSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ field }) => {
    if (studentQueriesSort.field !== field) return null;
    return studentQueriesSort.direction === 'asc' ? 
      <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : 
      <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
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
          
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search queries or responses..."
                value={studentQuerySearch}
                onChange={(e) => {
                  setStudentQuerySearch(e.target.value);
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
          <table className="w-full table-fixed">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[30%] md:w-[25%]">
                  Query
                </th>
                <th 
                  className="px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors w-[15%] sm:w-[12%] md:w-[10%]"
                  onClick={() => handleSort('confidence')}
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    <span className="hidden xs:inline">Confidence</span>
                    <span className="xs:hidden">Conf.</span>
                    <SortIcon field="confidence" />
                  </div>
                </th>
                <th className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[45%]">
                  Response
                </th>
                <th className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider w-[20%] md:w-[15%]">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sortedStudentQueries.map((query, index) => (
                <motion.tr
                  key={query.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleQueryClick(query)}
                  className="hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-900 align-middle">
                    <div className="truncate" title={query.query}>
                      "{query.query}"
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-center align-middle">
                    <span className={cn('font-semibold', getConfidenceColor(query.confidence))}>
                      {query.confidence}%
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-neutral-600 align-middle">
                    <div className="truncate" title={query.response}>
                      "{query.response}"
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-neutral-500 whitespace-nowrap text-center align-middle">
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
              {/* Query Info */}
              <div className="rounded-lg p-3 sm:p-4 md:p-5 border border-neutral-200" style={{ backgroundColor: '#f9fafb' }}>
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

              {/* Response */}
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
    </motion.div>
  );
}
