import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { db } from "../../config/database.js";
import { verificationJobs } from "../database/schema/verification-jobs.js";
import { eq, sql } from "drizzle-orm";
import { getWhatsAppProvider } from "../whatsapp/whatsapp.factory.js";

export interface VerificationJobData {
  jobId: string;
  sessionId: string;
}

export const verificationQueue = new Queue<VerificationJobData>("verification", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 50 },
  },
});

export function startVerificationWorker() {
  const worker = new Worker<VerificationJobData>(
    "verification",
    async (job: Job<VerificationJobData>) => {
      const { jobId, sessionId } = job.data;

      const [vJob] = await db
        .select()
        .from(verificationJobs)
        .where(eq(verificationJobs.id, jobId))
        .limit(1);

      if (!vJob) throw new Error(`Verification job ${jobId} not found`);

      await db
        .update(verificationJobs)
        .set({ status: "running" })
        .where(eq(verificationJobs.id, jobId));

      const phones = vJob.phones as string[];
      const valid: string[] = [];
      const invalid: string[] = [];
      const provider = await getWhatsAppProvider(sessionId);

      for (let i = 0; i < phones.length; i++) {
        try {
          const result = await provider.checkNumberExists(sessionId, phones[i]);
          if (result.exists) {
            valid.push(phones[i]);
          } else {
            invalid.push(phones[i]);
          }
        } catch {
          invalid.push(phones[i]);
        }

        if ((i + 1) % 10 === 0 || i === phones.length - 1) {
          await db
            .update(verificationJobs)
            .set({
              checkedCount: i + 1,
              validPhones: valid,
              invalidPhones: invalid,
            })
            .where(eq(verificationJobs.id, jobId));
        }

        await new Promise((r) => setTimeout(r, 200));
      }

      await db
        .update(verificationJobs)
        .set({
          status: "completed",
          checkedCount: phones.length,
          validPhones: valid,
          invalidPhones: invalid,
          completedAt: new Date(),
        })
        .where(eq(verificationJobs.id, jobId));

      logger.info({ jobId, total: phones.length, valid: valid.length, invalid: invalid.length }, "Verification job completed");
    },
    { connection: redis as any, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Verification job failed");
    if (job) {
      db.update(verificationJobs)
        .set({ status: "failed", error: err.message })
        .where(eq(verificationJobs.id, job.data.jobId))
        .catch(() => {});
    }
  });

  return worker;
}
