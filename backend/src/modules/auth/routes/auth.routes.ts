import { FastifyInstance } from "fastify";
import { registerController, loginController, profileController, dataDeletionController } from "../controllers/auth.controller.js";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", registerController);
  app.post("/login", loginController);
  app.get("/profile", { preHandler: [authGuard] }, profileController);
  app.post("/data-deletion", dataDeletionController);
  app.get("/data-deletion", async (_request, reply) => {
    return reply.send({ status: "ok", message: "Data deletion endpoint active" });
  });
}
