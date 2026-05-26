"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, X, FileJson, DollarSign } from "lucide-react";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle } from "@/components/ui/dashboard-card";
import { validateTemplate, getScoreColor, getScoreBgColor } from "./template-validator";
import { PricingPanel } from "./pricing-panel";
import type { TemplateCategory } from "./pricing-calculator";
import {
  WizardProgress,
  CategoryStep,
  BasicsStep,
  HeaderStep,
  BodyStep,
  ParamsStep,
  FooterStep,
  ButtonsStep,
  PreviewStep,
  ValidationIcon,
  type WizardStep,
  type TemplateButton,
  type HeaderFormat,
} from "./wizard-steps";

// ─── Initial State ────────────────────────────────────────────────────────

const INITIAL_FORM = {
  name: "",
  category: "",
  language: "",
  parameterFormat: "named" as "named" | "positional",
  headerFormat: "NONE" as HeaderFormat,
  headerText: "",
  headerMediaUrl: "",
  bodyText: "",
  footerText: "",
  buttons: [] as TemplateButton[],
  namedParams: [] as Array<{ param_name: string; example: string }>,
  positionalExamples: [] as string[],
};

// ─── Main Component ───────────────────────────────────────────────────────

export function TemplateWizard() {
  const [step, setStep] = useState<WizardStep>("category");
  const [form, setForm] = useState({ ...INITIAL_FORM });

  // ── Validation ──
  const validation = useMemo(() => validateTemplate(form), [form]);

  // ── Form updaters ──
  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Navigation ──
  const stepIndex = STEPS_ORDER.indexOf(step);
  const canGoNext = step !== "preview" || validation.valid;

  const goNext = useCallback(() => {
    if (stepIndex < STEPS_ORDER.length - 1) {
      setStep(STEPS_ORDER[stepIndex + 1]);
    }
  }, [stepIndex]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setStep(STEPS_ORDER[stepIndex - 1]);
    }
  }, [stepIndex]);

  // ── Create template mutation ──
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildCreatePayload(form);
      return api.post("/meta-templates", payload);
    },
    onSuccess: () => {
      toast.success("Plantilla creada exitosamente");
      setForm({ ...INITIAL_FORM });
      setStep("category");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al crear la plantilla");
    },
  });

  // ── Render current step ──
  const renderStep = () => {
    switch (step) {
      case "category":
        return (
          <div className="space-y-6">
            <CategoryStep selected={form.category} onSelect={(v) => update("category", v)} />
            {form.category && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Estimación de costos
                  </span>
                </div>
                <PricingPanel
                  selectedCategory={form.category as TemplateCategory}
                  variant="inline"
                />
              </div>
            )}
          </div>
        );
      case "basics":
        return (
          <BasicsStep
            name={form.name}
            language={form.language}
            parameterFormat={form.parameterFormat}
            onNameChange={(v) => update("name", v)}
            onLanguageChange={(v) => update("language", v)}
            onParamFormatChange={(v) => update("parameterFormat", v)}
          />
        );
      case "header":
        return (
          <HeaderStep
            format={form.headerFormat}
            text={form.headerText}
            mediaUrl={form.headerMediaUrl}
            onFormatChange={(v) => update("headerFormat", v)}
            onTextChange={(v) => update("headerText", v)}
            onMediaUrlChange={(v) => update("headerMediaUrl", v)}
          />
        );
      case "body":
        return (
          <BodyStep
            text={form.bodyText}
            onChange={(v) => update("bodyText", v)}
            parameterFormat={form.parameterFormat}
          />
        );
      case "params":
        return (
          <ParamsStep
            bodyText={form.bodyText}
            parameterFormat={form.parameterFormat}
            namedParams={form.namedParams}
            positionalExamples={form.positionalExamples}
            onNamedParamsChange={(v) => update("namedParams", v)}
            onPositionalExamplesChange={(v) => update("positionalExamples", v)}
          />
        );
      case "footer":
        return <FooterStep text={form.footerText} onChange={(v) => update("footerText", v)} />;
      case "buttons":
        return (
          <ButtonsStep
            buttons={form.buttons}
            onAdd={() => update("buttons", [...form.buttons, { type: "QUICK_REPLY", text: "" }])}
            onUpdate={(i, updates) => {
              const updated = [...form.buttons];
              updated[i] = { ...updated[i], ...updates };
              update("buttons", updated);
            }}
            onRemove={(i) => update("buttons", form.buttons.filter((_, idx) => idx !== i))}
          />
        );
      case "preview":
        return (
          <div className="space-y-6">
            <PreviewStep form={form} validation={validation} ValidationIcon={ValidationIcon} />
            {form.category && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Costo estimado mensual
                  </span>
                </div>
                <PricingPanel
                  selectedCategory={form.category as TemplateCategory}
                  variant="inline"
                />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <div className="flex items-center justify-between">
          <DashboardCardTitle>Crear Plantilla WhatsApp</DashboardCardTitle>
          <button
            type="button"
            onClick={() => {
              setForm({ ...INITIAL_FORM });
              setStep("category");
            }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Reiniciar
          </button>
        </div>
      </DashboardCardHeader>

      <div className="p-6 space-y-6">
        {/* Progress */}
        <WizardProgress
          currentStep={step}
          score={validation.score}
          getScoreBgColor={getScoreBgColor}
          getScoreColor={getScoreColor}
        />

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {step === "preview" && (
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!validation.valid || createMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {createMutation.isPending ? (
                  "Creando..."
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Crear Plantilla
                  </>
                )}
              </button>
            )}

            {step !== "preview" && (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const STEPS_ORDER: WizardStep[] = [
  "category",
  "basics",
  "header",
  "body",
  "params",
  "footer",
  "buttons",
  "preview",
];

function buildCreatePayload(form: typeof INITIAL_FORM) {
  const components: any[] = [];

  // Header
  if (form.headerFormat === "TEXT" && form.headerText) {
    components.push({ type: "HEADER", format: "TEXT", text: form.headerText });
  } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(form.headerFormat) && form.headerMediaUrl) {
    components.push({ type: "HEADER", format: form.headerFormat, example: { header_handle: [form.headerMediaUrl] } });
  }

  // Body
  if (form.bodyText) {
    const bodyComponent: any = { type: "BODY", text: form.bodyText };
    if (form.parameterFormat === "positional" && form.positionalExamples.some((e) => e.trim())) {
      bodyComponent.example = { body_text: [form.positionalExamples.filter((e) => e.trim())] };
    } else if (form.parameterFormat === "named" && form.namedParams.some((p) => p.example)) {
      bodyComponent.example = {
        body_text_named_params: form.namedParams
          .filter((p) => p.example)
          .map((p) => ({ param_name: p.param_name, example: p.example })),
      };
    }
    components.push(bodyComponent);
  }

  // Footer
  if (form.footerText) {
    components.push({ type: "FOOTER", text: form.footerText });
  }

  // Buttons
  const validButtons = form.buttons.filter((b) => b.text.trim());
  if (validButtons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: validButtons.map((b) => {
        if (b.type === "URL") return { type: "URL", text: b.text, url: b.url || "" };
        if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number || "" };
        return { type: "QUICK_REPLY", text: b.text };
      }),
    });
  }

  return {
    name: form.name,
    category: form.category,
    language: form.language,
    parameter_format: form.parameterFormat,
    components,
  };
}
