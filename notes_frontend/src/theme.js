//
// Ocean Professional Theme for Notes App
// Exports color tokens, spacing, radii, shadows, elevations, and helper utilities
// for consistent styling across LightningJS (Blits) components.
//

// PUBLIC_INTERFACE
export const colors = {
  /** Brand primary (buttons, accents, interactive highlights) */
  primary: '#2563EB', // Blue-600
  /** Brand secondary/accent (emphasis, highlights, status-ok) */
  secondary: '#F59E0B', // Amber-500
  /** Semantic success (aligned to secondary as requested) */
  success: '#F59E0B', // Amber-500
  /** Semantic error */
  error: '#EF4444', // Red-500
  /** Application background (app canvas) */
  background: '#f9fafb', // Gray-50
  /** Surface background (cards, panels, modals) */
  surface: '#ffffff', // White
  /** Default text color */
  text: '#111827', // Gray-900
};

// PUBLIC_INTERFACE
export const radii = {
  /** Subtle rounding for small UI elements (chips, small buttons) */
  xs: 4,
  /** Rounded corners for inputs and medium controls */
  sm: 6,
  /** Common radius for cards and panels */
  md: 8,
  /** Large radius for prominent surfaces */
  lg: 12,
  /** Fully rounded (e.g., pills) */
  full: 9999,
};

// PUBLIC_INTERFACE
export const spacing = {
  /** 0 spacing */
  none: 0,
  /** 2px spacing */
  xxs: 2,
  /** 4px spacing */
  xs: 4,
  /** 8px spacing */
  sm: 8,
  /** 12px spacing */
  md: 12,
  /** 16px spacing */
  lg: 16,
  /** 24px spacing */
  xl: 24,
  /** 32px spacing */
  '2xl': 32,
  /** 40px spacing */
  '3xl': 40,
};

// PUBLIC_INTERFACE
export const shadows = {
  /** Subtle hairline shadow for small elements */
  xs: '0 1px 1px rgba(0,0,0,0.04)',
  /** Light card shadow */
  sm: '0 1px 2px rgba(0,0,0,0.05), 0 1px 1px rgba(0,0,0,0.03)',
  /** Medium elevation for interactive cards */
  md: '0 2px 6px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  /** Elevated panels and popovers */
  lg: '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.06)',
  /** Highest elevation (modals) */
  xl: '0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04)',
};

// INTERNAL: numeric levels tied to shadows above
const elevationLevels = {
  0: 'none',
  1: shadows.xs,
  2: shadows.sm,
  3: shadows.md,
  4: shadows.lg,
  5: shadows.xl,
};

// PUBLIC_INTERFACE
export function elevation(level = 1) {
  /**
   * Returns a box-shadow string corresponding to the requested elevation level.
   * Level range: 0..5
   * Example:
   *   style = { boxShadow: elevation(3) }
   */
  const clamped = Math.max(0, Math.min(5, Number(level) || 1));
  return elevationLevels[clamped];
}

// PUBLIC_INTERFACE
export function gradient(from = 'from-blue-500/10', to = 'to-gray-50') {
  /**
   * Returns a CSS gradient matching the "Ocean Professional" subtle depth guidance.
   * Parameters accept semantic tokens (tailwind-like hints) but resolve to fixed colors for the app.
   * Example:
   *   backgroundImage: gradient()
   */
  // Map semantic tokens to actual rgba hex/alpha stops used in the app
  const map = {
    'from-blue-500/10': 'rgba(37, 99, 235, 0.10)', // #2563EB @10%
    'from-amber-500/10': 'rgba(245, 158, 11, 0.10)', // #F59E0B @10%
    'from-white/0': 'rgba(255, 255, 255, 0)',
    'to-gray-50': '#f9fafb',
    'to-white': '#ffffff',
  };

  const fromColor = map[from] || 'rgba(37, 99, 235, 0.08)';
  const toColor = map[to] || colors.background;

  return `linear-gradient(180deg, ${fromColor} 0%, ${toColor} 100%)`;
}

// PUBLIC_INTERFACE
export function focusRing({
  color = colors.primary,
  width = 2,
  offset = 2,
  inset = false,
} = {}) {
  /**
   * Returns a style object for a consistent accessible focus indication.
   * Use to style focused elements in a11y-friendly way.
   * Example:
   *   const base = { ...withSurfaceStyle() }
   *   const onFocus = focusRing()
   *   const style = isFocused ? { ...base, ...onFocus } : base
   */
  const outline = `${width}px solid ${color}`;
  const outlineOffset = inset ? -offset : offset;
  return {
    outline,
    outlineOffset: `${outlineOffset}px`,
    // Shadow ring to enhance visibility without layout shift
    boxShadow: `0 0 0 ${Math.max(0, width)}px ${color}22`,
    // Some engines respect filter-based ring more smoothly; optional:
    // filter: 'drop-shadow(0 0 0.5px rgba(0,0,0,0.15))',
  };
}

// PUBLIC_INTERFACE
export function withSurfaceStyle({
  padding = spacing.lg,
  radius = radii.md,
  shadow = shadows.sm,
  surfaceColor = colors.surface,
  textColor = colors.text,
  useGradient = false,
} = {}) {
  /**
   * Returns a base style object for cards/panels/surfaces to ensure consistency.
   * Parameters let components opt into gradient backgrounds and tweak sizing.
   * Example:
   *   const panelStyle = withSurfaceStyle({ useGradient: true, shadow: shadows.md })
   */
  const base = {
    backgroundColor: surfaceColor,
    color: textColor,
    borderRadius: radius,
    boxShadow: shadow,
    padding,
  };

  if (useGradient) {
    base.backgroundImage = gradient();
    // Keep solid base to ensure good contrast, gradient overlays subtly
    base.backgroundColor = 'transparent';
  }

  return base;
}

// PUBLIC_INTERFACE
export const theme = {
  name: 'Ocean Professional',
  colors,
  spacing,
  radii,
  shadows,
  elevation,
  gradient,
  utils: {
    focusRing,
    withSurfaceStyle,
  },
};

export default theme;
