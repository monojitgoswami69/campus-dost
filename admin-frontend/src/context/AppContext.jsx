import React, { createContext, useContext, useState } from 'react';
import { useLocalStorage } from '../hooks/useHooks';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('ui.sidebarCollapsed', false);
  const [modals, setModals] = useState([]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const showModal = (modal) => {
    const id = Date.now();
    setModals(prev => [...prev, { ...modal, id }]);
    return id;
  };

  const closeModal = (id) => {
    setModals(prev => prev.filter(m => m.id !== id));
  };

  const value = {
    sidebarCollapsed,
    toggleSidebar,
    modals,
    showModal,
    closeModal
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
