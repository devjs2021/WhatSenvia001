/**
 * Template Validator - Valida plantillas WhatsApp en tiempo real
 * Basado en la documentación oficial de Meta
 */

export type ValidationLevel = "error" | "warning" | "info" | "success";

export interface ValidationMessage {
  field: string;
  level: ValidationLevel;
  message: string;
}

export interface TemplateValidation {
  valid: boolean;
  messages: ValidationMessage[];
  score: number; // 0-100
}

export interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  parameterFormat: "named" | "positional";
  headerFormat: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  headerText: string;
  headerMediaUrl: string;
  bodyText: string;
  footerText: string;
  buttons: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  namedParams: Array<{ param_name: string; example: string }>;
  positionalExamples: string[];
}

const CATEGORY_DESCRIPTIONS: Record<string, { description: string; pricing: string; examples: string[] }> = {
  MARKETING: {
    description: "Promociones, ofertas, bienvenida, newsletters y contenido publicitario",
    pricing: "Mayor costo por mensaje",
    examples: ["Oferta especial para ti", "Nuevos productos disponibles", "Recordatorio de carrito abandonado"],
  },
  UTILITY: {
    description: "Notificaciones transaccionales, actualizaciones de cuenta, alertas",
    pricing: "Costo medio por mensaje",
    examples: ["Confirmación de pedido", "Código de verificación", "Recordatorio de cita"],
  },
  AUTHENTICATION: {
    description: "Códigos de verificación y autenticación de dos factores",
    pricing: "Costo más bajo por mensaje",
    examples: ["Tu código de verificación es:", "Código de inicio de sesión:"],
  },
};

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Español",
  en_US: "English (US)",
  pt_BR: "Português (Brasil)",
};

export function getCategoryInfo(category: string) {
  return CATEGORY_DESCRIPTIONS[category] || null;
}

export function getLanguageName(code: string) {
  return LANGUAGE_NAMES[code] || code;
}

