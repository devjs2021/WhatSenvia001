import { FastifyInstance } from "fastify";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  profileController,
  dataDeletionController,
  googleAuthController,
  forgotPasswordController,
  resetPasswordController,
} from "../controllers/auth.controller.js";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: "15 minutes",
      },
    },
  }, registerController);

  app.post("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
  }, loginController);

  app.post("/google", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
  }, googleAuthController);

  app.post("/refresh", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
  }, refreshController);

  app.post("/logout", logoutController);

  app.get("/profile", { preHandler: [authGuard] }, profileController);

  app.post("/forgot-password", {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: "15 minutes",
      },
    },
  }, forgotPasswordController);

  app.post("/reset-password", {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: "15 minutes",
      },
    },
  }, resetPasswordController);

  app.post("/data-deletion", dataDeletionController);
  app.get("/data-deletion", async (_request, reply) => {
    return reply.send({ status: "ok", message: "Data deletion endpoint active" });
  });
}
