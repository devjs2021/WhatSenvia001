import { FastifyInstance } from "fastify";
import { authGuard } from "../../shared/middleware/auth.middleware.js";
import { pushService } from "./push.service.js";

export async function pushRoutes(app: FastifyInstance) {
  app.post("/subscribe", { preHandler: [authGuard] }, async (req) => {
    const userId = (req as any).user.id;
    const { subscription } = req.body as { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return { success: false, error: "Invalid subscription" };
    }

    await pushService.subscribe(userId, subscription);
    return { success: true };
  });
}
