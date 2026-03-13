import { z } from "zod";

export const createContactSchema = z.object({
  phone: z.string().min(8, "Phone number is required"),
  name: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string()).optional().default({}),
  notes: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const importContactsSchema = z.object({
  contacts: z.array(
    z.object({
      phone: z.string().min(8),
      name: z.string().optional(),
      email: z.string().email().optional(),
      tags: z.array(z.string()).optional().default([]),
    })
  ),
});

export const queryContactsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
  search: z.string().optional(),
  tag: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ImportContactsInput = z.infer<typeof importContactsSchema>;
