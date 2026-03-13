import { db } from "../../../config/database.js";
import { contacts } from "../../../infrastructure/database/schema/contacts.js";
import { eq, and, ilike, or, sql, count } from "drizzle-orm";
import type { CreateContactInput, UpdateContactInput, ImportContactsInput } from "../schemas/contact.schema.js";

export class ContactService {
  async list(userId: string, page: number, limit: number, search?: string, tag?: string) {
    const offset = (page - 1) * limit;
    const conditions = [eq(contacts.userId, userId)];

    if (search) {
      conditions.push(
        or(
          ilike(contacts.name, `%${search}%`),
          ilike(contacts.phone, `%${search}%`),
          ilike(contacts.email, `%${search}%`)
        )!
      );
    }

    const where = and(...conditions);

    const [data, [{ total }]] = await Promise.all([
      db.select().from(contacts).where(where).orderBy(contacts.createdAt).limit(limit).offset(offset),
      db.select({ total: count() }).from(contacts).where(where),
    ]);

    // Filter by tag in application layer (jsonb)
    const filtered = tag ? data.filter((c) => (c.tags as string[])?.includes(tag)) : data;

    return { data: filtered, total };
  }

  async getById(userId: string, contactId: string) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .limit(1);

    return contact || null;
  }

  async create(userId: string, input: CreateContactInput) {
    const [contact] = await db
      .insert(contacts)
      .values({ userId, ...input })
      .returning();

    return contact;
  }

  async update(userId: string, contactId: string, input: UpdateContactInput) {
    const [contact] = await db
      .update(contacts)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .returning();

    return contact || null;
  }

  async delete(userId: string, contactId: string) {
    const [deleted] = await db
      .delete(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .returning({ id: contacts.id });

    return !!deleted;
  }

  async importBulk(userId: string, input: ImportContactsInput) {
    const values = input.contacts.map((c) => ({
      userId,
      phone: c.phone,
      name: c.name,
      email: c.email,
      tags: c.tags || [],
    }));

    const result = await db.insert(contacts).values(values).returning({ id: contacts.id });
    return { imported: result.length };
  }

  async upsertBulkWithTag(userId: string, phones: string[], tag: string) {
    let created = 0;
    let updated = 0;

    for (const rawPhone of phones) {
      const phone = rawPhone.replace(/[^0-9]/g, "");
      if (phone.length < 10) continue;

      const [existing] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.phone, phone)))
        .limit(1);

      if (existing) {
        const currentTags = (existing.tags as string[]) || [];
        if (!currentTags.includes(tag)) {
          await db
            .update(contacts)
            .set({ tags: [...currentTags, tag], updatedAt: new Date() })
            .where(eq(contacts.id, existing.id));
        }
        updated++;
      } else {
        await db.insert(contacts).values({
          userId,
          phone,
          name: "",
          tags: [tag],
        });
        created++;
      }
    }

    return { created, updated, total: created + updated };
  }

  async getAllTags(userId: string): Promise<string[]> {
    const result = await db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    const tagSet = new Set<string>();
    for (const row of result) {
      for (const tag of (row.tags as string[]) || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }
}
