/** Exports côté navigateur : CSV compatible Excel (séparateur « ; », BOM UTF-8) et impression PDF. */

/** CSV « ; » pour Excel en français. Les textes commençant par = + - @ sont neutralisés (injection de formules) ; les nombres restent des nombres. */
export function toCsv(rows: Array<Record<string, string | number | null | undefined>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    if (v == null) return "";
    if (typeof v === "number") return Number.isFinite(v) ? String(v).replace(".", ",") : "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\r\n");
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return;
  const blob = new Blob(["\ufeff" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Impression : la feuille de style « print » masque la navigation et garde le contenu. */
export function printPage(title?: string) {
  const prev = document.title;
  if (title) document.title = title;
  window.print();
  setTimeout(() => (document.title = prev), 500);
}
