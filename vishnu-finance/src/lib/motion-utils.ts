/**
 * Motion utilities for consistent animations across the app
 * Respects prefers-reduced-motion and provides GPU-optimized animations
 */

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Standard timing constants
export const TIMING = {
  SMALL: 0.14, // 120-160ms
  MEDIUM: 0.28, // 240-320ms
  LARGE: 0.36, // 320-400ms
} as const;

// Standard easing curves - Framer Motion expects arrays [x1, y1, x2, y2]
export const EASING = {
  STANDARD: [0.22, 0.9, 0.3, 1] as [number, number, number, number],
  EASE_OUT: [0.22, 0.9, 0.3, 1] as [number, number, number, number],
  EASE_IN_OUT: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

// Framer Motion variants that respect reduced motion
export const createMotionVariants = (variants: {
  hidden?: Record<string, any>;
  visible?: Record<string, any>;
  exit?: Record<string, any>;
}) => {
  const reduced = prefersReducedMotion();
  
  if (reduced) {
    // For reduced motion, only animate opacity
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  
  return variants;
};

// Scale animation for buttons (respects reduced motion)
export const getScaleAnimation = () => {
  if (prefersReducedMotion()) {
    return { scale: 1 };
  }
  return {
    scale: [1, 0.95, 1],
    transition: { duration: TIMING.SMALL, ease: EASING.EASE_OUT },
  };
};

// Fade animation
export const getFadeAnimation = (duration = TIMING.MEDIUM) => {
  if (prefersReducedMotion()) {
    return { opacity: 1 };
  }
  return {
    opacity: [0, 1],
    transition: { duration, ease: EASING.EASE_OUT },
  };
};

// Slide up animation (for sheets/modals)
export const getSlideUpAnimation = (distance = 100) => {
  if (prefersReducedMotion()) {
    return { y: 0, opacity: 1 };
  }
  return {
    y: [distance, 0],
    opacity: [0, 1],
    transition: { duration: TIMING.MEDIUM, ease: EASING.EASE_OUT },
  };
};

// Slide down animation
export const getSlideDownAnimation = (distance = 100) => {
  if (prefersReducedMotion()) {
    return { y: 0, opacity: 1 };
  }
  return {
    y: [-distance, 0],
    opacity: [0, 1],
    transition: { duration: TIMING.MEDIUM, ease: EASING.EASE_OUT },
  };
};

// While tap animation (for buttons)
export const getWhileTap = () => {
  if (prefersReducedMotion()) {
    return {};
  }
  return {
    scale: 0.95,
    transition: { duration: TIMING.SMALL, ease: EASING.EASE_OUT },
  };
};

// While hover animation
export const getWhileHover = () => {
  if (prefersReducedMotion()) {
    return {};
  }
  return {
    scale: 1.02,
    transition: { duration: TIMING.SMALL, ease: EASING.EASE_OUT },
  };
};

// Spring animation config
export const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.5,
};

// Stagger children animation
export const getStaggerChildren = (delay = 0.05) => {
  if (prefersReducedMotion()) {
    return { delayChildren: 0 };
  }
  return {
    delayChildren: delay,
    staggerChildren: delay,
  };
};

