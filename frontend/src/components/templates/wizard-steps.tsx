"use client";

import { useState } from "react";
import {
  Check,
  X,
  Info,
  HelpCircle,
  Type,
  Image,
  Video,
  File,
  Tag,
  Hash,
  Sparkles,
  BookOpen,
  Shield,
  Sliders,
  AlignLeft,
  MessageSquareText,
} from "lucide-react";
import type { ValidationMessage } from "./template-validator";

// ─── Types ────────────────────────────────────────────────────────────────

export type WizardStep = "category" | "basics" | "header" | "body" | "params" | "footer" | "buttons" | "preview";

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

export type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";

export const STEPS: { id: WizardStep; label: string; icon: any }[] = [
  { id: "category", label: "Categoria", icon: BookOpen },
  { id: "basics", label: "Nombre e Idioma", icon: Tag },
  { id: "header", label: "Header", icon: Type },
  { id: "body", label: "Body", icon: AlignLeft },
  { id: "params", label: "Parametros", icon: Sliders },
  { id: "footer", label: "Footer", icon: MessageSquareText },
  { id: "buttons", label: "Botones", icon: MessageSquareText },
  { id: "preview", label: "Revision Final", icon: MessageSquareText },
];

export const CATEGORIES = [
  {
    id: "MARKETING",
    label: "Marketing",
    description: "Promociones, ofertas, bienvenida y contenido publicitario",
    icon: Sparkles,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    pricing: "Mayor costo",
    pricingColor: "text-amber-600",
  },
  {
    id: "UTILITY",
    label: "Utilidad",
    description: "Notificaciones transaccionales, confirmaciones, alertas",
    icon: Shield,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    pricing: "Costo medio",
    pricingColor: "text-slate-600",
  },
  {
    id: "AUTHENTICATION",
    label: "Autenticacion",
    description: "Codigos de verificacion y autenticacion 2FA",
    icon: Hash,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    pricing: "Menor costo",
    pricingColor: "text-emerald-600",
  },
];

export const LANGUAGES = [
  { code: "es", label: "Espanol", flag: "ES" },
  { code: "en_US", label: "English (US)", flag: "EN" },
  { code: "pt_BR", label: "Portugues (Brasil)", flag: "PT" },
];

export const HEADER_FORMATS: { id: HeaderFormat; label: string; icon: any; description: string }[] = [
  { id: "NONE", label: "Sin Header", icon: X, description: "No incluir encabezado" },
  { id: "TEXT", label: "Texto", icon: Type, description: "Texto plano, maximo 60 caracteres" },
  { id: "IMAGE", label: "Imagen", icon: Image, description: "JPG o PNG" },
  { id: "VIDEO", label: "Video", icon: Video, description: "MP4" },
  { id: "DOCUMENT", label: "Documento", icon: File, description: "PDF" },
];

// ─── Validation Icon ──────────────────────────────────────────────────────

export function ValidationIcon({ level }: { level: ValidationMessage["level"] }) {
  if (level === "error") return <X className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />;
  if (level === "warning") return <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />;
  if (level === "info") return <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />;
  return <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />;
}

// ─── Tooltip Component ────────────────────────────────────────────────────

export function HelpTooltip({ children, title }: { children: React.ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64">
          <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-lg">
            <p className="font-semibold mb-1">{title}</p>
            <div className="text-slate-300">{children}</div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
        </div>
      )}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────

