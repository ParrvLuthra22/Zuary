export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easeInOut = [0.65, 0, 0.35, 1] as const;
export const easeSnap = [0.34, 1.4, 0.64, 1] as const;

export const dur = {
  micro: 0.18,
  fast: 0.32,
  mid: 0.6,
  slow: 1.0,
  page: 0.7,
} as const;

/** The same curves in CSS form, for anything outside Framer. */
export const cssEase = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  snap: "cubic-bezier(0.34, 1.4, 0.64, 1)",
} as const;
