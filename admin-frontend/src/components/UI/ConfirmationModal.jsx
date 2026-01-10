import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Archive, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * ConfirmationModal - A reusable confirmation dialog for destructive actions
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback to close the modal
 * @param {function} onConfirm - Callback when user confirms the action
 * @param {string} title - Modal title
 * @param {string} message - Description/message shown to user
 * @param {string} actionType - Type of action: 'archive', 'delete', 'restore'
 * @param {string} confirmLabel - Label for confirm button (defaults based on actionType)
 * @param {Array<string>} itemNames - List of item names for bulk operations
 * @param {boolean} loading - Whether the action is in progress
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  actionType = 'delete',
  confirmLabel,
  itemNames = [],
  loading = false,
}) {
  const actionConfig = {
    archive: {
      icon: Archive,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      buttonVariant: 'secondary',
      defaultLabel: 'Archive',
    },
    delete: {
      icon: Trash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonVariant: 'danger',
      defaultLabel: 'Delete',
    },
    restore: {
      icon: RotateCcw,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      buttonVariant: 'primary',
      defaultLabel: 'Restore',
    },
  };

  const config = actionConfig[actionType] || actionConfig.delete;
  const Icon = config.icon;
  const label = confirmLabel || config.defaultLabel;

  const handleConfirm = () => {
    onConfirm();
  };

  // Animation variants
  const iconVariants = {
    initial: { scale: 0, rotate: -180, filter: 'blur(10px)' },
    animate: { 
      scale: 1, 
      rotate: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 20,
        delay: 0.15
      }
    }
  };

  const contentVariants = {
    initial: { opacity: 0, y: 15, filter: 'blur(4px)' },
    animate: { 
      opacity: 1, 
      y: 0,
      filter: 'blur(0px)',
      transition: { 
        delay: 0.25,
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    }
  };

  const listVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        delay: 0.35,
        staggerChildren: 0.04
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, x: -15, scale: 0.95 },
    animate: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            loading={loading}
          >
            {label}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        {/* Animated Icon */}
        <motion.div 
          className={cn('w-14 h-14 rounded-full flex items-center justify-center mb-4', config.iconBg)}
          variants={iconVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.15, 1],
            }}
            transition={{ 
              duration: 1.8,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            <Icon className={cn('w-7 h-7', config.iconColor)} />
          </motion.div>
        </motion.div>

        {/* Animated Message */}
        <motion.p 
          className="text-neutral-600 mb-4"
          variants={contentVariants}
          initial="initial"
          animate="animate"
        >
          {message}
        </motion.p>

        {/* Animated Item List for Bulk Operations */}
        {itemNames.length > 0 && (
          <motion.div 
            className="w-full bg-neutral-50 rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-thin"
            variants={contentVariants}
            initial="initial"
            animate="animate"
          >
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Selected Items ({itemNames.length})
            </p>
            <motion.ul 
              className="space-y-1"
              variants={listVariants}
              initial="initial"
              animate="animate"
            >
              {itemNames.map((name, index) => (
                <motion.li
                  key={index}
                  className="text-sm text-neutral-700 py-1 px-2 bg-white rounded border border-neutral-200 truncate"
                  title={name}
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.03,
                    x: 4,
                    backgroundColor: '#f3f4f6',
                    transition: { type: 'spring', stiffness: 400, damping: 20 }
                  }}
                >
                  {name}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
