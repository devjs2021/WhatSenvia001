import * as XLSX from "xlsx";
import { eq, and } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { contacts } from "../../../infrastructure/database/schema/contacts.js";

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  phones: string[];
}

export async function importFromExcel(
  userId: string,
  buffer: Buffer,
  tagOverride?: string[]
): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [], phones: [] };

  // Auto-detect phone column from first row
  const phoneAliases = /^(phone|telefono|numero|celular|cel|whatsapp|mobile|movil|numerp|num|tel)$/i;
  const nameAliases = /^(name|nombre|nombres|cliente|contacto)$/i;
  const emailAliases = /^(email|correo|e-mail|mail)$/i;
  const tagAliases = /^(tags|etiquetas|tag|etiqueta|grupo|categoria)$/i;

  let phoneCol = "";
  let nameCol = "";
  let emailCol = "";
  let tagCol = "";

  if (rows.length > 0) {
    const cols = Object.keys(rows[0]);
    // Try to match by alias first
    phoneCol = cols.find((c) => phoneAliases.test(c)) || "";
    nameCol = cols.find((c) => nameAliases.test(c)) || "";
    emailCol = cols.find((c) => emailAliases.test(c)) || "";
    tagCol = cols.find((c) => tagAliases.test(c)) || "";

    // If no phone column found by name, find the first column that looks like phone numbers
    if (!phoneCol) {
      for (const col of cols) {
        const val = String(rows[0][col] || "").replace(/[^0-9]/g, "");
        if (val.length >= 10 && val.length <= 15) {
          phoneCol = col;
          break;
        }
      }
    }
  }

  // Reserved keys that won't go into metadata
  const reservedKeys = new Set([phoneCol, nameCol, emailCol, tagCol].filter(Boolean));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row (header is row 1)

    // Get phone value
    const phone = phoneCol ? row[phoneCol] : null;
    if (!phone) {
      result.errors.push(`Fila ${rowNum}: sin teléfono`);
      result.skipped++;
      continue;
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      result.errors.push(`Fila ${rowNum}: teléfono inválido "${phone}"`);
      result.skipped++;
      continue;
    }

    const name = nameCol ? (row[nameCol] || "") : "";
    const email = emailCol ? (row[emailCol] || null) : null;

    // Extract all extra columns as metadata (for template variables)
    const metadata: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!reservedKeys.has(key) && val !== null && val !== undefined && val !== "") {
        metadata[key] = String(val);
      }
    }

    // Tags from excel or override
    const rowTags = row["tags"] || row["etiquetas"] || row["Tags"] || row["Etiquetas"] || "";
    const tags = tagOverride && tagOverride.length > 0
      ? tagOverride
      : (typeof rowTags === "string" ? rowTags.split(",").map((t: string) => t.trim()).filter(Boolean) : []);

    try {
      await db.insert(contacts).values({
        userId,
        phone: cleanPhone,
        name: String(name),
        email: email ? String(email) : null,
        tags,
        metadata: Object.keys(metadata).length > 0 ? metadata : {},
        notes: null,
      });
      result.imported++;
      result.phones.push(cleanPhone);
    } catch (err: any) {
      if (err.code === "23505") {
        // Duplicate - update instead
        try {
          await db.update(contacts)
            .set({ name: String(name), email: email ? String(email) : null, tags, metadata: Object.keys(metadata).length > 0 ? metadata : {}, updatedAt: new Date() })
            .where(and(eq(contacts.userId, userId), eq(contacts.phone, cleanPhone)));
          result.imported++;
          result.phones.push(cleanPhone);
        } catch {
          result.errors.push(`Fila ${rowNum}: error al actualizar "${cleanPhone}"`);
          result.skipped++;
        }
      } else {
        result.errors.push(`Fila ${rowNum}: ${err.message}`);
        result.skipped++;
      }
    }
  }

  return result;
}
