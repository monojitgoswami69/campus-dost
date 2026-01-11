import React, { memo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/helpers';
import logoImg from '../../assets/logo.png';
import { 
  LayoutDashboard, 
  BookOpen, 
  Archive, 
  FilePlus, 
  Type, 
  Settings, 
  LogOut, 
  X,
  BarChart3,
  HelpCircle,
  FileText
} from 'lucide-react';

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['superuser', 'admin', 'assistant'] // All roles
  },
  {
    id: 'query-analytics',
    label: 'Query Analytics',
    path: '/query-analytics',
    icon: BarChart3,
    roles: ['superuser', 'admin', 'assistant'] // All roles can view analytics
  },
  {
    id: 'unsolved-queries',
    label: 'Unsolved Queries',
    path: '/unsolved-queries',
    icon: HelpCircle,
    roles: ['superuser', 'admin', 'assistant'] // Assistant can answer queries
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    path: '/knowledge-base',
    icon: BookOpen,
    roles: ['superuser', 'admin', 'assistant'] // All roles (assistant: view only)
  },
  {
    id: 'archive',
    label: 'Archive',
    path: '/archive',
    icon: Archive,
    roles: ['superuser', 'admin'] // Not for assistant
  },
  {
    id: 'add-document',
    label: 'Add Document',
    path: '/add-document',
    icon: FilePlus,
    roles: ['superuser', 'admin'] // Not for assistant
  },
  {
    id: 'add-text',
    label: 'Add Text',
    path: '/add-text',
    icon: Type,
    roles: ['superuser', 'admin'] // Not for assistant
  },
  {
    id: 'system-instructions',
    label: 'System Instructions',
    path: '/system-instructions',
    icon: FileText,
    roles: ['superuser', 'admin'] // Not for assistant
  },
  {
    id: 'bot-settings',
    label: 'Bot Settings',
    path: '/bot-settings',
    icon: Settings,
    roles: ['superuser', 'admin'] // Not for assistant
  }
];

const SidebarItem = memo(function SidebarItem({ item, onClick, index = 0 }) {
  const Icon = item.icon;
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
    >
      <NavLink
        to={item.path}
        onClick={onClick}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all min-h-[40px]",
            "focus:outline-none",
            isActive
              ? "bg-primary-600 text-white shadow-sm"
              : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
          )
        }
        aria-current={({ isActive }) => isActive ? 'page' : undefined}
      >
        {({ isActive }) => (
          <div className="flex items-center gap-3 w-full">
            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium text-[13px] tracking-tight">{item.label}</span>
          </div>
        )}
      </NavLink>
    </motion.li>
  );
});

const UserSection = memo(function UserSection({ user, onLogout, onSettingsClick }) {
  // Use username or email as display name, fallback to org_id
  const displayName = user?.username || user?.email?.split('@')[0] || user?.org_id || 'User';
  
  // Format role for display - handle different role formats
  const formatRole = (role) => {
    if (!role) return 'User';
    // Handle underscore-separated roles like 'super_admin'
    const formatted = role.replace(/_/g, ' ');
    // Capitalize each word
    return formatted.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };
  
  const displayRole = formatRole(user?.role);
  
  // Generate consistent avatar based on uid or username
  const avatarSeed = user?.uid || user?.username || user?.org_id || 'default';
  
  // Check if user has elevated privileges (superuser/admin)
  const isSuperuser = user?.role === 'superuser' || user?.role === 'super_admin';
  
  return (
    <div className="mt-3 pt-3 border-t border-neutral-200 px-2">
      <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-2">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
            className="w-8 h-8 rounded-full border border-neutral-200 flex-shrink-0"
            alt=""
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-900 truncate" title={displayName}>
              {displayName}
            </p>
            <p className={`text-xs truncate ${isSuperuser ? 'text-primary-600 font-medium' : 'text-neutral-500'}`} title={displayRole}>
              {displayRole}
            </p>
          </div>
          <button
            onClick={onSettingsClick}
            className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 rounded-md transition-colors focus:outline-none flex-shrink-0"
            aria-label="User settings"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-2 py-2 mt-1.5 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors focus:outline-none min-h-[40px]"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
});

const Logo = memo(function Logo({ onClose }) {
  return (
    <div className="h-14 flex items-center justify-between px-3 border-b border-neutral-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <img src={logoImg} alt="Campus Dost Logo" className="w-full h-full object-contain" />
        </div>
        <span className="font-bold text-[17px] tracking-tight text-neutral-900 truncate">Campus Dost</span>
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          className="p-2 lg:hidden text-neutral-500 hover:text-neutral-700 focus:outline-none rounded-md flex-shrink-0"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

export function Sidebar({ isMobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Filter nav items based on user role
  const userRole = user?.role || 'assistant';
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    if (onCloseMobile) onCloseMobile();
  }, [logout, navigate, onCloseMobile]);

  const handleOpenSettings = useCallback(() => {
    navigate('/user-settings');
    if (onCloseMobile) onCloseMobile();
  }, [navigate, onCloseMobile]);

  return (
    <>
      {/* Desktop */}
      <aside
        className="w-60 hidden lg:flex flex-col fixed top-0 left-0 bottom-0 bg-white border-r border-neutral-200 z-30 overflow-hidden"
        aria-label="Main navigation"
      >
        <Logo />

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin" aria-label="Primary">
          <ul className="space-y-1 px-3" role="list">
            {filteredNavItems.map((item, index) => (
              <SidebarItem key={item.id} item={item} index={index} />
            ))}
          </ul>
        </nav>

        <UserSection user={user} onLogout={handleLogout} onSettingsClick={handleOpenSettings} />
      </aside>

      {/* Mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-30 lg:hidden" 
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 left-0 w-[280px] h-[100dvh] z-40 flex flex-col bg-white border-r border-neutral-200 shadow-lg lg:hidden safe-top safe-bottom"
              aria-label="Mobile navigation"
              role="dialog"
              aria-modal="true"
            >
              <Logo onClose={onCloseMobile} />

              <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin" aria-label="Primary">
                <ul className="space-y-1 px-3" role="list">
                  {filteredNavItems.map((item, index) => (
                    <SidebarItem key={item.id} item={item} onClick={onCloseMobile} index={index} />
                  ))}
                </ul>
              </nav>

              <UserSection user={user} onLogout={handleLogout} onSettingsClick={handleOpenSettings} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
