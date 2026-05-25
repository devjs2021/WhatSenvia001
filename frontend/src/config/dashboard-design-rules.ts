/**
 * ClickSend Dashboard Design Rules (Fase 2)
 * 
 * Tokens reutilizables para mantener consistencia visual en todo el dashboard.
 * Estilo: Linear / Vercel / Stripe Dashboard
 * 
 * Paleta:
 *   - Fondo: slate-50
 *   - Cards: white
 *   - Acento: emerald-600 / emerald-500
 *   - Bordes: slate-100 / slate-200
 *   - Tipografía: 'Inter' (texto), 'Plus Jakarta Sans' (títulos)
 */

export const DESIGN_TOKENS = {
  // ── Spacing ──────────────────────────────────────────────
  spacing: {
    page: "space-y-4 md:space-y-6",
    section: "space-y-4",
    card: "space-y-4",
    grid: "gap-4 md:gap-6",
  },

  // ── Border Radius ─────────────────────────────────────────
  radius: {
    card: "rounded-3xl",
    cardInner: "rounded-2xl",
    button: "rounded-xl",
    input: "rounded-xl",
    badge: "rounded-full",
    table: "rounded-[32px]",
  },

  // ── Shadows ───────────────────────────────────────────────
  shadows: {
    card: "shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
    none: "shadow-none",
  },

  // ── Container Widths ──────────────────────────────────────
  container: {
    page: "max-w-none",
    narrow: "max-w-4xl",
  },

  // ── Transitions ───────────────────────────────────────────
  transitions: {
    default: "transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)",
    fast: "transition-all duration-150 cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // ── Card Styles ───────────────────────────────────────────
  card: {
    base: "bg-white border border-slate-100 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
    metric: "bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
    table: "bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
    glass: "bg-white/80 backdrop-blur-sm border border-slate-100 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
  },

  // ── Status Colors ─────────────────────────────────────────
  status: {
    success: "bg-emerald-50 text-emerald-600 border-emerald-200",
    warning: "bg-amber-50 text-amber-600 border-amber-200",
    error: "bg-red-50 text-red-600 border-red-200",
    info: "bg-blue-50 text-blue-600 border-blue-200",
    neutral: "bg-slate-50 text-slate-500 border-slate-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  },

  // ── Typography ────────────────────────────────────────────
  typography: {
    h1: "font-display text-2xl md:text-3xl font-bold text-slate-900 tracking-tight",
    h2: "font-display text-xl font-bold text-slate-900 tracking-tight",
    h3: "font-display text-base font-bold text-slate-900",
    subtitle: "text-slate-400 text-sm",
    body: "text-sm text-slate-600",
    caption: "text-xs text-slate-400",
    label: "text-xs font-semibold text-slate-400 uppercase tracking-wider",
    mono: "font-mono text-sm",
  },

  // ── Input Styles ──────────────────────────────────────────
  input: {
    base: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
    select: "appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer",
    textarea: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
  },

  // ── Button Styles ─────────────────────────────────────────
  button: {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
    outline: "border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all",
    ghost: "hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl px-3 py-2 text-sm font-medium transition-all",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 rounded-xl px-4 py-2 text-sm font-medium transition-all",
    icon: "h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all",
  },

  // ── Table Styles ──────────────────────────────────────────
  table: {
    wrapper: "overflow-x-auto",
    table: "w-full min-w-[600px]",
    th: "px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider",
    td: "px-4 py-3 text-sm text-slate-600",
    tr: "border-b border-slate-100 hover:bg-slate-50/50 transition-colors",
  },

  // ── Badge Styles ──────────────────────────────────────────
  badge: {
    base: "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    error: "bg-red-50 text-red-600",
    info: "bg-blue-50 text-blue-600",
    neutral: "bg-slate-100 text-slate-500",
  },

  // ── Tab Styles ────────────────────────────────────────────
  tab: {
    active: "text-emerald-600 border-b-2 border-emerald-600",
    inactive: "text-slate-400 border-b-2 border-transparent hover:text-slate-600",
    base: "px-4 py-2.5 text-sm font-medium transition-colors",
  },

  // ── Divider ───────────────────────────────────────────────
  divider: "border-t border-slate-100",

  // ── Background ────────────────────────────────────────────
  bg: {
    page: "bg-slate-50",
    card: "bg-white",
    muted: "bg-slate-50",
    accent: "bg-emerald-50",
  },
} as const;

export type DesignToken = typeof DESIGN_TOKENS;
