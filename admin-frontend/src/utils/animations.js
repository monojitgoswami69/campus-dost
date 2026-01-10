/**
 * Animation Variants & Utilities
 * Smooth, natural-feeling animations using Framer Motion
 */

// ============================================
// EASING CURVES - Natural motion physics
// ============================================
export const easings = {
  // Smooth deceleration - great for entrances
  easeOut: [0.16, 1, 0.3, 1],
  // Smooth acceleration - great for exits
  easeIn: [0.4, 0, 1, 0.5],
  // Balanced - general purpose
  easeInOut: [0.65, 0, 0.35, 1],
  // Elastic bounce - playful interactions
  elastic: [0.68, -0.6, 0.32, 1.6],
  // Soft spring - subtle bounce
  softSpring: [0.34, 1.56, 0.64, 1],
  // Quick snap - responsive UI
  snap: [0.23, 1, 0.32, 1],
};

// Spring configurations for natural physics
export const springs = {
  // Snappy - quick responsive feedback
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  // Smooth - fluid motion
  smooth: { type: 'spring', stiffness: 300, damping: 35 },
  // Gentle - soft, relaxed motion
  gentle: { type: 'spring', stiffness: 200, damping: 25 },
  // Bouncy - playful with overshoot
  bouncy: { type: 'spring', stiffness: 400, damping: 15 },
  // Stiff - minimal overshoot
  stiff: { type: 'spring', stiffness: 500, damping: 40 },
  // Molasses - slow and smooth
  molasses: { type: 'spring', stiffness: 120, damping: 20 },
};

// ============================================
// PAGE TRANSITIONS
// ============================================
export const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 12,
    filter: 'blur(4px)',
  },
  animate: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: easings.easeOut,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  },
  exit: { 
    opacity: 0,
    y: -8,
    filter: 'blur(2px)',
    transition: {
      duration: 0.25,
      ease: easings.easeIn,
    }
  }
};

export const pageSlideVariants = {
  initial: { 
    opacity: 0, 
    x: 20,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.35,
      ease: easings.easeOut,
    }
  },
  exit: { 
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    }
  }
};

// ============================================
// CONTAINER & STAGGER ANIMATIONS
// ============================================
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    }
  }
};

export const staggerContainerFast = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    }
  }
};

export const staggerContainerSlow = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    }
  }
};

// ============================================
// CARD ANIMATIONS
// ============================================
export const cardVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.96,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    }
  },
  hover: {
    y: -4,
    scale: 1.02,
    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15)',
    transition: springs.snappy,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  }
};

export const cardVariantsSubtle = {
  initial: { 
    opacity: 0, 
    y: 16,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: easings.easeOut,
    }
  },
  hover: {
    y: -2,
    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
    transition: springs.snappy,
  },
};

// ============================================
// LIST ITEM ANIMATIONS
// ============================================
export const listItemVariants = {
  initial: { 
    opacity: 0, 
    x: -16,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: easings.easeOut,
    }
  },
  exit: {
    opacity: 0,
    x: 16,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    }
  },
  hover: {
    x: 4,
    backgroundColor: 'rgba(0,0,0,0.02)',
    transition: springs.snappy,
  }
};

export const tableRowVariants = {
  initial: { 
    opacity: 0,
    y: 8,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.25,
      ease: easings.easeOut,
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
    transition: {
      duration: 0.3,
      ease: easings.easeIn,
      opacity: { duration: 0.15 },
      height: { duration: 0.25, delay: 0.1 },
    }
  },
  hover: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    transition: { duration: 0.15 },
  }
};

// ============================================
// BUTTON ANIMATIONS
// ============================================
export const buttonVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.03,
    transition: springs.snappy,
  },
  tap: { 
    scale: 0.97,
    transition: { duration: 0.1 },
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
  }
};

export const buttonPulseVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.05,
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
    transition: springs.bouncy,
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

export const iconButtonVariants = {
  initial: { scale: 1, rotate: 0 },
  hover: { 
    scale: 1.1,
    rotate: 5,
    transition: springs.snappy,
  },
  tap: { 
    scale: 0.9,
    rotate: -5,
    transition: { duration: 0.1 },
  },
};

// ============================================
// MODAL ANIMATIONS
// ============================================
export const modalBackdropVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.25, ease: 'linear' }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: 'linear', delay: 0.1 }
  }
};

export const modalContentVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    y: 20,
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: springs.smooth,
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    }
  }
};

export const modalSlideUpVariants = {
  initial: { 
    opacity: 0, 
    y: '100%',
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: springs.smooth,
  },
  exit: { 
    opacity: 0,
    y: '100%',
    transition: {
      duration: 0.25,
      ease: easings.easeIn,
    }
  }
};

// ============================================
// SIDEBAR ANIMATIONS
// ============================================
export const sidebarVariants = {
  initial: { x: '-100%' },
  animate: { 
    x: 0,
    transition: springs.smooth,
  },
  exit: { 
    x: '-100%',
    transition: {
      duration: 0.25,
      ease: easings.easeIn,
    }
  }
};

