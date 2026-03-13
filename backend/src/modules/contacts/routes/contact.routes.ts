import { FastifyInstance } from "fastify";
import { authGuard } from "../../../shared/middleware/auth.middleware.js";
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  importExcel,
  getTags,
  upsertBulkWithTag,
} from "../controllers/contact.controller.js";
export async function contactRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", listContacts);
  app.get("/tags", getTags);
  app.get("/:id", getContact);
  app.post("/", createContact);
  app.put("/:id", updateContact);
  app.delete("/:id", deleteContact);
  app.post("/import", importContacts);
  app.post("/import-excel", importExcel);
  app.post("/upsert-bulk", upsertBulkWithTag);
}
