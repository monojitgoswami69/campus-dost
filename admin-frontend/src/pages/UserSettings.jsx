import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Save, Check, Shield, Users, Plus, Trash2, RefreshCw, UserPlus, Building2, Crown, Loader2, CheckCircle2, XCircle, HelpCircle, Construction } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

export default function UserSettings() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // Check if user is superuser (has full access)
  const isSuperuser = user?.role === 'superuser' || user?.role === 'super_admin';
  // Admin can manage some settings but not team
  const isAdmin = user?.role === 'admin' || isSuperuser;
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || user?.full_name || '',
    email: user?.email || '',
    organisationName: user?.organisationName || user?.org_id || '',
    orgId: user?.org_id || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: user?.twoFactorEnabled || false
  });

  const [editingField, setEditingField] = useState(null);
  const [showEmail, setShowEmail] = useState(false);

  // Password Change State
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [oldPasswordVerified, setOldPasswordVerified] = useState(false);

  // Team Management State
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showEditMemberForm, setShowEditMemberForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [newMember, setNewMember] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'admin'
  });
  const [showNewMemberPassword, setShowNewMemberPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({}); // Track which member passwords are visible
  const [memberErrors, setMemberErrors] = useState({}); // Track validation errors for team member forms
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null); // Track which member is confirming deletion
  
  // Username availability check
  const [usernameAvailability, setUsernameAvailability] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [showRoleTooltip, setShowRoleTooltip] = useState(false);
  
  // Debounce username for availability check
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUsername(newMember.username);
    }, 500);
    return () => clearTimeout(handler);
  }, [newMember.username]);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load team members from API (superuser only)
  const loadTeamMembers = useCallback(async () => {
    if (!isSuperuser) return;
    
    setTeamLoading(true);
    try {
      const response = await api.users.list();
      if (response.status === 'success' && response.users) {
        // Filter out current user from the list
        const members = response.users.filter(u => u.uid !== user?.uid);
        setTeamMembers(members.map(u => ({
          id: u.uid,
          username: u.username,
          fullName: u.full_name || '',
          email: u.email || '',
          role: u.role || 'admin',
          status: u.status || 'active',
          createdAt: u.created_at
        })));
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
      showError('Failed to load team members');
    } finally {
      setTeamLoading(false);
    }
  }, [isSuperuser, user?.uid, showError]);

  // Load team on mount (for superuser)
  useEffect(() => {
    if (isSuperuser) {
      loadTeamMembers();
    }
  }, [isSuperuser, loadTeamMembers]);
  
  // Check username availability
  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setUsernameAvailability(null);
        return;
      }
      
      if (!showAddMemberForm) return;
      
      setIsCheckingUsername(true);
      try {
        // Construct full user ID with org_id prefix
        const fullUserId = `${user.org_id}_${debouncedUsername}`;
        
        // Check if this user ID already exists
        const response = await api.users.list();
        if (response.status === 'success' && response.users) {
          const exists = response.users.some(u => u.uid === fullUserId);
          setUsernameAvailability(exists ? 'taken' : 'available');
        }
      } catch (error) {
        console.error('Failed to check username availability:', error);
        setUsernameAvailability(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };
    
    checkUsernameAvailability();
  }, [debouncedUsername, showAddMemberForm, user?.org_id]);

  const validateForm = () => {
    const newErrors = {};

    // Validate fullName
    if (!formData.fullName || formData.fullName.trim() === '') {
      newErrors.fullName = 'Full name is required';
    }

    // Validate organisationName
    if (!formData.organisationName || formData.organisationName.trim() === '') {
      newErrors.organisationName = 'Organisation name is required';
    }

    // Validate email
    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate password changes
    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required';
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would make the actual API call to update user settings
      // For example:
      // await updateUserSettings({ 
      //   email: formData.email,
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword,
      //   twoFactorEnabled: formData.twoFactorEnabled
      // });

      showSuccess('Your settings have been updated successfully');
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
    } catch (error) {
      showError(error.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleVerifyOldPassword = async () => {
    if (!formData.currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: 'Please enter your current password' }));
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call to verify password
      await new Promise(resolve => setTimeout(resolve, 500));
      // Here you would make actual API call to verify password
      // For now, simulate success
      setOldPasswordVerified(true);
      setErrors(prev => ({ ...prev, currentPassword: undefined }));
      // Removed showSuccess notification
    } catch (error) {
      setErrors(prev => ({ ...prev, currentPassword: 'Incorrect password' }));
      showError('Incorrect password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordChangeForm(false);
    setOldPasswordVerified(false);
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
    setErrors({});
  };

  const handlePasswordUpdate = async () => {
    const newErrors = {};

    if (!formData.newPassword || formData.newPassword.trim() === '') {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword || formData.confirmPassword.trim() === '') {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would make the actual API call to update password
      // For example:
      // await updatePassword({ 
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword
      // });

      showSuccess('Password updated successfully');
      
      // Close the form and reset state
      setShowPasswordChangeForm(false);
      setOldPasswordVerified(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setErrors({});
      
    } catch (error) {
      showError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Team Management Functions
  const generateUsername = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `user_${timestamp}${random}`;
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGenerateCredentials = () => {
    setNewMember(prev => ({
      ...prev,
      username: generateUsername(),
      password: generatePassword()
    }));
  };

  const handleAddTeamMember = async () => {
    const newErrors = {};

    if (!newMember.username || newMember.username.trim() === '') {
      newErrors.username = 'Username is required';
    } else if (newMember.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (usernameAvailability === 'taken') {
      newErrors.username = 'Username is already taken';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(newMember.username)) {
      newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    if (!newMember.fullName || newMember.fullName.trim() === '') {
      newErrors.fullName = 'Full name is required';
    }
    if (!newMember.email || newMember.email.trim() === '') {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMember.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!newMember.password || newMember.password.trim() === '') {
      newErrors.password = 'Password is required';
    } else if (newMember.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setMemberErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Call API to create user
      const response = await api.users.create({
        username: newMember.username.trim(),
        email: newMember.email.trim(),
        password: newMember.password,
        full_name: newMember.fullName.trim(),
        role: newMember.role
      });

      if (response.status === 'success') {
        showSuccess(`Team member ${newMember.username} created successfully`);
        
        // Refresh team list
        await loadTeamMembers();
        
        // Reset form
        setNewMember({
          username: '',
          fullName: '',
          email: '',
          password: '',
          role: 'admin'
        });
        setUsernameAvailability(null);
        setIsCheckingUsername(false);
        setMemberErrors({});
        setShowAddMemberForm(false);
      }
    } catch (err) {
      console.error('Failed to create team member:', err);
      const errorMsg = err.message || err.data?.detail || 'Failed to create team member';
      showError(errorMsg);
      
      // Map specific errors to fields
      if (errorMsg.toLowerCase().includes('email')) {
        setMemberErrors({ email: errorMsg });
      } else if (errorMsg.toLowerCase().includes('username')) {
        setMemberErrors({ username: errorMsg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    setIsLoading(true);
    try {
      const response = await api.users.delete(memberId);
      if (response.status === 'success') {
        showSuccess('Team member removed successfully');
        await loadTeamMembers();
      }
    } catch (err) {
      console.error('Failed to remove team member:', err);
      showError(err.message || 'Failed to remove team member');
    } finally {
      setIsLoading(false);
      setConfirmingDeleteId(null);
    }
  };

  const handleEditTeamMember = (member) => {
    setEditingMemberId(member.id);
    setNewMember({
      username: member.username,
      fullName: member.fullName || '',
      email: member.email || '',
      password: '', // Don't prefill password
      role: member.role
    });
    setShowEditMemberForm(true);
  };

  const handleSaveTeamMember = async () => {
    const newErrors = {};

    if (!newMember.fullName || newMember.fullName.trim() === '') {
      newErrors.fullName = 'Full name is required';
    }
    // Password is optional for updates
    if (newMember.password && newMember.password.length > 0 && newMember.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setMemberErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Update user via API
      const updateData = {
        full_name: newMember.fullName.trim(),
        role: newMember.role
      };
      
      const response = await api.users.update(editingMemberId, updateData);
      
      // If password provided, also reset password
      if (newMember.password && newMember.password.length >= 8) {
        await api.users.resetPassword(editingMemberId, newMember.password);
      }
      
      if (response.status === 'success') {
        showSuccess('Team member updated successfully');
        await loadTeamMembers();
        
        setEditingMemberId(null);
        setShowEditMemberForm(false);
        setNewMember({
          username: '',
          fullName: '',
          email: '',
          password: '',
          role: 'admin'
        });
        setMemberErrors({});
      }
    } catch (err) {
      console.error('Failed to update team member:', err);
      showError(err.message || 'Failed to update team member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
    setShowEditMemberForm(false);
    setNewMember({
      username: '',
      fullName: '',
      email: '',
      password: '',
      role: 'admin'
    });
    setMemberErrors({});
  };

  const handleNewMemberChange = (field, value) => {
    setNewMember(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (memberErrors[field]) {
      setMemberErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset availability when username changes
    if (field === 'username') {
      setUsernameAvailability(null);
    }
  };

  const toggleMemberPasswordVisibility = (memberId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

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

  // Close confirming popup when clicking outside
  useEffect(() => {
    if (!confirmingDeleteId) return;

    const handleDocClick = (e) => {
      const inPopup = e.target.closest('.confirm-delete-popup');
      const inButton = e.target.closest('.confirm-delete-button');
      if (!inPopup && !inButton) {
        setConfirmingDeleteId(null);
      }
    };

    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [confirmingDeleteId]);

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

  return (
    <motion.div 
      className="h-full flex flex-col gap-4 md:gap-6 overflow-y-auto overflow-x-hidden py-2 px-1"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Profile Information Section */}
        <motion.div 
          className="bg-white rounded-lg sm:rounded-xl border-2 border-neutral-300/60 shadow-md overflow-hidden"
          variants={cardVariants}
        >
          <div className="p-3 sm:p-4 md:p-6 border-b border-neutral-200">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Profile Information
            </h3>
            <p className="hidden sm:block text-xs sm:text-sm text-neutral-600 mt-0.5 sm:mt-1">
              Manage your personal information and account details
            </p>
          </div>
          
          <div className="p-3 sm:p-4 md:p-6 space-y-5">
            {/* Full Name - Editable */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-neutral-900">
                  Full Name
                </label>
                {editingField !== 'fullName' && (
                  <motion.button
                    type="button"
                    onClick={() => setEditingField('fullName')}
                    disabled={isLoading}
                    className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md sm:rounded-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Edit
                  </motion.button>
                )}
              </div>
              {editingField === 'fullName' ? (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    autoFocus
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 border-2 border-neutral-300 rounded-xl bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-primary-500 transition-all"
                  />
                  <div className="flex gap-1.5 sm:gap-2">
                    <motion.button
                      type="button"
                      onClick={() => setEditingField(null)}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-red-700 bg-red-100 border-2 border-red-300 hover:bg-red-200 hover:border-red-500 shadow-sm hover:shadow-md rounded-md sm:rounded-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => {
                        if (!formData.fullName || formData.fullName.trim() === '') {
                          setErrors(prev => ({ ...prev, fullName: 'Full name is required' }));
                        } else {
                          setEditingField(null);
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Save
                    </motion.button>
                  </div>
                  {errors.fullName && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600"
                    >
                      {errors.fullName}
                    </motion.p>
                  )}
                </motion.div>
              ) : (
                <div className="px-4 py-3 bg-neutral-50 rounded-lg border border-neutral-200 text-sm sm:text-base text-neutral-900 font-medium">
                  {formData.fullName || 'Not set'}
                </div>
              )}
            </div>

            {/* Username - Read Only */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-neutral-900">
                  Username
                </label>
                <span className="px-2 py-1 text-xs font-medium text-neutral-500 bg-neutral-100 rounded-md">
                  Read-only
                </span>
              </div>
              <div className="px-4 py-3 bg-neutral-50 rounded-lg border border-neutral-200 text-sm sm:text-base text-neutral-900 font-medium">
                {formData.username}
              </div>
            </div>

            {/* Email - Editable with masking */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-neutral-900">
                  Email Address
                </label>
                {editingField !== 'email' && (
                  <motion.button
                    type="button"
                    onClick={() => setEditingField('email')}
                    disabled={isLoading}
                    className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md sm:rounded-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Edit
                  </motion.button>
                )}
              </div>
              {editingField === 'email' ? (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    autoFocus
                    disabled={isLoading}
                    className={cn(
                      "w-full px-4 py-2.5 border-2 rounded-xl bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all",
                      errors.email ? "border-red-300 focus:border-red-500" : "border-neutral-300 focus:border-primary-500"
                    )}
                  />
                  {errors.email && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1"
                    >
                      <Mail className="w-4 h-4" />
                      {errors.email}
                    </motion.p>
                  )}
                  <div className="flex gap-1.5 sm:gap-2">
                    <motion.button
                      type="button"
                      onClick={() => setEditingField(null)}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-red-700 bg-red-100 border-2 border-red-300 hover:bg-red-200 hover:border-red-500 shadow-sm hover:shadow-md rounded-md sm:rounded-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => {
                        if (!formData.email || formData.email.trim() === '') {
                          setErrors(prev => ({ ...prev, email: 'Email is required' }));
                        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                          setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
                        } else {
                          setEditingField(null);
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Save
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <div className="relative px-4 py-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-sm sm:text-base text-neutral-900 font-medium pr-8">
                    {showEmail ? formData.email : `${'*'.repeat(5)}@${formData.email.split('@')[1] || 'example.com'}`}
                  </span>
                  <motion.button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    className="absolute right-3 top-[11px] p-1.5 text-neutral-400 hover:text-primary-600 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showEmail ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>
              )}
            </div>

            {/* Organisation Name */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-bold text-neutral-900">
                  Organisation Name
                </label>
                {editingField !== 'organisationName' && (
                  <motion.button
                    type="button"
                    onClick={() => setEditingField('organisationName')}
                    disabled={isLoading}
                    className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md sm:rounded-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Edit
                  </motion.button>
                )}
              </div>
              {editingField === 'organisationName' ? (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    value={formData.organisationName}
                    onChange={(e) => handleChange('organisationName', e.target.value)}
                    placeholder="Enter your organisation name"
                    autoFocus
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 border-2 border-neutral-300 rounded-xl bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-primary-500 transition-all"
                  />
                  <div className="flex gap-1.5 sm:gap-2">
                    <motion.button
                      type="button"
                      onClick={() => setEditingField(null)}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-red-700 bg-red-100 border-2 border-red-300 hover:bg-red-200 hover:border-red-500 shadow-sm hover:shadow-md rounded-md sm:rounded-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => {
                        if (!formData.organisationName || formData.organisationName.trim() === '') {
                          setErrors(prev => ({ ...prev, organisationName: 'Organisation name is required' }));
                        } else {
                          setEditingField(null);
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Save
                    </motion.button>
                  </div>
                  {errors.organisationName && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600"
                    >
                      {errors.organisationName}
                    </motion.p>
                  )}
                </motion.div>
              ) : (
                <div className="px-4 py-3 bg-neutral-50 rounded-lg border border-neutral-200 text-sm sm:text-base text-neutral-900 font-medium">
                  {formData.organisationName || 'Not set'}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Security and Authentication Section */}
        <motion.div 
          className="bg-white rounded-lg sm:rounded-xl border-2 border-neutral-300/60 shadow-md overflow-hidden relative"
          variants={cardVariants}
        >
          {/* Coming Soon Badge */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-amber-100 border border-amber-300 rounded-full shadow-sm">
            <Construction className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
            <span className="text-[10px] sm:text-xs font-medium text-amber-700">Coming Soon</span>
          </div>

          {/* Grayed out content */}
          <div className="opacity-50 pointer-events-none select-none grayscale-[30%]">
            <div className="p-3 sm:p-4 md:p-6 border-b border-neutral-200">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600" />
                Security and Authentication
              </h3>
              <p className="hidden sm:block text-xs sm:text-sm text-neutral-600 mt-0.5 sm:mt-1">
                Manage your password and security settings
              </p>
            </div>

          <div className="p-3 sm:p-4 md:p-6 space-y-4">
            {/* Change Password */}
            <div>
              {!showPasswordChangeForm ? (
                <div className="flex items-center justify-between p-5 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl border-2 border-neutral-200 hover:border-neutral-300 transition-all">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-neutral-900 mb-1 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary-600" />
                      Change Password
                    </h4>
                    <p className="hidden sm:block text-xs text-neutral-600">
                      Update your password to keep your account secure
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setShowPasswordChangeForm(true)}
                    disabled={isLoading}
                    className="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1 sm:gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                    Change
                  </motion.button>
                </div>
              ) : (
                <div className="p-5 bg-gradient-to-br from-primary-50/50 to-accent-50/30 rounded-xl border border-primary-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary-600" />
                      Change Password
                    </h4>
                    <button
                      type="button"
                      onClick={handleCancelPasswordChange}
                      className="text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Step 1: Verify Old Password */}
                    {!oldPasswordVerified ? (
                      <>
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPasswords.current ? 'text' : 'password'}
                              value={formData.currentPassword}
                              onChange={(e) => handleChange('currentPassword', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleVerifyOldPassword(); } }}
                              placeholder="Enter your current password"
                              className="pr-10"
                              error={errors.currentPassword}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('current')}
                              className="absolute right-3 top-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                              tabIndex={-1}
                            >
                              {showPasswords.current ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleVerifyOldPassword}
                          disabled={isLoading || !formData.currentPassword}
                          className="w-full"
                        >
                          {isLoading ? 'Verifying...' : 'Verify Password'}
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Step 2: Enter New Password */}
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                          <div className="flex gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <p className="text-sm text-green-800">Password verified. You can now set a new password.</p>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              type={showPasswords.new ? 'text' : 'password'}
                              value={formData.newPassword}
                              onChange={(e) => handleChange('newPassword', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePasswordUpdate(); } }}
                              placeholder="Enter new password"
                              className="pr-10"
                              error={errors.newPassword}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('new')}
                              className="absolute right-3 top-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                              tabIndex={-1}
                            >
                              {showPasswords.new ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                          {!errors.newPassword && (
                            <p className="mt-1 text-xs text-neutral-500">
                              Must be at least 6 characters long
                            </p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={(e) => handleChange('confirmPassword', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePasswordUpdate(); } }}
                              placeholder="Confirm new password"
                              className="pr-10"
                              error={errors.confirmPassword}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('confirm')}
                              className="absolute right-3 top-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                              tabIndex={-1}
                            >
                              {showPasswords.confirm ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-1.5 sm:gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelPasswordChange}
                            disabled={isLoading}
                            className="flex-1 font-bold text-red-700 bg-red-100 border-2 border-red-300 hover:bg-red-200 hover:border-red-500 shadow-sm hover:shadow-md transition-all text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handlePasswordUpdate}
                            disabled={isLoading || !formData.newPassword || !formData.confirmPassword}
                            className="flex-1 text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2"
                          >
                            {isLoading ? 'Updating...' : 'Update Password'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-start justify-between gap-4 p-5 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl border-2 border-neutral-200 hover:border-neutral-300 transition-all">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-neutral-900 mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary-600" />
                  Two-Factor Authentication
                </h4>
                <p className="hidden sm:block text-xs text-neutral-600">
                  Add an extra layer of security to your account by requiring a verification code
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('twoFactorEnabled', !formData.twoFactorEnabled)}
                disabled={isLoading}
                className={cn(
                  'relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none flex-shrink-0 shadow-inner',
                  formData.twoFactorEnabled ? 'bg-gradient-to-r from-primary-600 to-primary-700' : 'bg-neutral-300',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
                role="switch"
                aria-checked={formData.twoFactorEnabled}
                aria-label="Toggle two-factor authentication"
              >
                <motion.span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow-md"
                  animate={{
                    x: formData.twoFactorEnabled ? 32 : 4
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            
            {formData.twoFactorEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-blue-50 border border-blue-200 rounded-xl"
              >
                <div className="flex gap-2">
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Two-Factor Authentication will be activated
                    </p>
                    <p className="hidden sm:block text-xs text-blue-700">
                      After saving, you'll receive a QR code to set up your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          </div>
        </motion.div>

        {/* Team Management Section - Super Admin Only */}
        {isSuperuser && (
          <motion.div 
            className="bg-white rounded-lg sm:rounded-xl border-2 border-neutral-300/60 shadow-md overflow-hidden"
            variants={cardVariants}
          >
            <div className="p-3 sm:p-4 md:p-6 border-b border-neutral-200">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                Team Management
              </h3>
              <p className="hidden sm:block text-xs sm:text-sm text-neutral-600 mt-0.5 sm:mt-1">
                Add and manage team members for your organization
              </p>
            </div>

            <div className="p-3 sm:p-4 md:p-6 space-y-4">
              {/* Add Team Member Button */}
              <div className="flex flex-wrap gap-1.5 sm:gap-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowAddMemberForm(true)}
                  disabled={isLoading}
                  className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  Add Team Member
                </Button>
              </div>

              {/* Add Team Member Modal */}
              <Modal
                isOpen={showAddMemberForm}
                onClose={() => {
                  setShowAddMemberForm(false);
                  setNewMember({ username: '', fullName: '', email: '', password: '', role: 'admin' });
                  setMemberErrors({});
                  setUsernameAvailability(null);
                  setIsCheckingUsername(false);
                }}
                title="Add New Team Member"
                icon={<UserPlus className="w-5 h-5 text-primary-600" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Username with org_id prefix */}
                    <div className="sm:col-span-2">
                      <label htmlFor="newUsername" className="block text-sm font-medium text-neutral-700 mb-2">
                        Username <span className="text-xs text-neutral-500">(User ID will be: {user?.org_id}_{newMember.username || '...'} )</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-sm pointer-events-none z-10">
                          {user?.org_id}_
                        </div>
                        <input
                          id="newUsername"
                          type="text"
                          value={newMember.username}
                          onChange={(e) => handleNewMemberChange('username', e.target.value)}
                          placeholder="username"
                          disabled={isLoading}
                          className={`w-full pr-12 py-2.5 border-2 rounded-lg transition-all ${
                            memberErrors.username
                              ? 'border-red-300 bg-red-50 focus:border-red-500'
                              : usernameAvailability === 'taken'
                                ? 'border-red-300 focus:border-red-500'
                                : usernameAvailability === 'available'
                                  ? 'border-emerald-300 focus:border-emerald-500'
                                  : 'border-neutral-300 focus:border-primary-500'
                          } focus:outline-none`}
                          style={{ paddingLeft: `${(user?.org_id?.length || 0) * 8 + 16}px` }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingUsername && (
                            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                          )}
                          {!isCheckingUsername && usernameAvailability === 'available' && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          )}
                          {!isCheckingUsername && usernameAvailability === 'taken' && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      {memberErrors.username && (
                        <p className="text-xs text-red-500 mt-1">{memberErrors.username}</p>
                      )}
                      {!memberErrors.username && usernameAvailability === 'available' && newMember.username && (
                        <p className="text-xs text-emerald-600 mt-1">✓ {newMember.username} is available</p>
                      )}
                      {!memberErrors.username && usernameAvailability === 'taken' && newMember.username && (
                        <p className="text-xs text-red-500 mt-1">✗ {newMember.username} is already taken</p>
                      )}
                      {!memberErrors.username && isCheckingUsername && (
                        <p className="text-xs text-neutral-500 mt-1">Checking availability...</p>
                      )}
                    </div>

                    {/* Full Name */}
                    <div>
                      <label htmlFor="newFullName" className="block text-sm font-medium text-neutral-700 mb-2">
                        Full Name
                      </label>
                      <Input
                        id="newFullName"
                        type="text"
                        value={newMember.fullName}
                        onChange={(e) => handleNewMemberChange('fullName', e.target.value)}
                        placeholder="Enter full name"
                        disabled={isLoading}
                        error={memberErrors.fullName}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="newEmail" className="block text-sm font-medium text-neutral-700 mb-2">
                        Email
                      </label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newMember.email}
                        onChange={(e) => handleNewMemberChange('email', e.target.value)}
                        placeholder="Enter email"
                        disabled={isLoading}
                        error={memberErrors.email}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewMemberPassword ? 'text' : 'password'}
                          value={newMember.password}
                          onChange={(e) => handleNewMemberChange('password', e.target.value)}
                          placeholder="Enter password"
                          className="pr-10"
                          disabled={isLoading}
                          error={memberErrors.password}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewMemberPassword(!showNewMemberPassword)}
                          className="absolute right-3 top-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                          tabIndex={-1}
                        >
                          {showNewMemberPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Role Selection Dropdown */}
                    <div>
                      <label htmlFor="newRole" className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1.5">
                        Role
                        <div className="relative">
                          <button
                            type="button"
                            onMouseEnter={() => setShowRoleTooltip(true)}
                            onMouseLeave={() => setShowRoleTooltip(false)}
                            className="text-neutral-400 hover:text-neutral-600 transition-colors"
                            aria-label="Role information"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                          {showRoleTooltip && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute left-6 top-0 z-50 w-64 p-3 bg-neutral-800 text-white text-xs rounded-lg shadow-lg"
                            >
                              <div className="space-y-2">
                                <div>
                                  <div className="font-semibold text-emerald-400">⭐ Admin</div>
                                  <div className="text-neutral-300 mt-0.5">Full content management, can add/edit/delete documents and system instructions</div>
                                </div>
                                <div className="border-t border-neutral-600 pt-2">
                                  <div className="font-semibold text-blue-400">👤 Assistant</div>
                                  <div className="text-neutral-300 mt-0.5">View-only access to knowledge base, can answer queries but cannot modify content</div>
                                </div>
                              </div>
                              <div className="absolute -left-1 top-2 w-2 h-2 bg-neutral-800 transform rotate-45"></div>
                            </motion.div>
                          )}
                        </div>
                      </label>
                      <div className="relative">
                        <select
                          id="newRole"
                          value={newMember.role}
                          onChange={(e) => handleNewMemberChange('role', e.target.value)}
                          disabled={isLoading}
                          className="w-full px-3 py-2 pr-10 border border-neutral-200 rounded-lg bg-gradient-to-br from-white to-neutral-50 text-neutral-900 text-[14px] font-medium appearance-none cursor-pointer hover:border-primary-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-transparent focus:from-primary-50 focus:to-white transition-all duration-200 disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500 disabled:opacity-60"
                        >
                          <option value="admin" className="py-3 text-sm font-medium">⭐ Admin (Full access)</option>
                          <option value="assistant" className="py-3 text-sm font-medium">👤 Assistant (View-only)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 sm:gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddMemberForm(false);
                        setNewMember({ username: '', fullName: '', email: '', password: '', role: 'admin' });
                        setMemberErrors({});
                        setUsernameAvailability(null);
                        setIsCheckingUsername(false);
                      }}
                      disabled={isLoading}
                      className="flex-1 font-bold text-red-700 bg-red-100 border-2 border-red-300 hover:bg-red-200 hover:border-red-500 shadow-sm hover:shadow-md transition-all text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleAddTeamMember}
                      disabled={isLoading}
                      className="gap-1 sm:gap-2 flex-1 text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      Add Member
                    </Button>
                  </div>
                </div>
              </Modal>

              {/* Edit Team Member Modal */}
              <Modal
                isOpen={showEditMemberForm}
                onClose={() => {
                  handleCancelEditMember();
                }}
                title="Edit Team Member"
                icon={<User className="w-5 h-5 text-primary-600" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Username */}
                    <div>
                      <label htmlFor="editUsername" className="block text-sm font-medium text-neutral-700 mb-2">
                        Username
                      </label>
                      <Input
                        id="editUsername"
                        type="text"
                        value={newMember.username}
                        onChange={(e) => handleNewMemberChange('username', e.target.value)}
                        placeholder="Enter username"
                        disabled={isLoading}
                        error={memberErrors.username}
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label htmlFor="editFullName" className="block text-sm font-medium text-neutral-700 mb-2">
                        Full Name
                      </label>
                      <Input
                        id="editFullName"
                        type="text"
                        value={newMember.fullName}
                        onChange={(e) => handleNewMemberChange('fullName', e.target.value)}
                        placeholder="Enter full name"
                        disabled={isLoading}
                        error={memberErrors.fullName}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="editEmail" className="block text-sm font-medium text-neutral-700 mb-2">
                        Email
                      </label>
                      <Input
                        id="editEmail"
                        type="email"
                        value={newMember.email}
                        onChange={(e) => handleNewMemberChange('email', e.target.value)}
                        placeholder="Enter email"
                        disabled={isLoading}
                        error={memberErrors.email}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="editPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          id="editPassword"
                          type={showNewMemberPassword ? 'text' : 'password'}
                          value={newMember.password}
                          onChange={(e) => handleNewMemberChange('password', e.target.value)}
                          placeholder="Enter password"
                          className="pr-10"
                          disabled={isLoading}
                          error={memberErrors.password}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewMemberPassword(!showNewMemberPassword)}
                          className="absolute right-3 top-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                          tabIndex={-1}
                        >
                          {showNewMemberPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Role Selection Dropdown */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <label htmlFor="editRole" className="block text-sm font-medium text-neutral-700">
                        Role
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onMouseEnter={() => setShowRoleTooltip(true)}
                          onMouseLeave={() => setShowRoleTooltip(false)}
                          className="text-neutral-400 hover:text-neutral-600 transition-colors"
                          aria-label="Role information"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                        {showRoleTooltip && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute left-6 top-0 z-50 w-64 p-3 bg-neutral-800 text-white text-xs rounded-lg shadow-lg"
                          >
                            <div className="space-y-2">
                              <div>
                                <div className="font-semibold text-emerald-400">⭐ Admin</div>
                                <div className="text-neutral-300 mt-0.5">Full content management, can add/edit/delete documents and system instructions</div>
                              </div>
                              <div className="border-t border-neutral-600 pt-2">
                                <div className="font-semibold text-blue-400">👤 Assistant</div>
                                <div className="text-neutral-300 mt-0.5">View-only access to knowledge base, can answer queries but cannot modify content</div>
                              </div>
                            </div>
                            <div className="absolute -left-1 top-2 w-2 h-2 bg-neutral-800 transform rotate-45"></div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <select
                      id="editRole"
                      value={newMember.role}
                      onChange={(e) => handleNewMemberChange('role', e.target.value)}
                      disabled={isLoading}
                      className="w-full px-3 py-2.5 border-2 border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:border-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="admin">⭐ Admin (Full access)</option>
                      <option value="assistant">👤 Assistant (View-only)</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 sm:gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEditMember}
                      disabled={isLoading}
                      className="flex-1 font-bold text-red-700 bg-red-100 border-2 border-red-300 hover:bg-red-200 hover:border-red-500 shadow-sm hover:shadow-md transition-all text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleSaveTeamMember}
                      disabled={isLoading}
                      className="gap-1 sm:gap-2 flex-1 text-xs sm:text-sm px-2 py-1.5 sm:px-4 sm:py-2"
                    >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </Modal>

              {/* Team Members List */}
              {teamMembers.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-neutral-700">Team Members ({teamMembers.length})</h4>
                  <AnimatePresence mode="popLayout">
                    {teamMembers.map((member) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                  <span className="text-xs font-semibold text-neutral-900">{member.username}</span>
                                </div>
                                <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700 capitalize flex-shrink-0">
                                  {member.role}
                                </span>
                              </div>
                              {member.fullName && (
                                <p className="text-xs text-neutral-600 pl-5">{member.fullName}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditTeamMember(member)}
                                disabled={isLoading}
                                className="p-1 sm:p-2 text-primary-600 hover:bg-primary-50 rounded-md sm:rounded-lg transition-colors"
                                aria-label="Edit team member"
                              >
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <div className="relative">
                                {confirmingDeleteId === member.id && (
                                  <div className="confirm-delete-popup absolute -top-16 right-2 w-44 p-2 bg-white border rounded-md shadow-md z-10">
                                    <p className="text-xs text-neutral-700 mb-2">Confirm delete?</p>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => { handleRemoveTeamMember(member.id); setConfirmingDeleteId(null); }}
                                        disabled={isLoading}
                                        className="flex-1 px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-md"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmingDeleteId(null)}
                                        disabled={isLoading}
                                        className="flex-1 px-2 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-md"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(member.id); }}
                                  disabled={isLoading}
                                  className="confirm-delete-button p-1 sm:p-2 text-red-600 hover:bg-red-50 rounded-md sm:rounded-lg transition-colors"
                                  aria-label="Remove team member"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}
