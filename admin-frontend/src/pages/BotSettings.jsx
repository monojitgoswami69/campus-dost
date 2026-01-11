import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, Check, Download, Upload, RotateCcw, Info } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { AutoResizeTextarea } from '../components/UI/AutoResizeTextarea';
import { Modal } from '../components/UI/Modal';
import { cn } from '../utils/helpers';

export default function Settings() {
  // Bot Configuration State
  const [botConfig, setBotConfig] = useState({
    botName: 'Shiksha Saathi',
    confidenceThreshold: 40,
    websiteUrl: 'https://institution.edu'
  });

  // Appearance State
  const [appearance, setAppearance] = useState({
    welcomeMessage: "Hello! I'm Shiksha Saathi, your friendly AI assistant. How can I help you today?",
    themeColor: '#059669'
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
    emailOnHandoff: true,
    notificationEmail: 'admin@institution.edu'
  });

  // Save states
  const [saveStates, setSaveStates] = useState({
    botConfig: false,
    appearance: false,
    notifications: false
  });

  // Modal state
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false);
  const [showNotificationInfo, setShowNotificationInfo] = useState(false);
  const confidenceInfoRef = useRef(null);
  const notificationInfoRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (confidenceInfoRef.current && !confidenceInfoRef.current.contains(event.target)) {
        setShowConfidenceInfo(false);
      }
      if (notificationInfoRef.current && !notificationInfoRef.current.contains(event.target)) {
        setShowNotificationInfo(false);
      }
    };

    if (showConfidenceInfo || showNotificationInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfidenceInfo, showNotificationInfo]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedBotConfig = localStorage.getItem('settings.botConfig');
    const savedAppearance = localStorage.getItem('settings.appearance');
    const savedNotifications = localStorage.getItem('settings.notifications');

    if (savedBotConfig) setBotConfig(JSON.parse(savedBotConfig));
    if (savedAppearance) setAppearance(JSON.parse(savedAppearance));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
  }, []);

  const showSaveSuccess = (section) => {
    setSaveStates(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      setSaveStates(prev => ({ ...prev, [section]: false }));
    }, 2000);
  };

  const handleSaveBotConfig = () => {
    localStorage.setItem('settings.botConfig', JSON.stringify(botConfig));
    showSaveSuccess('botConfig');
  };

  const handleSaveAppearance = () => {
    localStorage.setItem('settings.appearance', JSON.stringify(appearance));
    // Apply theme color to document
    document.documentElement.style.setProperty('--primary-color', appearance.themeColor);
    showSaveSuccess('appearance');
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('settings.notifications', JSON.stringify(notifications));
    showSaveSuccess('notifications');
  };

  // Backup & Restore Functions
  const handleExportSettings = () => {
    const allSettings = {
      botConfig,
      appearance,
      notifications,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(allSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shiksha-saathi-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result);
        
        if (importedSettings.botConfig) {
          setBotConfig(importedSettings.botConfig);
          localStorage.setItem('settings.botConfig', JSON.stringify(importedSettings.botConfig));
        }
        if (importedSettings.appearance) {
          setAppearance(importedSettings.appearance);
          localStorage.setItem('settings.appearance', JSON.stringify(importedSettings.appearance));
        }
        if (importedSettings.notifications) {
          setNotifications(importedSettings.notifications);
          localStorage.setItem('settings.notifications', JSON.stringify(importedSettings.notifications));
        }

        alert('Settings imported successfully!');
      } catch (error) {
        alert('Error importing settings. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
      const defaults = {
        botConfig: {
          botName: 'Shiksha Saathi',
          confidenceThreshold: 40,
          websiteUrl: 'https://institution.edu'
        },
        appearance: {
          welcomeMessage: "Hello! I'm Shiksha Saathi, your friendly AI assistant. How can I help you today?",
          themeColor: '#059669'
        },
        notifications: {
          emailOnHandoff: true,
          notificationEmail: 'admin@institution.edu'
        }
      };

      setBotConfig(defaults.botConfig);
      setAppearance(defaults.appearance);
      setNotifications(defaults.notifications);

      localStorage.setItem('settings.botConfig', JSON.stringify(defaults.botConfig));
      localStorage.setItem('settings.appearance', JSON.stringify(defaults.appearance));
      localStorage.setItem('settings.notifications', JSON.stringify(defaults.notifications));

      alert('All settings have been reset to default values.');
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden py-1 px-0">
      <div className="py-1 sm:py-2 md:py-3 lg:py-3 px-0 w-full">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block mb-2 sm:mb-6 md:mb-8"
        >
        <div className="flex items-center gap-1 sm:gap-3 mb-1 sm:mb-2">
          <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg sm:rounded-xl shadow-lg shadow-primary-500/30">
            <SettingsIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
          <h1 className="text-lg sm:text-3xl md:text-4xl font-bold text-neutral-900">Settings</h1>
        </div>
        <p className="text-[11px] sm:text-sm md:text-base text-neutral-600 ml-8 sm:ml-14">Manage your bot configuration and preferences</p>
      </motion.div>

      <div className="space-y-3 sm:space-y-5 md:space-y-6">
        {/* Bot Configuration Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm border border-neutral-200 p-2 sm:p-4 md:p-5 lg:p-6"
        >
          <h2 className="text-sm sm:text-lg md:text-xl font-bold text-neutral-900 mb-3 sm:mb-5 md:mb-6">Bot Configuration</h2>
          
          <div className="space-y-2 sm:space-y-4 md:space-y-5">
            {/* Bot Name */}
            <div>
              <label htmlFor="botName" className="block text-[13px] sm:text-sm font-bold text-neutral-700 mb-1 sm:mb-2">
                Bot Name
              </label>
              <input
                id="botName"
                type="text"
                value={botConfig.botName}
                onChange={(e) => setBotConfig({ ...botConfig, botName: e.target.value })}
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 md:py-3 border border-neutral-200 rounded-lg sm:rounded-xl bg-white text-xs sm:text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter bot name"
              />
            </div>

            {/* Confidence Threshold */}
            <div className="relative">
              <div className="flex items-center gap-1 mb-1 sm:mb-2">
                <label htmlFor="confidenceThreshold" className="block text-[13px] sm:text-sm font-bold text-neutral-700">
                  Human Handoff Confidence Threshold (%)
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfidenceInfo(!showConfidenceInfo)}
                  className="p-0.5 text-neutral-400 hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                  aria-label="More information"
                >
                  <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              
              {/* Info Popup */}
              {showConfidenceInfo && (
                <motion.div
                  ref={confidenceInfoRef}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute z-10 mb-2 w-full max-w-sm bg-white border border-neutral-200 rounded-lg shadow-lg p-2"
                  style={{ bottom: 'calc(100% + 0.5rem)' }}
                >
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] sm:text-sm text-neutral-700">
                      When the bot's confidence falls below this threshold, it will hand off to a human agent.
                    </p>
                  </div>
                </motion.div>
              )}
              
              <input
                id="confidenceThreshold"
                type="number"
                min="0"
                max="100"
                value={botConfig.confidenceThreshold}
                onChange={(e) => setBotConfig({ ...botConfig, confidenceThreshold: parseInt(e.target.value) || 0 })}
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 md:py-3 border border-neutral-200 rounded-lg sm:rounded-xl bg-white text-xs sm:text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="40"
              />
            </div>

            {/* Website URL */}
            <div>
              <label htmlFor="websiteUrl" className="block text-[13px] sm:text-sm font-bold text-neutral-700 mb-1 sm:mb-2">
                Institution Website URL for Crawling
              </label>
              <input
                id="websiteUrl"
                type="url"
                value={botConfig.websiteUrl}
                onChange={(e) => setBotConfig({ ...botConfig, websiteUrl: e.target.value })}
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 md:py-3 border border-neutral-200 rounded-lg sm:rounded-xl bg-white text-xs sm:text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="https://institution.edu"
              />
              <p className="hidden sm:block text-xs sm:text-sm text-neutral-500 mt-1.5 sm:mt-2">
                Enter your institution's website URL to crawl and index content
              </p>
            </div>

            {/* Save Button */}
            <motion.div
              initial={false}
              animate={saveStates.botConfig ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleSaveBotConfig}
                variant={saveStates.botConfig ? 'secondary' : 'primary'}
                className="min-w-[100px] sm:min-w-[140px] md:min-w-[160px] text-xs sm:text-base"
              >
                {saveStates.botConfig ? (
                  <>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-normal">Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-normal">Save Changes</span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.section>

        {/* Appearance Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm border border-neutral-200 p-2 sm:p-4 md:p-5 lg:p-6"
        >
          <h2 className="text-sm sm:text-lg md:text-xl font-bold text-neutral-900 mb-3 sm:mb-5 md:mb-6">Appearance</h2>
          
          <div className="space-y-2 sm:space-y-4 md:space-y-5">
            {/* Welcome Message */}
            <div>
              <label htmlFor="welcomeMessage" className="block text-[13px] sm:text-sm font-bold text-neutral-700 mb-1 sm:mb-2">
                Bot Welcome Message
              </label>
              <textarea
                id="welcomeMessage"
                rows="3"
                value={appearance.welcomeMessage}
                onChange={(e) => setAppearance({ ...appearance, welcomeMessage: e.target.value })}
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 md:py-3 border border-neutral-200 rounded-lg sm:rounded-xl bg-white text-xs sm:text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                placeholder="Enter welcome message"
              />
              <p className="hidden sm:block text-xs sm:text-sm text-neutral-500 mt-1.5 sm:mt-2">
                This message will be displayed when users first interact with the bot
              </p>
            </div>

            {/* Theme Color */}
            <div>
              <label htmlFor="themeColor" className="block text-[13px] sm:text-sm font-bold text-neutral-700 mb-1 sm:mb-2">
                Bot Theme Color
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  id="themeColor"
                  type="text"
                  value={appearance.themeColor}
                  onChange={(e) => setAppearance({ ...appearance, themeColor: e.target.value })}
                  className="flex-1 min-w-0 px-2 sm:px-4 py-1.5 sm:py-2.5 md:py-3 border border-neutral-200 rounded-lg sm:rounded-xl bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-xs sm:text-sm md:text-base"
                  placeholder="#059669"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="color"
                    value={appearance.themeColor}
                    onChange={(e) => setAppearance({ ...appearance, themeColor: e.target.value })}
                    className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-12 rounded-lg sm:rounded-xl cursor-pointer border-2 border-neutral-200"
                    style={{ backgroundColor: appearance.themeColor }}
                  />
                </div>
              </div>
              <p className="hidden sm:block text-xs sm:text-sm text-neutral-500 mt-1.5 sm:mt-2">
                Choose a color that matches your institution's branding
              </p>
            </div>

            {/* Save Button */}
            <motion.div
              initial={false}
              animate={saveStates.appearance ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleSaveAppearance}
                variant={saveStates.appearance ? 'secondary' : 'primary'}
                className="min-w-[100px] sm:min-w-[140px] md:min-w-[160px] text-xs sm:text-base"
              >
                {saveStates.appearance ? (
                  <>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-normal">Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-normal">Save Appearance</span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.section>

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm border border-neutral-200 p-2 sm:p-4 md:p-5 lg:p-6"
        >
          <h2 className="text-sm sm:text-lg md:text-xl font-bold text-neutral-900 mb-3 sm:mb-5 md:mb-6">Notifications</h2>
          
          <div className="space-y-2 sm:space-y-4 md:space-y-5">
            {/* Email on Handoff Toggle */}
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                  <h3 className="text-xs sm:text-base font-semibold text-neutral-900">
                    Email on Human Handoff
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNotificationInfo(!showNotificationInfo)}
                    className="p-0.5 text-neutral-400 hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                    aria-label="More information"
                  >
                    <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
                
                {/* Info Popup */}
                {showNotificationInfo && (
                  <motion.div
                    ref={notificationInfoRef}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-10 mb-2 w-full max-w-sm bg-white border border-neutral-200 rounded-lg shadow-lg p-2"
                    style={{ bottom: 'calc(100% + 0.5rem)' }}
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-primary-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] sm:text-sm text-neutral-700">
                        Receive an email when a user's query requires human intervention.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
              {/* Custom sliding switch for mobile and desktop */}
              <button
                type="button"
                onClick={() => setNotifications({ ...notifications, emailOnHandoff: !notifications.emailOnHandoff })}
                className={cn(
                  'relative inline-flex items-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors',
                  notifications.emailOnHandoff ? 'bg-primary-600' : 'bg-neutral-300',
                  'w-11 h-6 sm:w-12 sm:h-7 rounded-full duration-200'
                )}
                role="switch"
                aria-checked={notifications.emailOnHandoff}
                aria-label="Toggle email on human handoff"
              >
                <span className="sr-only">Toggle email on human handoff</span>
                <motion.span
                  className="absolute left-0 top-0 h-6 w-11 sm:h-7 sm:w-12 rounded-full"
                  style={{ background: 'transparent' }}
                  aria-hidden="true"
                />
                <motion.span
                  className="inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white shadow-lg transform"
                  animate={{
                    x: notifications.emailOnHandoff ? (window.innerWidth < 640 ? 22 : 28) : 2
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.10)' }}
                />
              </button>
            </div>

            {/* Notification Email */}
            {notifications.emailOnHandoff && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label htmlFor="notificationEmail" className="block text-[13px] sm:text-sm font-bold text-neutral-700 mb-1 sm:mb-2">
                  Notification Email Address
                </label>
                <input
                  id="notificationEmail"
                  type="email"
                  value={notifications.notificationEmail}
                  onChange={(e) => setNotifications({ ...notifications, notificationEmail: e.target.value })}
                  className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 md:py-3 border border-neutral-200 rounded-lg sm:rounded-xl bg-white text-xs sm:text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="admin@institution.edu"
                />
                <p className="hidden sm:block text-xs sm:text-sm text-neutral-500 mt-1.5 sm:mt-2">
                  Notifications will be sent to this email address
                </p>
              </motion.div>
            )}

            {/* Save Button */}
            <motion.div
              initial={false}
              animate={saveStates.notifications ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleSaveNotifications}
                variant={saveStates.notifications ? 'secondary' : 'primary'}
                className="min-w-[100px] sm:min-w-[140px] md:min-w-[160px] text-xs sm:text-base"
              >
                {saveStates.notifications ? (
                  <>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-normal">Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-normal">Save Notifications</span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.section>

        {/* Backup & Restore Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm border border-neutral-200 p-2 sm:p-4 md:p-5 lg:p-6"
        >
          <h2 className="text-sm sm:text-lg md:text-xl font-bold text-neutral-900 mb-3 sm:mb-5 md:mb-6">Backup & Restore</h2>
          
          <div className="space-y-2 sm:space-y-4">
            <p className="text-[11px] sm:text-sm text-neutral-600">
              Export your settings as a backup or import previously saved settings. You can also reset all settings to their default values.
            </p>

            <div className="flex flex-row gap-1 sm:grid sm:grid-cols-3 sm:gap-3">
              {/* Export Settings */}
              <Button
                onClick={handleExportSettings}
                variant="secondary"
                size="small"
                className="flex-1 justify-center text-[11px] sm:text-sm px-2 sm:px-4"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="sm:hidden">Export</span>
                <span className="hidden sm:inline">Export Settings</span>
              </Button>

              {/* Import Settings */}
              <label className="flex-1 relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="sr-only"
                />
                <Button
                  as="span"
                  variant="secondary"
                  size="small"
                  className="w-full justify-center cursor-pointer text-[11px] sm:text-sm px-2 sm:px-4"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="sm:hidden">Import</span>
                  <span className="hidden sm:inline">Import Settings</span>
                </Button>
              </label>

              {/* Reset to Defaults */}
              <Button
                onClick={handleResetToDefaults}
                variant="secondary"
                size="small"
                className="flex-1 justify-center text-red-600 hover:bg-red-50 hover:border-red-300 text-[11px] sm:text-sm px-2 sm:px-4"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="sm:hidden">Reset</span>
                <span className="hidden sm:inline">Reset to Defaults</span>
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 mt-2 sm:mt-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="text-amber-600 flex-shrink-0">
                  <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-[11px] sm:text-sm font-semibold text-amber-900 mb-0.5 sm:mb-1">
                    Important Note
                  </h4>
                  <p className="text-[10px] sm:text-xs md:text-sm text-amber-800 leading-relaxed">
                    Resetting to defaults will permanently delete all your custom settings. Make sure to export your settings first if you want to keep a backup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
      </div>
    </div>
  );
}
 