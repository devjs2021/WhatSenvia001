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
  getMetadataKeys,
  upsertBulkWithTag,
} from "../controllers/contact.controller.js";
export async function contactRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/", listContacts);
  app.get("/tags", getTags);
  app.get("/metadata-keys", getMetadataKeys);
  app.get("/:id", getContact);
  app.post("/", createContact);
  app.put("/:id", updateContact);
  app.delete("/:id", deleteContact);
  app.post("/import", importContacts);
  app.post("/import-excel", importExcel);
  app.post("/parse-excel", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) return reply.status(400).send({ success: false, error: "No file uploaded" });
      const buffer = await data.toBuffer();
      const { parseExcel } = await import("../services/excel-parse.service.js");
      const result = parseExcel(buffer);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });
  app.post("/upsert-bulk", upsertBulkWithTag);
}
