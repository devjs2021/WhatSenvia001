"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  Settings,
  Clock,
  TrendingUp,
  Shuffle,
  Timer,
  LayoutDashboard,
  Send,
  FileText,
  PieChart,
  Save,
  type LucideIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Toggle Switch
   ──────────────────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
        checked ? "bg-emerald-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[20px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
   Control Card
   ──────────────────────────────────────────────────────────── */

function ControlCard({
  icon: Icon,
  title,
  active,
  onToggle,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  active: boolean;
  onToggle: (v: boolean) => void;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 transition-all duration-300 hover:shadow-md hover:border-slate-200/80">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
              active ? "bg-emerald-50" : "bg-slate-50"
            }`}
          >
            <Icon
              className={`h-5 w-5 transition-colors duration-300 ${
                active ? "text-emerald-500" : "text-slate-400"
              }`}
              strokeWidth={1.5}
            />
          </div>
          <div>
            <h3
              className="text-[16px] font-medium text-slate-800"
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              }}
            >
              {title}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium mt-1.5 tracking-wide transition-colors duration-300 ${
                active
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <Toggle checked={active} onChange={onToggle} />
      </div>

      {/* Description */}
      <p className="text-[14px] text-slate-500 leading-relaxed mb-5">
        {description}
      </p>

      {/* Content — fades when inactive */}
      <div
        className={`transition-all duration-300 ${
          !active ? "opacity-25 pointer-events-none select-none" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Warm-up Chart (SVG)
   ──────────────────────────────────────────────────────────── */

function WarmupChart({ active }: { active: boolean }) {
  const color = active ? "#10b981" : "#cbd5e1";
  const colorFaded = active ? "#10b981" : "#94a3b8";
  const points = [
    { x: 0, y: 58 },
    { x: 48, y: 50 },
    { x: 96, y: 38 },
    { x: 144, y: 26 },
    { x: 192, y: 14 },
    { x: 240, y: 4 },
  ];
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const polygon = `${polyline} 240,68 0,68`;

  return (
    <>
      <div className="h-20 w-full">
        <svg
          viewBox="0 0 240 70"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="warmupGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorFaded} stopOpacity="0.12" />
              <stop offset="100%" stopColor={colorFaded} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={polygon} fill="url(#warmupGrad)" />
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="white"
              stroke={color}
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[11px] text-slate-300 mt-1.5 px-0.5 font-medium">
        <span>Day 1</span>
        <span>Day 3</span>
        <span>Day 5</span>
        <span>Day 7</span>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Cooldown Slider
   ──────────────────────────────────────────────────────────── */

function CooldownSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - 1) / 23) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-slate-600 font-normal">
          Tiempo de espera
        </span>
        <span
          className="text-[14px] font-semibold text-emerald-600 tabular-nums"
          style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          }}
        >
          {value}h
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={24}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, #10b981 0%, #10b981 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
        }}
        className="w-full h-[6px] rounded-full appearance-none cursor-pointer outline-none
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-[18px]
          [&::-webkit-slider-thumb]:w-[18px]
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-emerald-500
          [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.15)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:border-[2.5px]
          [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:h-[18px]
          [&::-moz-range-thumb]:w-[18px]
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-emerald-500
          [&::-moz-range-thumb]:border-[2.5px]
          [&::-moz-range-thumb]:border-white
          [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.15)]
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-track]:bg-transparent
        "
      />
      <div className="flex justify-between text-[11px] text-slate-300 font-medium">
        <span>1h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */

const navTabs = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Campaigns", icon: Send },
  { name: "Templates", icon: FileText },
  { name: "Reports", icon: PieChart },
];

