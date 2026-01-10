import React, { useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useOutletContext, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/UI/ToastContainer';
import ProtectedRoute from './components/ProtectedRoute';
import { Sidebar } from './components/AppShell/Sidebar';
import { Menu, Loader2, RefreshCw } from 'lucide-react';

// Refresh button component for pages that need it
function RefreshButton({ eventName, className = "" }) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent(eventName));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <motion.button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`p-2 sm:p-2.5 text-neutral-600 hover:text-neutral-900 transition-colors flex-shrink-0 touch-target flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] disabled:opacity-50 ${className}`}
      aria-label="Refresh"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Refresh"
    >
      <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
    </motion.button>
  );
}

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const AddDocumentPage = lazy(() => import('./pages/AddDocumentPage'));
const AddTextPage = lazy(() => import('./pages/AddTextPage'));
const QueryAnalyticsPage = lazy(() => import('./pages/QueryAnalytics'));
const UnsolvedQueriesPage = lazy(() => import('./pages/UnsolvedQueries'));
const BotSettingsPage = lazy(() => import('./pages/BotSettings'));
const SystemInstructionsPage = lazy(() => import('./pages/SystemInstructionsPage'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));

function PageLoader() {
  return (
    <motion.div 
      className="flex items-center justify-center min-h-[60vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-primary-600" />
      </motion.div>
    </motion.div>
  );
}

// Page transition variants
const pageTransitionVariants = {
  initial: { 
    opacity: 0, 
    y: 12,
    filter: 'blur(4px)'
  },
  animate: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    filter: 'blur(2px)',
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 0.5]
    }
  }
};

function PageWrapper({ title, actions, children, isFixed = false }) {
  const { onMobileMenuToggle } = useOutletContext();

  return (
    <motion.main 
      id="main-content" 
      className={`flex flex-col px-2 sm:px-3 md:pl-6 md:pr-4 pt-2 sm:pt-3 md:pt-4 ${
        isFixed ? 'h-screen overflow-hidden pb-0' : 'flex-1 pb-2 sm:pb-3 md:pb-4'
      }`}
      style={isFixed ? { height: '100dvh' } : {}}
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Mobile header - only visible when sidebar is hidden */}
      <motion.div 
        className="lg:hidden mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3 flex-shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.button
          onClick={onMobileMenuToggle}
          className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors shadow-sm flex-shrink-0 touch-target flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]"
          aria-label="Toggle navigation"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="w-5 h-5" />
        </motion.button>
        <motion.h1 
          className="text-base sm:text-lg font-bold text-neutral-900 truncate flex-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h1>
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </motion.div>

      <Suspense fallback={<PageLoader />}>
        {/* This container allows the page content to scroll internally if needed, 
            OR expand to fill height if the page is designed that way (like AddTextPage) */}
        <div className={`flex-1 ${
          isFixed ? 'min-h-0 overflow-hidden flex flex-col pb-2 sm:pb-3 md:pb-4' : ''
        }`}>
          {children}
        </div>
      </Suspense>
    </motion.main>
  );
}

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-full min-h-screen w-full bg-neutral-50 text-neutral-900" style={{ minHeight: '100dvh' }}>
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>

      <Sidebar isMobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="lg:ml-60 h-full min-h-screen flex flex-col min-w-0 max-w-full overflow-x-hidden" style={{ minHeight: '100dvh' }}>
        <div className="w-full flex-1 flex flex-col">
          <Outlet context={{ onMobileMenuToggle: () => setMobileMenuOpen(!mobileMenuOpen) }} />
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { showError } = useToast();

  useEffect(() => {
    const handleAuthExpired = () => {
      showError('Session timeout. Please login again to continue.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [showError]);

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        } />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={
            <PageWrapper title="Dashboard">
              <DashboardPage />
            </PageWrapper>
          } />

          <Route path="knowledge-base" element={
            <PageWrapper 
              title="Knowledge Base" 
              actions={<RefreshButton eventName="refresh:knowledge-base" />}
            >
              <KnowledgeBasePage />
            </PageWrapper>
          } />

          <Route path="add-document" element={
            <PageWrapper title="Add Document">
              <AddDocumentPage />
            </PageWrapper>
          } />

          <Route path="add-text" element={
            <PageWrapper title="Add Text" isFixed={true}>
              <AddTextPage />
            </PageWrapper>
          } />

          <Route path="query-analytics" element={
            <PageWrapper title="Query Analytics" isFixed={true}>
              <QueryAnalyticsPage />
            </PageWrapper>
          } />

          <Route path="unsolved-queries" element={
            <PageWrapper title="Unsolved Queries" isFixed={true}>
              <UnsolvedQueriesPage />
            </PageWrapper>
          } />

          <Route path="bot-settings" element={
            <PageWrapper title="Bot Settings" isFixed={true}>
              <BotSettingsPage />
            </PageWrapper>
          } />

          <Route path="system-instructions" element={
            <PageWrapper title="System Instructions" isFixed={true}>
              <SystemInstructionsPage />
            </PageWrapper>
          } />

          <Route path="archive" element={
            <PageWrapper 
              title="Archive" 
              actions={<RefreshButton eventName="refresh:archive" />}
            >
              <ArchivePage />
            </PageWrapper>
          } />

        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <AppContent />
          <ToastContainer />
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
