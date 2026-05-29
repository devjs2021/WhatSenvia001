import * as XLSX from "xlsx";

export interface ParsedExcel {
  columns: string[];
  rows: Array<Record<string, string>>;
  phoneColumn: string;
  totalRows: number;
}

export function parseExcel(buffer: Buffer): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  if (rawRows.length === 0) {
    return { columns: [], rows: [], phoneColumn: "", totalRows: 0 };
  }

  const phoneAliases = /^(phone|telefono|numero|celular|cel|whatsapp|mobile|movil|num|tel)$/i;
  const cols = Object.keys(rawRows[0]);

  let phoneCol = cols.find((c) => phoneAliases.test(c)) || "";
  if (!phoneCol) {
    for (const col of cols) {
      const val = String(rawRows[0][col] || "").replace(/[^0-9]/g, "");
      if (val.length >= 10 && val.length <= 15) {
        phoneCol = col;
        break;
      }
    }
  }

  const rows: Array<Record<string, string>> = [];
  for (const raw of rawRows) {
    const phone = phoneCol ? String(raw[phoneCol] || "").replace(/[^0-9]/g, "") : "";
    if (phone.length < 10) continue;

    const row: Record<string, string> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (val !== null && val !== undefined && val !== "") {
        row[key] = String(val);
      }
    }
    row.phone = phone;
    rows.push(row);
  }

  return {
    columns: cols,
    rows,
    phoneColumn: phoneCol,
    totalRows: rows.length,
  };
}
