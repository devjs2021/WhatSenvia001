import { FastifyInstance } from "fastify";
import { registerController, loginController, profileController } from "../controllers/auth.controller.js";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", registerController);
  app.post("/login", loginController);
  app.get("/profile", { preHandler: [authGuard] }, profileController);
}