export default function DemoPage() {
  const [dailyLimit, setDailyLimit] = useState(false);
  const [warmup, setWarmup] = useState(false);
  const [spintax, setSpintax] = useState(false);
  const [cooldown, setCooldown] = useState(true);
  const [cooldownHours, setCooldownHours] = useState(4);
  const [maxMessages, setMaxMessages] = useState(100);
  const [activeTab, setActiveTab] = useState("Campaigns");

  return (
    <div
      className="min-h-screen bg-slate-50 antialiased"
      style={{
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[56px]">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Send className="h-3.5 w-3.5 text-white" strokeWidth={2} />
            </div>
            <span
              className="text-[17px] font-bold tracking-[-0.02em] text-slate-900"
              style={{
                fontFamily:
                  '"Plus Jakarta Sans", system-ui, sans-serif',
              }}
            >
              ClickSend
            </span>
          </div>

          {/* Center tabs */}
          <div className="hidden sm:flex items-center gap-0.5 bg-slate-50/80 rounded-lg p-0.5">
            {navTabs.map((tab) => {
              const isActive = tab.name === activeTab;
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex items-center gap-2 px-3.5 py-[7px] rounded-md text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? "text-slate-900 bg-white shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <tab.icon className="h-[15px] w-[15px]" strokeWidth={1.5} />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-0.5">
            <button className="relative p-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
              <span className="absolute top-2.5 right-2.5 h-[6px] w-[6px] rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>
            <button className="p-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
            <div className="ml-2 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center ring-2 ring-white shadow-sm cursor-pointer">
              <span
                className="text-[11px] font-bold text-emerald-700"
                style={{
                  fontFamily:
                    '"Plus Jakarta Sans", system-ui, sans-serif',
                }}
              >
                AV
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Section header */}
        <div className="mb-8">
          <h1
            className="text-[24px] font-semibold text-slate-900 tracking-[-0.02em]"
            style={{
              fontFamily:
                '"Plus Jakarta Sans", system-ui, sans-serif',
            }}
          >
            Control de Campanas
          </h1>
          <p className="text-[14px] text-slate-500 mt-1.5 leading-relaxed">
            Configura limites, calentamiento, variaciones y tiempos de espera
            para proteger tu numero.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {/* ── Card 1: Daily Limit (inactive) ──────────── */}
          <ControlCard
            icon={Clock}
            title="Limite Diario"
            active={dailyLimit}
            onToggle={setDailyLimit}
            description="Establece un maximo de mensajes por dia para cumplir con los limites de la plataforma."
          >
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={maxMessages}
                  onChange={(e) =>
                    setMaxMessages(Number(e.target.value) || 1)
                  }
                  className="flex-1 h-10 rounded-lg border border-slate-200 bg-slate-50/60 px-4 text-[14px] text-slate-700 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 transition-all"
                />
                <span className="text-[12px] text-slate-400 whitespace-nowrap font-medium tracking-wide">
                  msgs / day
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[12px] text-slate-400 font-medium">
                  <span>Progress today</span>
                  <span className="tabular-nums">0 / {maxMessages}</span>
                </div>
                <div className="h-[6px] w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-0 rounded-full bg-emerald-400 transition-all duration-500" />
                </div>
              </div>
            </div>
          </ControlCard>

          {/* ── Card 2: Warm-up (inactive) ──────────────── */}
          <ControlCard
            icon={TrendingUp}
            title="Calentamiento"
            active={warmup}
            onToggle={setWarmup}
            description="Incrementa gradualmente el volumen de envio para construir reputacion del remitente."
          >
            <WarmupChart active={warmup} />
          </ControlCard>

          {/* ── Card 3: Spintax (inactive) ──────────────── */}
          <ControlCard
            icon={Shuffle}
            title="Spintax / Variaciones"
            active={spintax}
            onToggle={setSpintax}
            description="Crea variaciones del mensaje para evitar la deteccion de spam automatica."
          >
            <textarea
              placeholder={`Hola {name}, te escribo porque {VariosM1}.\nQueria contarte sobre {VariosM2}.\n!Saludos!`}
              className="w-full h-[96px] rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-[14px] text-slate-600 placeholder:text-slate-300 resize-none focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 transition-all leading-relaxed"
            />
          </ControlCard>

          {/* ── Card 4: Cooldown (ACTIVE) ───────────────── */}
          <ControlCard
            icon={Timer}
            title="Cooldown"
            active={cooldown}
            onToggle={setCooldown}
            description="Define un tiempo de espera entre campanas para proteger tu numero de bloqueos."
          >
            <CooldownSlider
              value={cooldownHours}
              onChange={setCooldownHours}
            />
          </ControlCard>
        </div>

        {/* ── Save Button ───────────────────────────────────── */}
        <div className="flex justify-end mt-8">
          <button
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[14px] font-semibold transition-all duration-150 shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98]"
            style={{
              fontFamily:
                '"Plus Jakarta Sans", system-ui, sans-serif',
            }}
          >
            <Save className="h-[16px] w-[16px]" strokeWidth={1.5} />
            Guardar Configuracion
          </button>
        </div>
      </main>
    </div>
  );
}
