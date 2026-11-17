import type { Transition, Variants } from "motion/react";

export const SPRING_TACTILE: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.8,
};

export const SPRING_CARD_FLIP: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.9,
};

export const SPRING_HUD: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 26,
};

export const EASE_SETTLE: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

export const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03,
    },
  },
};

export const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const PANEL_FADE: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14 },
  },
};

export const MAGNETIC_HOVER = {
  y: -2,
  scale: 1.008,
  transition: SPRING_TACTILE,
};

export const BUTTON_TAP = {
  scale: 0.97,
  transition: { duration: 0.08 },
};
