import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2,
  MessageSquare,
  BookOpen,
  Users,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Debounce hook for availability check
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Availability status icon component (for inside input field)
const AvailabilityIcon = ({ status, isChecking }) => {
  if (isChecking) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      </motion.div>
    );
  }

  if (status === 'available') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      </motion.div>
    );
  }

  if (status === 'taken') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <XCircle className="w-5 h-5 text-red-500" />
      </motion.div>
    );
  }

  return null;
};

// Availability status text component (for below input field)
const AvailabilityText = ({ status, isChecking, value }) => {
  if (isChecking) {
    return (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="text-xs text-neutral-500 ml-1"
      >
        Checking availability...
      </motion.p>
    );
  }

  if (status === 'available') {
    return (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="text-xs text-emerald-600 font-medium ml-1"
      >
        ✓ {value} is available
      </motion.p>
    );
  }

  if (status === 'taken') {
    return (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="text-xs text-red-600 font-medium ml-1"
      >
        ✗ {value} is already taken
      </motion.p>
    );
  }

  return null;
};

// Feature card for landing page
const FeatureCard = ({ icon: Icon, title, description, delay, gradient }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ 
      delay, 
      duration: 0.5, 
      type: 'spring', 
      stiffness: 200, 
      damping: 20 
    }}
    whileHover={{ 
      y: -5, 
      scale: 1.02,
      transition: { duration: 0.2 }
    }}
    className="group relative p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-neutral-200/50 shadow-lg shadow-neutral-200/30 hover:shadow-xl hover:shadow-indigo-200/30 transition-all duration-300"
  >
    <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="font-semibold text-neutral-800 text-lg mb-2">{title}</h3>
    <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
  </motion.div>
);

