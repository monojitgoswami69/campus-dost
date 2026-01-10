import React, { useState } from 'react';
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
  Mail
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({ 
    email: '',
    username: '', 
    password: '',
    organisationId: '',
    organisationName: '',
    agreeToTerms: false
  });
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) {
      setError('');
      setErrorField(null);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setFormData({ email: '', username: '', password: '', organisationId: '', organisationName: '', agreeToTerms: false });
    setError('');
    setErrorField(null);
    setShowPassword(false);
  };

  const getErrorInfo = (errorType) => {
    if (mode === 'login') {
      switch (errorType) {
        case 'username_not_found': return { message: 'Account not found', field: 'username' };
        case 'incorrect_password': return { message: 'Invalid credentials', field: 'password' };
        default: return { message: errorType || 'Authentication failed', field: null };
      }
    } else {
      switch (errorType) {
        case 'username_exists': return { message: 'Username already taken', field: 'username' };
        case 'email_exists': return { message: 'Email already registered', field: 'email' };
        case 'weak_password': return { message: 'Password too weak', field: 'password' };
        default: return { message: errorType || 'Registration failed', field: null };
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setErrorField(null);
    setIsLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      if (result && result.success) {
        navigate('/dashboard');
      } else if (result && result.error) {
        const errorInfo = getErrorInfo(result.error);
        setError(errorInfo.message);
        setErrorField(errorInfo.field);
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      const errorInfo = getErrorInfo(err.message);
      setError(errorInfo.message);
      setErrorField(errorInfo.field);
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setErrorField(null);

    if (!formData.agreeToTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(formData.email, formData.username, formData.password);
      if (result && result.success) {
        navigate('/dashboard');
      } else if (result && result.error) {
        const errorInfo = getErrorInfo(result.error);
        setError(errorInfo.message);
        setErrorField(errorInfo.field);
      }
    } catch (err) {
      const errorInfo = getErrorInfo(err.message);
      setError(errorInfo.message);
      setErrorField(errorInfo.field);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = mode === 'login' ? handleLogin : handleRegister;

  return (
    <div className="min-h-screen w-full flex bg-neutral-950 text-neutral-100">
      
      {/* --- LEFT PANEL: Brand & Info --- */}
      <div className="hidden lg:flex w-1/2 relative bg-neutral-900">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-violet-950/30" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }}
        />

        <div className="relative z-10 w-full h-full flex flex-col p-12">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Campus Dost Logo" className="w-10 h-10 object-contain" />
            <span className="font-semibold text-lg text-white">Campus Dost</span>
          </div>

          {/* Main Content - Centered */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="max-w-lg w-full">
              <h2 className="text-5xl font-bold text-white leading-tight mb-6 text-center">
                Your Intelligent
                <br />
                <span className="text-indigo-400">Campus Assistant</span>
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed mb-16 text-center">
                Empowering students with AI-powered guidance for academics, campus life, and beyond.
              </p>

              {/* Feature List */}
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1.5 text-lg">Instant Answers</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">Get quick responses to campus-related queries 24/7</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1.5 text-lg">Knowledge Base</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">Access comprehensive campus information at your fingertips</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                    <Users className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1.5 text-lg">Student Support</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">Personalized assistance for every student's needs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-neutral-600 text-center">
            © 2026 Campus Dost. All rights reserved.
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: Login Form --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative bg-neutral-950">
        {/* Mobile Background */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-neutral-950" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Campus Dost Logo" className="w-12 h-12 object-contain" />
              <span className="font-semibold text-xl text-white">Campus Dost</span>
            </div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-white">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="text-neutral-500 mt-3">
                  {mode === 'login' 
                    ? 'Sign in to access the admin dashboard' 
                    : 'Join the smartest campus community today'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-6 mt-8"
            >
            {/* Email - Only for Register */}
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`block w-full rounded-xl border-2 bg-neutral-900/50 px-4 py-3.5 pl-11 text-sm text-white transition-colors focus:outline-none focus:ring-0 ${
                      errorField === 'email' 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : 'border-neutral-800 hover:border-neutral-700 focus:border-indigo-500'
                    }`}
                    placeholder="student@university.edu"
                    required
                  />
                  <Mail className={`absolute left-4 top-3.5 h-5 w-5 transition-colors ${
                    errorField === 'email' ? 'text-red-400' : 'text-neutral-500 group-focus-within:text-indigo-400'
                  }`} />
                </div>
              </div>
            )}

            {/* Organisation ID - Only for Register */}
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider ml-1">Organisation ID</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={formData.organisationId}
                    onChange={(e) => handleInputChange('organisationId', e.target.value)}
                    className={`block w-full rounded-xl border-2 bg-neutral-900/50 px-4 py-3.5 pl-11 text-sm text-white transition-colors focus:outline-none focus:ring-0 ${
                      errorField === 'organisationId' 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : 'border-neutral-800 hover:border-neutral-700 focus:border-indigo-500'
                    }`}
                    placeholder="ORG-12345"
                    required
                  />
                  <Users className={`absolute left-4 top-3.5 h-5 w-5 transition-colors ${
                    errorField === 'organisationId' ? 'text-red-400' : 'text-neutral-500 group-focus-within:text-indigo-400'
                  }`} />
                </div>
              </div>
            )}

            {/* Organisation Name - Only for Register */}
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider ml-1">Organisation Name</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={formData.organisationName}
                    onChange={(e) => handleInputChange('organisationName', e.target.value)}
                    className={`block w-full rounded-xl border-2 bg-neutral-900/50 px-4 py-3.5 pl-11 text-sm text-white transition-colors focus:outline-none focus:ring-0 ${
                      errorField === 'organisationName' 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : 'border-neutral-800 hover:border-neutral-700 focus:border-indigo-500'
                    }`}
                    placeholder="University of Excellence"
                    required
                  />
                  <BookOpen className={`absolute left-4 top-3.5 h-5 w-5 transition-colors ${
                    errorField === 'organisationName' ? 'text-red-400' : 'text-neutral-500 group-focus-within:text-indigo-400'
                  }`} />
                </div>
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`block w-full rounded-xl border-2 bg-neutral-900/50 px-4 py-3.5 pl-11 text-sm text-white transition-colors focus:outline-none focus:ring-0 ${
                    errorField === 'username' 
                      ? 'border-red-500/50 focus:border-red-500' 
                      : 'border-neutral-800 hover:border-neutral-700 focus:border-indigo-500'
                  }`}
                  placeholder={mode === 'login' ? 'admin@organization.com' : 'campus_hero'}
                  required
                />
                <User className={`absolute left-4 top-3.5 h-5 w-5 transition-colors ${
                  errorField === 'username' ? 'text-red-400' : 'text-neutral-500 group-focus-within:text-indigo-400'
                }`} />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider ml-1">Password</label>
                {mode === 'login' && (
                  <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
                )}
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`block w-full rounded-xl border-2 bg-neutral-900/50 px-4 py-3.5 pl-11 pr-12 text-sm text-white transition-colors focus:outline-none focus:ring-0 ${
                    errorField === 'password' 
                      ? 'border-red-500/50 focus:border-red-500' 
                      : 'border-neutral-800 hover:border-neutral-700 focus:border-indigo-500'
                  }`}
                  placeholder="••••••••••••"
                  required
                />
                <Lock className={`absolute left-4 top-3.5 h-5 w-5 transition-colors ${
                  errorField === 'password' ? 'text-red-400' : 'text-neutral-500 group-focus-within:text-indigo-400'
                }`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Terms & Conditions - Only for Register */}
            {mode === 'register' && (
              <div className="flex items-start">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900/50 text-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-neutral-500 text-xs">
                    I agree to the{' '}
                    <a href="#" className="font-bold text-neutral-400 hover:text-white hover:underline transition-colors">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="font-bold text-neutral-400 hover:text-white hover:underline transition-colors">
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>
            )}

            {/* Error Message */}
            <div className="h-6">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-2 rounded-lg"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-xl bg-white p-3.5 text-sm font-bold text-neutral-950 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-neutral-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to Console' : 'Create Account'}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </motion.form>
          </AnimatePresence>

          {/* Mode Switch Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-500">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Footer for Login Side */}
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-600">
              Protected by Campus Dost Security
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}