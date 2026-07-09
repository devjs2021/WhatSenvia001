import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";

/**
 * Rate limiter para las llamadas salientes a la Meta WhatsApp Cloud API.
 *
 * CÓMO CAMBIAR LA VELOCIDAD (sin tocar código):
 *   Variable de entorno `META_RATE_LIMIT_MPS` (mensajes por segundo).
 *   Ejemplos: 1, 2, 5, 10. Default: 5. Editar `.env` y reiniciar el proceso.
 *
 * Comportamiento ante HTTP 429 (Too Many Requests) de Meta:
 *   Al recibir un 429 se reduce la velocidad automáticamente (backoff) y se
 *   recupera de forma gradual, en pasos, hasta volver a la velocidad
 *   configurada — sin intervención manual.
 *
 * Se aplica únicamente al envío de mensajes vía Meta Cloud API
 * (ver uso en meta-cloud.provider.ts). No afecta a Baileys/QR, a la
 * lógica de campañas, ni al pacing existente de la cola de mensajes
 * (messagesPerMinute) — son mecanismos independientes y se suman.
 */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const BACKOFF_MULTIPLIER = 3; // cuánto se multiplica el intervalo al recibir un 429
const MAX_INTERVAL_MS = 60_000; // nunca esperar más de 1 minuto entre mensajes
const RECOVERY_STEP_MS = 30_000; // cada cuánto se intenta acelerar de vuelta
const RECOVERY_FACTOR = 0.7; // qué tanto se acerca a la velocidad normal en cada paso

class MetaRateLimiter {
  private readonly baseIntervalMs: number;
  private currentIntervalMs: number;
  private lastSendAt = 0;
  private chain: Promise<void> = Promise.resolve();
  private recoveryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(messagesPerSecond: number) {
    const mps = messagesPerSecond > 0 ? messagesPerSecond : 5;
    this.baseIntervalMs = 1000 / mps;
    this.currentIntervalMs = this.baseIntervalMs;
  }

  /** Se resuelve cuando es seguro disparar el siguiente request a Meta. No bloquea el proceso. */
  async acquire(): Promise<void> {
    const turn = this.chain.then(() => this.waitForSlot());
    this.chain = turn.catch(() => {});
    return turn;
  }

  private async waitForSlot(): Promise<void> {
    const wait = Math.max(0, this.currentIntervalMs - (Date.now() - this.lastSendAt));
    if (wait > 0) await sleep(wait);
    this.lastSendAt = Date.now();
  }

  /** Llamar cuando Meta responde 429: frena el envío y arranca la recuperación gradual. */
  reportThrottled(): void {
    const next = Math.min(this.currentIntervalMs * BACKOFF_MULTIPLIER, MAX_INTERVAL_MS);
    if (next > this.currentIntervalMs) {
      logger.warn(
        { previousIntervalMs: Math.round(this.currentIntervalMs), newIntervalMs: Math.round(next) },
        "[MetaRateLimiter] 429 recibido de Meta, bajando la velocidad de envío"
      );
    }
    this.currentIntervalMs = next;
    this.scheduleRecovery();
  }

  private scheduleRecovery(): void {
    if (this.recoveryTimer) return;
    this.recoveryTimer = setInterval(() => {
      if (this.currentIntervalMs <= this.baseIntervalMs) {
        this.currentIntervalMs = this.baseIntervalMs;
        clearInterval(this.recoveryTimer!);
        this.recoveryTimer = null;
        logger.info("[MetaRateLimiter] Velocidad de envío recuperada al valor configurado");
        return;
      }
      this.currentIntervalMs = this.baseIntervalMs + (this.currentIntervalMs - this.baseIntervalMs) * RECOVERY_FACTOR;
    }, RECOVERY_STEP_MS);
  }
}

// Instancia única compartida por todas las sesiones Meta Cloud del proceso.
export const metaRateLimiter = new MetaRateLimiter(env.META_RATE_LIMIT_MPS);
