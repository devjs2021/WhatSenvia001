"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Clock,
  TrendingUp,
  Shuffle,
  Timer,
} from "lucide-react";

interface ScheduleItem {
  day: number;
  percentage: number;
}

interface CampaignConfig {
  dailyLimit: { enabled: boolean; maxMessages: number; resetTime: string };
  warmup: { enabled: boolean; schedule: ScheduleItem[]; campaignStartDate: string | null };
  spintax: {
    enabled: boolean;
    variations1: string[];
    variations2: string[];
    rotationMode: "random" | "sequential";
  };
  cooldown: { enabled: boolean; hoursAfterCampaign: number; lastCampaignEndTime?: string };
}

interface TodayMetrics {
  date: string;
  sentToday: number;
  failedToday: number;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  enabled,
  open,
  onToggle,
}: {
  title: string;
  icon: any;
  enabled: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 rounded-t-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-semibold text-base">{title}</span>
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "Activo" : "Inactivo"}
        </Badge>
      </div>
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

export default function CampaignControlPage() {
  const [config, setConfig] = useState<CampaignConfig>({
    dailyLimit: { enabled: false, maxMessages: 100, resetTime: "00:00" },
    warmup: {
      enabled: false,
      schedule: [
        { day: 1, percentage: 20 },
        { day: 2, percentage: 40 },
        { day: 3, percentage: 100 },
      ],
      campaignStartDate: null,
    },
    spintax: { enabled: false, variations1: [], variations2: [], rotationMode: "random" },
    cooldown: { enabled: false, hoursAfterCampaign: 4 },
  });

  const [metrics, setMetrics] = useState<TodayMetrics>({ date: "", sentToday: 0, failedToday: 0 });
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dailyLimit: true,
    warmup: false,
    spintax: false,
    cooldown: false,
  });

  useEffect(() => {
    api
      .get<CampaignConfig>("/campaign-control/config")
      .then((data) => setConfig(data))
      .catch(() => {});
    api
      .get<TodayMetrics>("/campaign-control/metrics/today")
      .then((data) => setMetrics(data))
      .catch(() => {});
  }, []);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/campaign-control/config", config);
      toast.success("Configuracion guardada correctamente");
    } catch {
      toast.error("Error al guardar la configuracion");
    } finally {
      setSaving(false);
    }
  };

  // Warmup schedule helpers
  const addScheduleRow = () => {
    const nextDay = config.warmup.schedule.length > 0
      ? Math.max(...config.warmup.schedule.map((s) => s.day)) + 1
      : 1;
    setConfig({
      ...config,
      warmup: {
        ...config.warmup,
        schedule: [...config.warmup.schedule, { day: nextDay, percentage: 100 }],
      },
    });
  };

  const removeScheduleRow = (index: number) => {
    setConfig({
      ...config,
      warmup: {
        ...config.warmup,
        schedule: config.warmup.schedule.filter((_, i) => i !== index),
      },
    });
  };

  const updateScheduleRow = (index: number, field: "day" | "percentage", value: number) => {
    const updated = [...config.warmup.schedule];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, warmup: { ...config.warmup, schedule: updated } });
  };

  // Spintax variation helpers
  const addVariation = (group: "variations1" | "variations2") => {
    setConfig({
      ...config,
      spintax: {
        ...config.spintax,
        [group]: [...config.spintax[group], ""],
      },
    });
  };

  const removeVariation = (group: "variations1" | "variations2", index: number) => {
    setConfig({
      ...config,
      spintax: {
        ...config.spintax,
        [group]: config.spintax[group].filter((_, i) => i !== index),
      },
    });
  };

  const updateVariation = (group: "variations1" | "variations2", index: number, value: string) => {
    const updated = [...config.spintax[group]];
    updated[index] = value;
    setConfig({ ...config, spintax: { ...config.spintax, [group]: updated } });
  };

  // Cooldown countdown
  const getCooldownStatus = () => {
    if (!config.cooldown.enabled || !config.cooldown.lastCampaignEndTime) return null;
    const lastTime = new Date(config.cooldown.lastCampaignEndTime);
    const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
    const hoursNeeded = config.cooldown.hoursAfterCampaign;
    if (hoursSince < hoursNeeded) {
      return Math.ceil(hoursNeeded - hoursSince);
    }
    return 0;
  };

  const dailyProgress =
    config.dailyLimit.enabled && config.dailyLimit.maxMessages > 0
      ? Math.min((metrics.sentToday / config.dailyLimit.maxMessages) * 100, 100)
      : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 md:h-7 md:w-7 text-primary" />
        <div>
          <h1 className="text-lg md:text-xl font-bold">Control de Campanas</h1>
          <p className="text-sm text-muted-foreground">
            Configura limites, calentamiento, variaciones y tiempos de espera
          </p>
        </div>
      </div>

      {/* Section 1: Daily Limit */}
      <Card>
        <SectionHeader
          title="Limite Diario"
          icon={Clock}
          enabled={config.dailyLimit.enabled}
          open={openSections.dailyLimit}
          onToggle={() => toggleSection("dailyLimit")}
        />
        {openSections.dailyLimit && (
          <CardContent className="space-y-4 pt-0">
            <ToggleSwitch
              checked={config.dailyLimit.enabled}
              onChange={(v) =>
                setConfig({ ...config, dailyLimit: { ...config.dailyLimit, enabled: v } })
              }
              label="Activar limite diario"
            />

            {config.dailyLimit.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Maximo de mensajes por dia</label>
                    <Input
                      type="number"
                      min={1}
                      value={config.dailyLimit.maxMessages}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dailyLimit: {
                            ...config.dailyLimit,
                            maxMessages: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Hora de reinicio</label>
                    <Input
                      type="time"
                      value={config.dailyLimit.resetTime}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dailyLimit: { ...config.dailyLimit, resetTime: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso de hoy</span>
                    <span>
                      {metrics.sentToday} / {config.dailyLimit.maxMessages}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dailyProgress >= 90 ? "bg-destructive" : dailyProgress >= 70 ? "bg-yellow-500" : "bg-primary"
                      }`}
                      style={{ width: `${dailyProgress}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Section 2: Warm-up */}
      <Card>
        <SectionHeader
          title="Calentamiento (Warm-up)"
          icon={TrendingUp}
          enabled={config.warmup.enabled}
          open={openSections.warmup}
          onToggle={() => toggleSection("warmup")}
        />
        {openSections.warmup && (
          <CardContent className="space-y-4 pt-0">
            <ToggleSwitch
              checked={config.warmup.enabled}
              onChange={(v) =>
                setConfig({ ...config, warmup: { ...config.warmup, enabled: v } })
              }
              label="Activar calentamiento"
            />

            {config.warmup.enabled && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha de inicio de campana</label>
                  <Input
                    type="date"
                    value={config.warmup.campaignStartDate || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        warmup: {
                          ...config.warmup,
                          campaignStartDate: e.target.value || null,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Calendario de calentamiento</label>
                  <div className="space-y-2">
                    {config.warmup.schedule.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-12">Dia</span>
                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={item.day}
                          onChange={(e) =>
                            updateScheduleRow(index, "day", parseInt(e.target.value) || 1)
                          }
                        />
                        <span className="text-sm text-muted-foreground">Porcentaje</span>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          className="w-20"
                          value={item.percentage}
                          onChange={(e) =>
                            updateScheduleRow(index, "percentage", parseInt(e.target.value) || 1)
                          }
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeScheduleRow(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={addScheduleRow}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar dia
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Section 3: Spintax */}
      <Card>
        <SectionHeader
          title="Spintax (Variaciones de Mensaje)"
          icon={Shuffle}
          enabled={config.spintax.enabled}
          open={openSections.spintax}
          onToggle={() => toggleSection("spintax")}
        />
        {openSections.spintax && (
          <CardContent className="space-y-4 pt-0">
            <ToggleSwitch
              checked={config.spintax.enabled}
              onChange={(v) =>
                setConfig({ ...config, spintax: { ...config.spintax, enabled: v } })
              }
              label="Activar variaciones"
            />

            {config.spintax.enabled && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modo de rotacion</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rotationMode"
                        checked={config.spintax.rotationMode === "random"}
                        onChange={() =>
                          setConfig({
                            ...config,
                            spintax: { ...config.spintax, rotationMode: "random" },
                          })
                        }
                        className="accent-primary"
                      />
                      <span className="text-sm">Aleatorio</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rotationMode"
                        checked={config.spintax.rotationMode === "sequential"}
                        onChange={() =>
                          setConfig({
                            ...config,
                            spintax: { ...config.spintax, rotationMode: "sequential" },
                          })
                        }
                        className="accent-primary"
                      />
                      <span className="text-sm">Secuencial</span>
                    </label>
                  </div>
                </div>

                {/* Group 1 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Grupo 1 - Usa <code className="bg-muted px-1 rounded text-xs">{"{VariosM1}"}</code> en tu mensaje
                  </label>
                  {config.spintax.variations1.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={v}
                        onChange={(e) => updateVariation("variations1", i, e.target.value)}
                        placeholder={`Variacion ${i + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariation("variations1", i)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addVariation("variations1")}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar variacion
                  </Button>
                </div>

                {/* Group 2 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Grupo 2 - Usa <code className="bg-muted px-1 rounded text-xs">{"{VariosM2}"}</code> en tu mensaje
                  </label>
                  {config.spintax.variations2.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={v}
                        onChange={(e) => updateVariation("variations2", i, e.target.value)}
                        placeholder={`Variacion ${i + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariation("variations2", i)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addVariation("variations2")}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar variacion
                  </Button>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Como usar las variaciones:</p>
                  <p>
                    Escribe <code className="bg-muted px-1 rounded">{"{VariosM1}"}</code> o{" "}
                    <code className="bg-muted px-1 rounded">{"{VariosM2}"}</code> en el texto de tu
                    mensaje para que se reemplace automaticamente con una de las variaciones
                    configuradas. Esto ayuda a evitar deteccion de spam.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Section 4: Cooldown */}
      <Card>
        <SectionHeader
          title="Cooldown (Tiempo de Espera)"
          icon={Timer}
          enabled={config.cooldown.enabled}
          open={openSections.cooldown}
          onToggle={() => toggleSection("cooldown")}
        />
        {openSections.cooldown && (
          <CardContent className="space-y-4 pt-0">
            <ToggleSwitch
              checked={config.cooldown.enabled}
              onChange={(v) =>
                setConfig({ ...config, cooldown: { ...config.cooldown, enabled: v } })
              }
              label="Activar cooldown"
            />

            {config.cooldown.enabled && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Horas entre campanas</label>
                  <Input
                    type="number"
                    min={1}
                    max={72}
                    value={config.cooldown.hoursAfterCampaign}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        cooldown: {
                          ...config.cooldown,
                          hoursAfterCampaign: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-32"
                  />
                </div>

                {(() => {
                  const remaining = getCooldownStatus();
                  if (remaining === null) return null;
                  if (remaining > 0) {
                    return (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-sm font-medium text-destructive">
                          Cooldown activo: {remaining} hora{remaining !== 1 ? "s" : ""} restante
                          {remaining !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                      <p className="text-sm font-medium text-green-600">
                        Cooldown completado. Puedes enviar una nueva campana.
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Configuracion"}
        </Button>
      </div>
    </div>
  );
}
