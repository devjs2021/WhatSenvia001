import { db } from "../../../config/database.js";
import { campaignControlConfig, campaignMetrics } from "../../../infrastructure/database/schema/campaign-control.js";
import { eq, sql } from "drizzle-orm";

interface CampaignConfig {
  dailyLimit: { enabled: boolean; maxMessages: number; resetTime: string };
  warmup: { enabled: boolean; schedule: { day: number; percentage: number }[]; campaignStartDate: string | null };
  spintax: { enabled: boolean; variations1: string[]; variations2: string[]; rotationMode: "random" | "sequential" };
  cooldown: { enabled: boolean; hoursAfterCampaign: number; lastCampaignEndTime?: string };
}

export class CampaignControlService {
  private defaultConfig: CampaignConfig = {
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
  };

  async loadConfig(): Promise<CampaignConfig> {
    const rows = await db.select().from(campaignControlConfig);
    const config = { ...this.defaultConfig };
    for (const row of rows) {
      try {
        (config as any)[row.configKey] = JSON.parse(row.configValue);
      } catch {
        // ignore parse errors
      }
    }
    return config;
  }

  async saveConfig(config: CampaignConfig) {
    for (const [key, value] of Object.entries(config)) {
      await db
        .insert(campaignControlConfig)
        .values({ configKey: key, configValue: JSON.stringify(value) })
        .onConflictDoUpdate({
          target: campaignControlConfig.configKey,
          set: { configValue: JSON.stringify(value), updatedAt: new Date() },
        });
    }
    return true;
  }

  async canSendByDailyLimit(config: CampaignConfig, quantity = 1) {
    if (!config.dailyLimit.enabled) return { allowed: true, sentToday: 0, remaining: Infinity };
    const today = new Date().toISOString().split("T")[0];
    const [result] = await db
      .select()
      .from(campaignMetrics)
      .where(eq(campaignMetrics.date, today))
      .limit(1);
    const sentToday = result?.sentCount || 0;
    const remaining = config.dailyLimit.maxMessages - sentToday;
    return { allowed: remaining >= quantity, sentToday, remaining: Math.max(0, remaining) };
  }

  canSendByCooldown(config: CampaignConfig) {
    if (!config.cooldown.enabled || !config.cooldown.lastCampaignEndTime)
      return { allowed: true, hoursRemaining: 0 };
    const lastTime = new Date(config.cooldown.lastCampaignEndTime);
    const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
    const hoursNeeded = config.cooldown.hoursAfterCampaign;
    if (hoursSince < hoursNeeded) {
      return { allowed: false, hoursRemaining: Math.ceil(hoursNeeded - hoursSince) };
    }
    return { allowed: true, hoursRemaining: 0 };
  }

  getWarmupQuantity(config: CampaignConfig, totalContacts: number, currentDay: number) {
    if (!config.warmup.enabled) return totalContacts;
    const daySchedule = config.warmup.schedule.find((s) => s.day === currentDay);
    if (!daySchedule) return totalContacts;
    return Math.ceil((totalContacts * daySchedule.percentage) / 100);
  }

  applySpintax(message: string, config: CampaignConfig, messageIndex = 0): string {
    let result = message;
    const { variations1, variations2, rotationMode } = config.spintax;
    if (variations1.length > 0 && result.includes("{VariosM1}")) {
      const selected =
        rotationMode === "random"
          ? variations1[Math.floor(Math.random() * variations1.length)]
          : variations1[messageIndex % variations1.length];
      result = result.replace(/\{VariosM1\}/g, selected);
    }
    if (variations2.length > 0 && result.includes("{VariosM2}")) {
      const selected =
        rotationMode === "random"
          ? variations2[Math.floor(Math.random() * variations2.length)]
          : variations2[messageIndex % variations2.length];
      result = result.replace(/\{VariosM2\}/g, selected);
    }
    return result;
  }

  async recordMessageSent(quantity = 1) {
    const today = new Date().toISOString().split("T")[0];
    await db
      .insert(campaignMetrics)
      .values({ date: today, sentCount: quantity })
      .onConflictDoUpdate({
        target: campaignMetrics.date,
        set: { sentCount: sql`${campaignMetrics.sentCount} + ${quantity}` },
      });
  }

  async getTodayMetrics() {
    const today = new Date().toISOString().split("T")[0];
    const [result] = await db
      .select()
      .from(campaignMetrics)
      .where(eq(campaignMetrics.date, today))
      .limit(1);
    return { date: today, sentToday: result?.sentCount || 0, failedToday: result?.failedCount || 0 };
  }

  async validateBeforeSending(totalContacts: number) {
    const config = await this.loadConfig();
    const dailyLimit = await this.canSendByDailyLimit(config, totalContacts);
    const cooldown = this.canSendByCooldown(config);
    return { allowed: dailyLimit.allowed && cooldown.allowed, dailyLimit, cooldown, config };
  }
}

export const campaignControlService = new CampaignControlService();