export const sidebarItemVariants = {
  initial: { 
    opacity: 0, 
    x: -20,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: easings.easeOut,
    }
  },
  hover: {
    x: 6,
    transition: springs.snappy,
  },
  active: {
    scale: 1.02,
    transition: springs.snappy,
  }
};

// ============================================
// TOAST ANIMATIONS
// ============================================
export const toastVariants = {
  initial: { 
    opacity: 0, 
    x: 100,
    scale: 0.9,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: springs.bouncy,
  },
  exit: { 
    opacity: 0,
    x: 50,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    }
  }
};

export const toastMobileVariants = {
  initial: { 
    opacity: 0, 
    y: -20,
    scale: 0.9,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: springs.snappy,
  },
  exit: { 
    opacity: 0,
    y: -10,
    scale: 0.9,
    transition: {
      duration: 0.15,
      ease: easings.easeIn,
    }
  }
};

// ============================================
// INPUT ANIMATIONS
// ============================================
export const inputFocusVariants = {
  initial: { 
    scale: 1,
    boxShadow: '0 0 0 0px rgba(99, 102, 241, 0)',
  },
  focus: { 
    scale: 1.01,
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.15)',
    transition: springs.snappy,
  },
};

// ============================================
// FADE ANIMATIONS
// ============================================
export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.3, ease: easings.easeOut }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: easings.easeIn }
  }
};

export const fadeScaleVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: springs.smooth,
  },
  exit: { 
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: easings.easeIn,
    }
  }
};

export const fadeSlideUpVariants = {
  initial: { 
    opacity: 0, 
    y: 16,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.35,
      ease: easings.easeOut,
    }
  },
  exit: { 
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    }
  }
};

// ============================================
// SPECIAL EFFECTS
// ============================================
export const pulseVariants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }
  }
};

export const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    }
  }
};

export const shimmerVariants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
      repeatDelay: 0.5,
    }
  }
};

export const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    }
  }
};

export const wiggleVariants = {
  hover: {
    rotate: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    }
  }
};

// ============================================
// CHECKBOX / TOGGLE ANIMATIONS
// ============================================
export const checkboxVariants = {
  unchecked: { 
    scale: 1,
    backgroundColor: 'transparent',
  },
  checked: { 
    scale: [1, 1.2, 1],
    backgroundColor: '#6366F1',
    transition: springs.bouncy,
  },
};

export const checkmarkVariants = {
  unchecked: { 
    pathLength: 0,
    opacity: 0,
  },
  checked: { 
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.3, ease: easings.easeOut },
      opacity: { duration: 0.1 },
    }
  },
};

// ============================================
// DROPDOWN ANIMATIONS
// ============================================
export const dropdownVariants = {
  initial: { 
    opacity: 0, 
    y: -8,
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: springs.snappy,
  },
  exit: { 
    opacity: 0,
    y: -8,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: easings.easeIn,
    }
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create staggered delay for children
 * @param {number} index - Item index
 * @param {number} baseDelay - Base delay in seconds
 * @param {number} stagger - Stagger amount in seconds
 */
export const getStaggerDelay = (index, baseDelay = 0, stagger = 0.05) => ({
  delay: baseDelay + (index * stagger),
});

/**
 * Create custom spring animation
 * @param {number} stiffness - Spring stiffness
 * @param {number} damping - Spring damping
 */
export const createSpring = (stiffness = 300, damping = 30) => ({
  type: 'spring',
  stiffness,
  damping,
});

/**
 * Combine multiple variants
 * @param  {...object} variants - Variant objects to merge
 */
export const combineVariants = (...variants) => {
  return variants.reduce((acc, variant) => ({
    ...acc,
    ...variant,
  }), {});
};

// Default export with all variants
export default {
  easings,
  springs,
  page: pageVariants,
  pageSlide: pageSlideVariants,
  stagger: staggerContainer,
  staggerFast: staggerContainerFast,
  staggerSlow: staggerContainerSlow,
  card: cardVariants,
  cardSubtle: cardVariantsSubtle,
  listItem: listItemVariants,
  tableRow: tableRowVariants,
  button: buttonVariants,
  buttonPulse: buttonPulseVariants,
  iconButton: iconButtonVariants,
  modalBackdrop: modalBackdropVariants,
  modalContent: modalContentVariants,
  modalSlideUp: modalSlideUpVariants,
  sidebar: sidebarVariants,
  sidebarItem: sidebarItemVariants,
  toast: toastVariants,
  toastMobile: toastMobileVariants,
  inputFocus: inputFocusVariants,
  fade: fadeVariants,
  fadeScale: fadeScaleVariants,
  fadeSlideUp: fadeSlideUpVariants,
  pulse: pulseVariants,
  float: floatVariants,
  shimmer: shimmerVariants,
  spin: spinVariants,
  wiggle: wiggleVariants,
  checkbox: checkboxVariants,
  checkmark: checkmarkVariants,
  dropdown: dropdownVariants,
};
