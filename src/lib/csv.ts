/**
 * Escape a value for RFC 4180 CSV format.
 *
 * Also neutralizes CSV/formula injection: a value starting with =, +, -, or
 * @ is interpreted as a formula by Excel/Sheets when the file is opened —
 * free-text fields in this app (client names, complaint notes, incident
 * descriptions) are user-entered and end up in these exports, so a value
 * like "=SUM(...)" or "=cmd|..." would execute rather than display as text.
 * Prefixing with a single quote forces spreadsheet apps to treat it as a
 * literal string while remaining valid, unremarkable CSV.
 */
export function escapeCsv(value: unknown): string {
  let str = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string from headers and rows.
 */
export function buildCsv(headers: string[], rows: string[][]): string {
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");
}