// Input field component with animations
const AnimatedInput = ({ 
  icon: Icon, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  error,
  rightElement,
  showPasswordToggle,
  showPassword,
  onTogglePassword,
  availabilityStatus,
  isCheckingAvailability
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div 
      className="space-y-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider ml-1">
        {label}
      </label>
      <div className="relative group">
        <motion.div
          animate={{ 
            color: error ? '#ef4444' : isFocused ? '#6366f1' : '#9ca3af'
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        <input
          type={showPasswordToggle ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full pl-10 sm:pl-12 ${rightElement ? 'pr-12 sm:pr-14' : showPasswordToggle ? 'pr-10 sm:pr-12' : 'pr-4'} py-3 sm:py-4 bg-white border-2 rounded-xl outline-none text-neutral-800 placeholder-neutral-400 transition-all duration-200 text-xs sm:text-sm placeholder:truncate ${
            error
              ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-4 focus:ring-red-100'
              : isFocused
                ? 'border-indigo-400 bg-white focus:ring-4 focus:ring-indigo-100'
                : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
          }`}
          placeholder={placeholder}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            className="text-xs text-red-500 ml-1"
          >
            {error}
          </motion.p>
        )}
        {!error && (availabilityStatus || isCheckingAvailability) && (
          <AvailabilityText status={availabilityStatus} isChecking={isCheckingAvailability} value={value} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // View states: 'landing', 'login', 'register'
  const [view, setView] = useState('landing');
  const [registrationStep, setRegistrationStep] = useState(1); // 1: orgID + password, 2: orgName + email
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '',
    organisationId: '',
    organisationName: '',
    username: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Availability check states
  const [orgIdAvailability, setOrgIdAvailability] = useState(null); // 'available', 'taken', null
  const [isCheckingOrgId, setIsCheckingOrgId] = useState(false);
  
  // Debounced value for availability check
  const debouncedOrgId = useDebounce(formData.organisationId, 500);

  // Check organisation ID availability
  useEffect(() => {
    const checkAvailability = async () => {
      if (!debouncedOrgId || debouncedOrgId.length < 3) {
        setOrgIdAvailability(null);
        return;
      }

      setIsCheckingOrgId(true);
      try {
        // TODO: Replace with actual API endpoint when available
        const response = await fetch(`${API_URL}/api/v1/auth/check-org-id?org_id=${encodeURIComponent(debouncedOrgId)}`);
        if (response.ok) {
          const data = await response.json();
          setOrgIdAvailability(data.available ? 'available' : 'taken');
        } else {
          // If endpoint doesn't exist yet, simulate available
          setOrgIdAvailability('available');
        }
      } catch (error) {
        // Fallback: assume available if can't check
        console.log('Availability check not available, assuming available');
        setOrgIdAvailability('available');
      } finally {
        setIsCheckingOrgId(false);
      }
    };

    if (view === 'register') {
      checkAvailability();
    }
  }, [debouncedOrgId, view]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    // Reset availability when orgId changes
    if (field === 'organisationId') {
      setOrgIdAvailability(null);
    }
  };

  const switchView = (newView) => {
    setView(newView);
    setRegistrationStep(1);
    setFormData({ email: '', password: '', organisationId: '', organisationName: '', username: '' });
    setErrors({});
    setShowPassword(false);
    setOrgIdAvailability(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    if (!formData.username.trim()) {
      setErrors({ username: 'Please enter your username' });
      return;
    }
    if (!formData.password) {
      setErrors({ password: 'Please enter your password' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      if (result && result.success) {
        navigate('/dashboard');
      } else if (result && result.error) {
        if (result.error.includes('username') || result.error.includes('not found')) {
          setErrors({ username: 'Account not found' });
        } else if (result.error.includes('password') || result.error.includes('credentials')) {
          setErrors({ password: 'Invalid credentials' });
        } else {
          setErrors({ general: result.error });
        }
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      setErrors({ general: 'Network error. Please try again.' });
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStep1 = (e) => {
    e.preventDefault();
    setErrors({});

    // Step 1 Validation: orgID and password
    if (formData.organisationId.length < 3) {
      setErrors({ organisationId: 'Organisation ID must be at least 3 characters' });
      return;
    }
    if (orgIdAvailability === 'taken') {
      setErrors({ organisationId: 'This Organisation ID is already taken' });
      return;
    }
    if (formData.password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    // Move to step 2
    setRegistrationStep(2);
  };

  const handleRegisterStep2 = async (e) => {
    e.preventDefault();
    setErrors({});

    // Step 2 Validation: orgName and email
    if (!formData.organisationName.trim()) {
      setErrors({ organisationName: 'Please enter your organisation name' });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(
        formData.email, 
        formData.organisationId,
        formData.password,
        formData.organisationName
      );
      if (result && result.success) {
        navigate('/dashboard');
      } else if (result && result.error) {
        if (result.error.includes('email')) {
          setErrors({ email: 'Email already registered' });
        } else if (result.error.includes('org') || result.error.includes('ID')) {
          setErrors({ organisationId: result.error });
          // Go back to step 1 if org ID error
          setRegistrationStep(1);
        } else {
          setErrors({ general: result.error });
        }
      }
    } catch (err) {
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.5, 
        type: 'spring', 
        stiffness: 200, 
        damping: 25 
      }
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      scale: 0.98,
      transition: { duration: 0.3 }
    }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-gradient-to-br from-indigo-200/40 to-purple-200/40 rounded-full filter blur-[100px]"
        />
        <motion.div
          animate={{ 
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-gradient-to-tr from-emerald-200/30 to-cyan-200/30 rounded-full filter blur-[100px]"
        />
        <motion.div
          animate={{ 
            x: [0, 15, 0],
            y: [0, 15, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[30%] left-[10%] w-[25%] h-[25%] bg-gradient-to-br from-pink-200/20 to-orange-200/20 rounded-full filter blur-[80px]"
        />
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          /* ============ LANDING PAGE ============ */
          <motion.div
            key="landing"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-screen w-full flex flex-col p-4 sm:p-6 md:p-8 lg:p-12 relative z-10 overflow-y-auto"
          >
            {/* Header with Logo and Brand */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-12 lg:mb-16"
            >
              <div className="relative">
                <img 
                  src={logoImg} 
                  alt="Campus Dost Logo" 
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 object-contain"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                Campus Dost
              </h1>
            </motion.div>

            {/* Main Content - Centered */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
              {/* Tagline */}
              <motion.h2 
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-neutral-800 leading-tight tracking-tight text-center px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Your Intelligent{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                  Campus Assistant
                </span>
              </motion.h2>

              {/* Description */}
              <motion.p 
                className="text-neutral-500 text-xs sm:text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed px-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Empowering institutions with AI-powered guidance for academics, campus life, and beyond. 
                Manage your knowledge base with elegance.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 w-full max-w-md"
              >
                <motion.button
                  onClick={() => switchView('register')}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm sm:text-base font-semibold rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all duration-300 flex items-center justify-center gap-2 group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Join Us</span>
                </motion.button>

                <motion.button
                  onClick={() => switchView('login')}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-neutral-50 text-neutral-800 text-sm sm:text-base font-semibold rounded-xl border-2 border-neutral-200 hover:border-neutral-300 shadow-lg shadow-neutral-200/30 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.div>
            </div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-xs text-neutral-400 mt-8"
            >
              © 2026 Campus Dost.
            </motion.p>
          </motion.div>
        )}

        {view === 'login' && (
          /* ============ LOGIN PAGE ============ */
          <motion.div
            key="login"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              className="w-full max-w-md space-y-6 bg-white/80 backdrop-blur-xl p-6 sm:p-8 lg:p-10 rounded-3xl border border-neutral-200/50 shadow-2xl shadow-neutral-200/50"
            >
              {/* Back Button */}
              <motion.button
                onClick={() => switchView('landing')}
                className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 transition-colors group"
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </motion.button>

              {/* Header */}
              <motion.div 
                className="text-center space-y-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800">Welcome back</h1>
                <p className="text-sm text-neutral-500">Sign in to access your dashboard</p>
              </motion.div>

              {/* Form */}
              <motion.form 
                onSubmit={handleLogin}
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <AnimatedInput
                  icon={User}
                  label="Username"
                  value={formData.username}
                  onChange={(val) => handleInputChange('username', val)}
                  placeholder="Enter your username"
                  error={errors.username}
                />

                <AnimatedInput
                  icon={Lock}
                  label="Password"
                  value={formData.password}
                  onChange={(val) => handleInputChange('password', val)}
                  placeholder="Enter your password"
                  error={errors.password}
                  showPasswordToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />

                {/* General Error */}
                <AnimatePresence>
                  {errors.general && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center"
                    >
                      {errors.general}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  whileHover={{ scale: isLoading ? 1 : 1.01 }}
                  whileTap={{ scale: isLoading ? 1 : 0.99 }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </motion.button>
              </motion.form>

              {/* Switch to Register */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-sm text-neutral-500"
              >
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Sign up
                </button>
              </motion.p>

            </motion.div>
          </motion.div>
        )}

        {view === 'register' && (
          /* ============ REGISTER PAGE ============ */
          <motion.div
            key="register"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              className="w-full max-w-md space-y-6 bg-white/80 backdrop-blur-xl p-6 sm:p-8 lg:p-10 rounded-3xl border border-neutral-200/50 shadow-2xl shadow-neutral-200/50 my-8"
            >
              {/* Back Button */}
              <motion.button
                onClick={() => switchView('landing')}
                className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 transition-colors group"
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </motion.button>

              {/* Header */}
              <motion.div 
                className="text-center space-y-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800">Create your account</h1>
                <p className="text-sm text-neutral-500">
                  {registrationStep === 1 ? 'Step 1 of 2: Organization Setup' : 'Step 2 of 2: Your Details'}
                </p>
              </motion.div>

              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2">
                <div className={`h-2 w-16 rounded-full transition-all duration-300 ${
                  registrationStep === 1 ? 'bg-indigo-600' : 'bg-emerald-500'
                }`} />
                <div className={`h-2 w-16 rounded-full transition-all duration-300 ${
                  registrationStep === 2 ? 'bg-indigo-600' : 'bg-neutral-200'
                }`} />
              </div>

              {/* Step 1 Form: OrgID + Password */}
              {registrationStep === 1 && (
                <motion.form
                  key="step1"
                  onSubmit={handleRegisterStep1}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Organisation ID */}
                  <AnimatedInput
                    icon={Building2}
                    label="Organisation ID"
                    value={formData.organisationId}
                    onChange={(val) => handleInputChange('organisationId', val.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder="e.g., stanford-2024"
                    error={errors.organisationId}
                    rightElement={
                      formData.organisationId.length >= 3 && (
                        <AvailabilityIcon 
                          status={orgIdAvailability} 
                          isChecking={isCheckingOrgId}
                        />
                      )
                    }
                    availabilityStatus={formData.organisationId.length >= 3 ? orgIdAvailability : null}
                    isCheckingAvailability={isCheckingOrgId}
                  />

                  {/* Password */}
                  <AnimatedInput
                    icon={Lock}
                    label="Password"
                    value={formData.password}
                    onChange={(val) => handleInputChange('password', val)}
                    placeholder="Min. 8 characters"
                    error={errors.password}
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                  />

                  {/* Next Button */}
                  <motion.button
                    type="submit"
                    disabled={orgIdAvailability === 'taken'}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    whileHover={{ scale: orgIdAvailability === 'taken' ? 1 : 1.01 }}
                    whileTap={{ scale: orgIdAvailability === 'taken' ? 1 : 0.99 }}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </motion.button>
                </motion.form>
              )}

              {/* Step 2 Form: OrgName + Email */}
              {registrationStep === 2 && (
                <motion.form
                  key="step2"
                  onSubmit={handleRegisterStep2}
                  className="space-y-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Organisation Name */}
                  <AnimatedInput
                    icon={Users}
                    label="Organisation Name"
                    value={formData.organisationName}
                    onChange={(val) => handleInputChange('organisationName', val)}
                    placeholder="Your institution name"
                    error={errors.organisationName}
                  />

                  {/* Email */}
                  <AnimatedInput
                    icon={Mail}
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(val) => handleInputChange('email', val)}
                    placeholder="admin@institution.edu"
                    error={errors.email}
                  />

                  {/* General Error */}
                  <AnimatePresence>
                    {errors.general && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center"
                      >
                        {errors.general}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setRegistrationStep(1)}
                      className="w-1/3 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Back
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                      whileHover={{ scale: isLoading ? 1 : 1.01 }}
                      whileTap={{ scale: isLoading ? 1 : 0.99 }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Create Account</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.form>
              )}

              {/* Switch to Login */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-sm text-neutral-500"
              >
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Sign in
                </button>
              </motion.p>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