export function WizardProgress({ currentStep, score, getScoreBgColor, getScoreColor }: {
  currentStep: WizardStep;
  score: number;
  getScoreBgColor: (s: number) => string;
  getScoreColor: (s: number) => string;
}) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getScoreBgColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-xs font-bold font-mono ${getScoreColor(score)}`}>{score}%</span>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const isActive = i === currentIndex;
          const isCompleted = i < currentIndex;

          return (
            <div key={step.id} className="flex items-center gap-0">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <StepIcon className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-4 mx-0.5 ${isCompleted ? "bg-emerald-300" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step: Category Selection ─────────────────────────────────────────────

export function CategoryStep({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Selecciona una Categoria</h3>
        <p className="text-sm text-slate-400 mt-1">
          La categoria determina el tipo de mensaje, el costo y las reglas de revision de Meta.
        </p>
      </div>

      <div className="grid gap-3">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`text-left w-full rounded-2xl border-2 p-4 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cat.color.split(" ")[0]} ${cat.color.split(" ")[1]}`}>
                  <CatIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{cat.label}</span>
                    <span className={`text-xs font-medium ${cat.pricingColor}`}>{cat.pricing}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{cat.description}</p>
                </div>
                {isSelected && (
                  <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">?No sabes que categoria elegir?</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Marketing</strong>: Para promocionar productos o servicios</li>
              <li><strong>Utilidad</strong>: Para notificar sobre una transaccion o actualizacion</li>
              <li><strong>Autenticacion</strong>: Solo para codigos de verificacion</li>
            </ul>
            <p className="mt-1">La categoria incorrecta puede resultar en el rechazo de la plantilla.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step: Basics (Name + Language) ───────────────────────────────────────

export function BasicsStep({
  name,
  language,
  parameterFormat,
  onNameChange,
  onLanguageChange,
  onParamFormatChange,
}: {
  name: string;
  language: string;
  parameterFormat: "named" | "positional";
  onNameChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onParamFormatChange: (v: "named" | "positional") => void;
}) {
  const nameError = name && !/^[a-z0-9_]+$/.test(name);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Informacion Basica</h3>
        <p className="text-sm text-slate-400 mt-1">Define el nombre, idioma y formato de parametros de tu plantilla.</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre de la Plantilla</label>
          <HelpTooltip title="Nombre de plantilla">
            <p>Debe ser unico en combinacion con el idioma.</p>
            <p className="mt-1">Solo caracteres en minuscula (a-z), numeros (0-9) y guiones bajos (_).</p>
            <p className="mt-1">Maximo 512 caracteres.</p>
          </HelpTooltip>
        </div>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="ej: confirmacion_pedido"
            value={name}
            onChange={(e) => onNameChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            className={`w-full bg-slate-50 border ${
              nameError ? "border-red-300" : "border-slate-200"
            } rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
          />
        </div>
        {nameError && (
          <p className="text-[10px] text-red-500 mt-0.5">Solo se permiten minusculas, numeros y guiones bajos</p>
        )}
        {name && !nameError && (
          <p className="text-[10px] text-emerald-600 mt-0.5">Nombre valido ✓</p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Idioma</label>
          <HelpTooltip title="Idioma de la plantilla">
            <p>Define el idioma del contenido de la plantilla.</p>
            <p className="mt-1">Meta NO traduce automaticamente. Debes proporcionar el texto en el idioma correcto.</p>
            <p className="mt-1">Puedes crear la misma plantilla en varios idiomas.</p>
          </HelpTooltip>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => onLanguageChange(lang.code)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                language === lang.code
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-xs font-bold w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">{lang.flag}</span>
              <span className="truncate">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Formato de Parametros</label>
          <HelpTooltip title="Formato de parametros">
            <p><strong>Posicional (&#123;&#123;1&#125;&#125;)</strong>: Los valores se reemplazan en orden.</p>
            <p className="mt-1"><strong>Con nombre (&#123;&#123;nombre&#125;&#125;)</strong>: Los valores se asignan por nombre.</p>
          </HelpTooltip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onParamFormatChange("positional")}
            className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
              parameterFormat === "positional"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Hash className="h-4 w-4" />
            <div className="text-left">
              <p>Posicional</p>
              <p className="text-[10px] text-slate-400 font-normal">{`{{1}}, {{2}}...`}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onParamFormatChange("named")}
            className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
              parameterFormat === "named"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Tag className="h-4 w-4" />
            <div className="text-left">
              <p>Con Nombre</p>
              <p className="text-[10px] text-slate-400 font-normal">{`{{nombre}}, {{pedido}}...`}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step: Header ─────────────────────────────────────────────────────────

export function HeaderStep({
  format,
  text,
  mediaUrl,
  onFormatChange,
  onTextChange,
  onMediaUrlChange,
}: {
  format: HeaderFormat;
  text: string;
  mediaUrl: string;
  onFormatChange: (f: HeaderFormat) => void;
  onTextChange: (v: string) => void;
  onMediaUrlChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Encabezado (Header)</h3>
        <p className="text-sm text-slate-400 mt-1">Opcional. El encabezado aparece arriba del cuerpo del mensaje.</p>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {HEADER_FORMATS.map((hf) => {
          const HfIcon = hf.icon;
          const isSelected = format === hf.id;
          return (
            <button
              key={hf.id}
              type="button"
              onClick={() => onFormatChange(hf.id)}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
              title={hf.description}
            >
              <HfIcon className="h-4 w-4" />
              <span className="text-[10px] leading-tight text-center">{hf.label}</span>
            </button>
          );
        })}
      </div>

      {format === "TEXT" && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Texto del Header</label>
            <HelpTooltip title="Header de texto">
              <p>Texto en negrita que aparece como encabezado. Maximo 60 caracteres.</p>
            </HelpTooltip>
          </div>
          <input
            placeholder="Ej: Confirmacion de Pedido"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            maxLength={60}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <div className="flex justify-end mt-0.5">
            <span className={`text-[10px] font-mono ${text.length > 55 ? "text-amber-500" : "text-slate-400"}`}>
              {text.length}/60
            </span>
          </div>
        </div>
      )}

      {["IMAGE", "VIDEO", "DOCUMENT"].includes(format) && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              URL del {format === "IMAGE" ? "medio" : format === "VIDEO" ? "video" : "documento"}
            </label>
            <HelpTooltip title={`Header ${format}`}>
              <p>Proporciona la URL publica del archivo multimedia.</p>
              <ul className="list-disc list-inside mt-1">
                {format === "IMAGE" && <li>JPG, PNG - Tamano recomendado: 800x418px</li>}
                {format === "VIDEO" && <li>MP4 - Maximo 16MB, 30 segundos</li>}
                {format === "DOCUMENT" && <li>PDF - Maximo 100MB</li>}
              </ul>
            </HelpTooltip>
          </div>
          <div className="flex items-center gap-2">
            {format === "IMAGE" && <Image className="h-4 w-4 text-slate-400 shrink-0" />}
            {format === "VIDEO" && <Video className="h-4 w-4 text-slate-400 shrink-0" />}
            {format === "DOCUMENT" && <File className="h-4 w-4 text-slate-400 shrink-0" />}
            <input
              placeholder="https://ejemplo.com/imagen.jpg"
              value={mediaUrl}
              onChange={(e) => onMediaUrlChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            El archivo debe ser accesible publicamente. Meta descargara y almacenara una copia.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step: Body ───────────────────────────────────────────────────────────

export function BodyStep({
  text,
  onChange,
  parameterFormat,
}: {
  text: string;
  onChange: (v: string) => void;
  parameterFormat: "named" | "positional";
}) {
  const positionalParams = text.match(/\{\{\d+\}\}/g) || [];
  const namedParams = text.match(/\{\{([a-z_]+)\}\}/g) || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Cuerpo del Mensaje (Body)</h3>
        <p className="text-sm text-slate-400 mt-1">El contenido principal del mensaje. Es obligatorio.</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Texto del Body</label>
          <HelpTooltip title="Body del mensaje">
            <p>Texto principal del mensaje. Soporta hasta 1024 caracteres.</p>
            <p className="mt-1">Usa parametros para personalizar el mensaje.</p>
          </HelpTooltip>
        </div>
        <textarea
          placeholder={
            parameterFormat === "positional"
              ? "Ej: Hola {{1}}, tu pedido {{2}} esta en camino."
              : "Ej: Hola {{nombre}}, tu pedido {{pedido}} esta en camino."
          }
          rows={5}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          maxLength={1024}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1.5 flex-wrap">
            {parameterFormat === "positional" &&
              positionalParams.map((p, i) => (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 font-mono">{p}</span>
              ))}
            {parameterFormat === "named" &&
              namedParams.map((p, i) => (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 font-mono">{p}</span>
              ))}
          </div>
          <span className={`text-[10px] font-mono ${text.length > 1000 ? "text-amber-500" : "text-slate-400"}`}>
            {text.length}/1024
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Insertar parametro</p>
        <div className="flex gap-1.5 flex-wrap">
          {parameterFormat === "positional" ? (
            [1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(text + `{{${n}}}`)}
                className="px-2 py-1 rounded-lg text-xs font-mono font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >{`{{${n}}}`}</button>
            ))
          ) : (
            ["nombre", "apellido", "email", "telefono", "pedido", "codigo"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange(text + `{{${p}}}`)}
                className="px-2 py-1 rounded-lg text-xs font-mono font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >{`{{${p}}}`}</button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step: Parameters ─────────────────────────────────────────────────────

export function ParamsStep({
  bodyText,
  parameterFormat,
  namedParams,
  positionalExamples,
  onNamedParamsChange,
  onPositionalExamplesChange,
}: {
  bodyText: string;
  parameterFormat: "named" | "positional";
  namedParams: Array<{ param_name: string; example: string }>;
  positionalExamples: string[];
  onNamedParamsChange: (params: Array<{ param_name: string; example: string }>) => void;
  onPositionalExamplesChange: (examples: string[]) => void;
}) {
  const positionalMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const namedMatches = bodyText.match(/\{\{([a-z_]+)\}\}/g) || [];

  if (parameterFormat === "positional" && positionalMatches.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Parametros</h3>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
          <Sliders className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No se detectaron parametros en el Body.</p>
          <p className="text-xs text-slate-400 mt-1">Agrega variables en el Body para personalizar el mensaje.</p>
        </div>
      </div>
    );
  }

  if (parameterFormat === "named" && namedMatches.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Parametros</h3>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
          <Sliders className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No se detectaron parametros en el Body.</p>
          <p className="text-xs text-slate-400 mt-1">Agrega variables en el Body para personalizar el mensaje.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Valores de Ejemplo</h3>
        <p className="text-sm text-slate-400 mt-1">
          Proporciona valores de ejemplo para cada parametro. Meta los usara para la revision.
        </p>
      </div>

      {parameterFormat === "positional" && (
        <div className="space-y-2">
          {positionalMatches.map((match, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500 w-8 text-right">{match}</span>
              <input
                placeholder={`Valor de ejemplo para ${match}`}
                value={positionalExamples[i] || ""}
                onChange={(e) => {
                  const updated = [...positionalExamples];
                  updated[i] = e.target.value;
                  onPositionalExamplesChange(updated);
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          ))}
        </div>
      )}

      {parameterFormat === "named" && (
        <div className="space-y-3">
          {[...new Set(namedMatches.map((m) => m.replace(/\{\{|\}\}/g, "")))].map((name) => {
            const existing = namedParams.find((p) => p.param_name === name);
            return (
              <div key={name} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs font-mono font-bold text-purple-600">{`{{${name}}}`}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    placeholder="Nombre del parametro"
                    value={name}
                    disabled
                    className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500"
                  />
                  <input
                    placeholder={`Ej: valor para ${name}`}
                    value={existing?.example || ""}
                    onChange={(e) => {
                      const updated = [...namedParams];
                      const idx = updated.findIndex((p) => p.param_name === name);
                      if (idx >= 0) {
                        updated[idx] = { ...updated[idx], example: e.target.value };
                      } else {
                        updated.push({ param_name: name, example: e.target.value });
                      }
                      onNamedParamsChange(updated);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step: Footer ─────────────────────────────────────────────────────────

export function FooterStep({
  text,
  onChange,
}: {
  text: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Pie de Pagina (Footer)</h3>
        <p className="text-sm text-slate-400 mt-1">Opcional. Texto pequeno que aparece al final del mensaje.</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Texto del Footer</label>
          <HelpTooltip title="Footer">
            <p>Texto pequeno que aparece al final. Maximo 60 caracteres.</p>
            <p className="mt-1">No puede contener parametros ni emojis.</p>
          </HelpTooltip>
        </div>
        <input
          placeholder="Ej: Gracias por tu compra"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          maxLength={60}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <div className="flex justify-end mt-0.5">
          <span className={`text-[10px] font-mono ${text.length > 55 ? "text-amber-500" : "text-slate-400"}`}>
            {text.length}/60
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Step: Buttons ────────────────────────────────────────────────────────

export function ButtonsStep({
  buttons,
  onAdd,
  onUpdate,
  onRemove,
}: {
  buttons: TemplateButton[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<TemplateButton>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Botones</h3>
        <p className="text-sm text-slate-400 mt-1">Opcional. Anade botones interactivos al mensaje. Maximo 3.</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpTooltip title="Tipos de botones">
            <p><strong>Quick Reply</strong>: Respuesta rapida predefinida.</p>
            <p className="mt-1"><strong>URL</strong>: Enlace a una pagina web. Puede incluir parametros como &#123;&#123;1&#125;&#125;.</p>
            <p className="mt-1"><strong>Phone Number</strong>: Llama a un numero telefonico.</p>
          </HelpTooltip>
        </div>
        {buttons.length < 3 && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
          >
            + Agregar Boton
          </button>
        )}
      </div>

      {buttons.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-500">No has agregado botones.</p>
          <p className="text-xs text-slate-400 mt-1">Los botones son opcionales. Puedes agregar hasta 3.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {buttons.map((btn, i) => (
            <div key={i} className="flex items-start gap-2 rounded-2xl border border-slate-200 p-3">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={btn.type}
                    onChange={(e) => onUpdate(i, { type: e.target.value as TemplateButton["type"], url: "", phone_number: "" })}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                  >
                    <option value="QUICK_REPLY">Quick Reply</option>
                    <option value="URL">URL</option>
                    <option value="PHONE_NUMBER">Telefono</option>
                  </select>
                  <input
                    placeholder="Texto del boton (max 25)"
                    value={btn.text}
                    onChange={(e) => onUpdate(i, { text: e.target.value })}
                    maxLength={25}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                {btn.type === "URL" && (
                  <div className="flex items-center gap-1.5">
                    <input
                      placeholder="https://ejemplo.com/{{1}}"
                      value={btn.url || ""}
                      onChange={(e) => onUpdate(i, { url: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                )}
                {btn.type === "PHONE_NUMBER" && (
                  <div className="flex items-center gap-1.5">
                    <input
                      placeholder="+573001234567"
                      value={btn.phone_number || ""}
                      onChange={(e) => onUpdate(i, { phone_number: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all shrink-0"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step: Preview ────────────────────────────────────────────────────────

export function PreviewStep({
  form,
  validation,
  ValidationIcon,
}: {
  form: any;
  validation: { messages: ValidationMessage[]; score: number };
  ValidationIcon: any;
}) {
  const hasHeader = form.headerFormat !== "NONE";
  const hasButtons = form.buttons.filter((b: any) => b.text.trim()).length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">Revision Final</h3>
        <p className="text-sm text-slate-400 mt-1">Revisa todos los detalles antes de crear la plantilla.</p>
      </div>

      {/* Validation Messages */}
      {validation.messages.length > 0 && (
        <div className="space-y-1.5">
          {validation.messages.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <ValidationIcon level={msg.level} />
              <span className={
                msg.level === "error" ? "text-red-600" :
                msg.level === "warning" ? "text-amber-600" :
                msg.level === "info" ? "text-blue-600" : "text-emerald-600"
              }>{msg.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Preview */}
      <div className="rounded-2xl border border-slate-200 bg-[#e5ddd5] p-4">
        <div className="max-w-[320px] mx-auto rounded-lg bg-white overflow-hidden shadow-sm">
          {/* Header Media */}
          {form.headerFormat === "IMAGE" && form.headerMediaUrl && (
            <div className="bg-slate-100 h-40 flex items-center justify-center">
              <img src={form.headerMediaUrl} alt="Header" className="w-full h-full object-cover" />
            </div>
          )}
          {form.headerFormat === "VIDEO" && (
            <div className="bg-slate-100 h-40 flex items-center justify-center">
              <span className="text-xs text-slate-400">Video</span>
            </div>
          )}
          {form.headerFormat === "DOCUMENT" && (
            <div className="bg-slate-100 h-16 flex items-center justify-center">
              <span className="text-xs text-slate-400">documento.pdf</span>
            </div>
          )}

          <div className="p-3 space-y-1.5">
            {/* Header Text */}
            {form.headerFormat === "TEXT" && form.headerText && (
              <p className="text-sm font-semibold text-slate-800">{form.headerText}</p>
            )}
            {/* Body */}
            {form.bodyText && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{form.bodyText}</p>
            )}
            {/* Footer */}
            {form.footerText && (
              <p className="text-[11px] text-slate-400">{form.footerText}</p>
            )}
          </div>

          {/* Buttons */}
          {hasButtons && (
            <div className="border-t border-slate-100 px-3 pb-2 pt-1.5 space-y-1">
              {form.buttons.filter((b: any) => b.text.trim()).map((btn: any, i: number) => (
                <div key={i} className="flex items-center justify-center gap-1.5 py-1 text-xs text-blue-500 font-medium">
                  {btn.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-slate-400">Nombre:</span> <span className="font-medium text-slate-700">{form.name}</span></div>
          <div><span className="text-slate-400">Categoria:</span> <span className="font-medium text-slate-700">{form.category}</span></div>
          <div><span className="text-slate-400">Idioma:</span> <span className="font-medium text-slate-700">{form.language}</span></div>
          <div><span className="text-slate-400">Parametros:</span> <span className="font-medium text-slate-700">{form.parameterFormat}</span></div>
          <div><span className="text-slate-400">Header:</span> <span className="font-medium text-slate-700">{form.headerFormat}</span></div>
          <div><span className="text-slate-400">Botones:</span> <span className="font-medium text-slate-700">{form.buttons.filter((b: any) => b.text.trim()).length}</span></div>
        </div>
      </div>
    </div>
  );
}