export function validateTemplate(form: TemplateFormData): TemplateValidation {
  const messages: ValidationMessage[] = [];
  let score = 100;

  // ── Name validation ──
  if (!form.name.trim()) {
    messages.push({ field: "name", level: "error", message: "El nombre es obligatorio" });
    score -= 15;
  } else if (form.name.length > 512) {
    messages.push({ field: "name", level: "error", message: "El nombre no puede exceder 512 caracteres" });
    score -= 10;
  } else if (!/^[a-z0-9_]+$/.test(form.name)) {
    messages.push({ field: "name", level: "error", message: "Solo minúsculas, números y guiones bajos (_)" });
    score -= 10;
  } else if (form.name.length < 3) {
    messages.push({ field: "name", level: "warning", message: "El nombre es muy corto, usa al menos 3 caracteres" });
    score -= 3;
  } else {
    messages.push({ field: "name", level: "success", message: "Nombre válido" });
  }

  // ── Category validation ──
  if (!form.category) {
    messages.push({ field: "category", level: "error", message: "Debes seleccionar una categoría" });
    score -= 10;
  } else {
    messages.push({ field: "category", level: "success", message: `Categoría: ${form.category}` });
  }

  // ── Language validation ──
  if (!form.language) {
    messages.push({ field: "language", level: "error", message: "Debes seleccionar un idioma" });
    score -= 5;
  } else {
    messages.push({ field: "language", level: "success", message: `Idioma: ${getLanguageName(form.language)}` });
  }

  // ── Header validation ──
  if (form.headerFormat === "TEXT") {
    if (!form.headerText.trim()) {
      messages.push({ field: "headerText", level: "warning", message: "Header TEXT sin contenido" });
      score -= 2;
    } else if (form.headerText.length > 60) {
      messages.push({ field: "headerText", level: "error", message: "Header TEXT máximo 60 caracteres" });
      score -= 5;
    } else {
      messages.push({ field: "headerText", level: "success", message: `Header TEXT (${form.headerText.length}/60)` });
    }
  } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(form.headerFormat)) {
    if (!form.headerMediaUrl.trim()) {
      messages.push({ field: "headerMediaUrl", level: "warning", message: `Header ${form.headerFormat} sin URL de medio` });
      score -= 2;
    } else {
      messages.push({ field: "headerMediaUrl", level: "success", message: `Header ${form.headerFormat} configurado` });
    }
  }

  // ── Body validation ──
  if (!form.bodyText.trim()) {
    messages.push({ field: "bodyText", level: "error", message: "El Body es obligatorio" });
    score -= 20;
  } else if (form.bodyText.length > 1024) {
    messages.push({ field: "bodyText", level: "error", message: "Body máximo 1024 caracteres" });
    score -= 10;
  } else {
    messages.push({ field: "bodyText", level: "success", message: `Body (${form.bodyText.length}/1024)` });
  }

  // ── Parameter validation ──
  const positionalParams = form.bodyText.match(/\{\{\d+\}\}/g) || [];
  const namedParams = form.bodyText.match(/\{\{([a-z_]+)\}\}/g) || [];

  if (form.parameterFormat === "positional" && positionalParams.length > 0) {
    const expectedCount = positionalParams.length;
    const providedCount = form.positionalExamples.filter((e) => e.trim()).length;
    if (providedCount < expectedCount) {
      messages.push({
        field: "positionalExamples",
        level: "warning",
        message: `Faltan ${expectedCount - providedCount} ejemplo(s) de parámetro(s) posicional(es)`,
      });
      score -= 5;
    } else {
      messages.push({ field: "positionalExamples", level: "success", message: `${expectedCount} ejemplo(s) de parámetro(s) listo(s)` });
    }
  }

  if (form.parameterFormat === "named" && namedParams.length > 0) {
    const definedNames = form.namedParams.map((p) => p.param_name);
    const usedNames = namedParams.map((p) => p.replace(/\{\{|\}\}/g, ""));
    const missing = usedNames.filter((n) => !definedNames.includes(n));
    if (missing.length > 0) {
      messages.push({
        field: "namedParams",
        level: "warning",
        message: `Parámetros sin definir: ${missing.join(", ")}`,
      });
      score -= 5;
    } else {
      messages.push({ field: "namedParams", level: "success", message: `${definedNames.length} parámetro(s) con nombre definido(s)` });
    }
  }

  // ── Footer validation ──
  if (form.footerText.trim() && form.footerText.length > 60) {
    messages.push({ field: "footerText", level: "error", message: "Footer máximo 60 caracteres" });
    score -= 5;
  } else if (form.footerText.trim()) {
    messages.push({ field: "footerText", level: "success", message: `Footer (${form.footerText.length}/60)` });
  }

  // ── Buttons validation ──
  const validButtons = form.buttons.filter((b) => b.text.trim());
  if (validButtons.length > 3) {
    messages.push({ field: "buttons", level: "error", message: "Máximo 3 botones permitidos" });
    score -= 10;
  } else if (validButtons.length > 0) {
    const hasIssues = validButtons.some((b) => {
      if (b.text.length > 25) return true;
      if (b.type === "URL" && !b.url?.trim()) return true;
      if (b.type === "PHONE_NUMBER" && !b.phone_number?.trim()) return true;
      return false;
    });
    if (hasIssues) {
      messages.push({ field: "buttons", level: "warning", message: "Revisa los botones: texto máx 25 caracteres, URL/Phone requeridos" });
      score -= 3;
    } else {
      messages.push({ field: "buttons", level: "success", message: `${validButtons.length} botón(es) configurado(s)` });
    }
  }

  // ── General warnings ──
  if (form.category === "MARKETING" && form.bodyText.trim()) {
    messages.push({
      field: "category",
      level: "info",
      message: "Las plantillas MARKETING tienen un costo mayor por mensaje. Considera usar UTILITY si es transaccional.",
    });
  }

  if (form.bodyText.includes("{{") && form.parameterFormat === "positional" && positionalParams.length === 0) {
    messages.push({
      field: "bodyText",
      level: "warning",
      message: "Parece que usas sintaxis de parámetros con nombre. Cambia el formato a 'named' si usas {{nombre}}",
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    valid: score >= 60,
    messages,
    score,
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}
