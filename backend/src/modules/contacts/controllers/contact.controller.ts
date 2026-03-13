import { FastifyRequest, FastifyReply } from "fastify";
import { ContactService } from "../services/contact.service.js";
import {
  createContactSchema,
  updateContactSchema,
  importContactsSchema,
  queryContactsSchema,
} from "../schemas/contact.schema.js";
import { success, error, paginated } from "../../../shared/utils/api-response.js";

const contactService = new ContactService();

export async function listContacts(request: FastifyRequest, reply: FastifyReply) {
  const parsed = queryContactsSchema.safeParse(request.query);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const { page, limit, search, tag } = parsed.data;
  const { data, total } = await contactService.list(userId, page, limit, search, tag);
  return paginated(reply, data, total, page, limit);
}

export async function getContact(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const contact = await contactService.getById(userId, request.params.id);
  if (!contact) return error(reply, "Contact not found", 404);
  return success(reply, contact);
}

export async function createContact(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createContactSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const contact = await contactService.create(userId, parsed.data);
  return success(reply, contact, 201);
}

export async function updateContact(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const parsed = updateContactSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const contact = await contactService.update(userId, request.params.id, parsed.data);
  if (!contact) return error(reply, "Contact not found", 404);
  return success(reply, contact);
}

export async function deleteContact(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const deleted = await contactService.delete(userId, request.params.id);
  if (!deleted) return error(reply, "Contact not found", 404);
  return success(reply, { deleted: true });
}

export async function importContacts(request: FastifyRequest, reply: FastifyReply) {
  const parsed = importContactsSchema.safeParse(request.body);
  if (!parsed.success) return error(reply, parsed.error.errors[0].message, 422);

  const userId = (request as any).user.id;
  const result = await contactService.importBulk(userId, parsed.data);
  return success(reply, result, 201);
}

export async function getTags(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user.id;
  const tags = await contactService.getAllTags(userId);
  return success(reply, tags);
}

export async function upsertBulkWithTag(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { phones?: string[]; tag?: string };
  if (!body?.phones?.length || !body?.tag) {
    return error(reply, "phones (array) and tag (string) are required", 422);
  }
  const userId = (request as any).user.id;
  const result = await contactService.upsertBulkWithTag(userId, body.phones, body.tag);
  return success(reply, result);
}

export async function importExcel(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await request.file();
    if (!data) return error(reply, "No file uploaded", 400);

    const buffer = await data.toBuffer();
    const { importFromExcel } = await import("../services/excel-import.service.js");

    const fields = data.fields as Record<string, any>;
    const tagsField = fields?.tags;
    const tags = tagsField?.value ? String(tagsField.value).split(",").map((t: string) => t.trim()).filter(Boolean) : undefined;

    const userId = (request as any).user.id;
    const result = await importFromExcel(userId, buffer, tags);
    return success(reply, result, 201);
  } catch (err: any) {
    return error(reply, err.message);
  }
}
