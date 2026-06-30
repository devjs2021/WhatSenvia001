// Deterministic color assignment per WhatsApp account/session, so the same
// account always renders with the same color across chat-live and templates.

export interface SessionColor {
  dot: string;
  ring: string;
  border: string;
  text: string;
  badge: string;
}

const PALETTE: SessionColor[] = [
  { dot: "bg-emerald-500", ring: "ring-emerald-400", border: "border-emerald-300", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { dot: "bg-blue-500", ring: "ring-blue-400", border: "border-blue-300", text: "text-blue-600", badge: "bg-blue-50 text-blue-600 border-blue-200" },
  { dot: "bg-violet-500", ring: "ring-violet-400", border: "border-violet-300", text: "text-violet-600", badge: "bg-violet-50 text-violet-600 border-violet-200" },
  { dot: "bg-amber-500", ring: "ring-amber-400", border: "border-amber-300", text: "text-amber-600", badge: "bg-amber-50 text-amber-600 border-amber-200" },
  { dot: "bg-rose-500", ring: "ring-rose-400", border: "border-rose-300", text: "text-rose-600", badge: "bg-rose-50 text-rose-600 border-rose-200" },
  { dot: "bg-cyan-500", ring: "ring-cyan-400", border: "border-cyan-300", text: "text-cyan-600", badge: "bg-cyan-50 text-cyan-600 border-cyan-200" },
  { dot: "bg-fuchsia-500", ring: "ring-fuchsia-400", border: "border-fuchsia-300", text: "text-fuchsia-600", badge: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200" },
  { dot: "bg-orange-500", ring: "ring-orange-400", border: "border-orange-300", text: "text-orange-600", badge: "bg-orange-50 text-orange-600 border-orange-200" },
];

const FALLBACK: SessionColor = { dot: "bg-slate-400", ring: "ring-slate-300", border: "border-slate-200", text: "text-slate-500", badge: "bg-slate-50 text-slate-500 border-slate-200" };

export function getSessionColor(sessionId?: string | null): SessionColor {
  if (!sessionId) return FALLBACK;
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function getSessionColorMap<T extends { id: string }>(sessions: T[]): Record<string, SessionColor> {
  const map: Record<string, SessionColor> = {};
  for (const s of sessions) map[s.id] = getSessionColor(s.id);
  return map;
}
