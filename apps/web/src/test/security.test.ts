import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/export";
import { safeNext } from "@/lib/auth";
import { cn } from "@/lib/cn";

describe("export CSV", () => {
  it("neutralise les formules dans le texte, pas dans les nombres", () => {
    const csv = toCsv([{ Nom: "=HYPERLINK(\"http://x\")", Note: "+33", Valeur: -12.5, Vide: null }]);
    const [head, row] = csv.split("\r\n");
    expect(head).toBe("Nom;Note;Valeur;Vide");
    expect(row).toBe(`"'=HYPERLINK(""http://x"")";'+33;-12,5;`);
  });
  it("protège les séparateurs et retours à la ligne", () => {
    expect(toCsv([{ a: "un;deux\ntrois" }]).split("\r\n")[1]).toBe('"un;deux\ntrois"');
  });
});

describe("redirection après connexion", () => {
  it.each([
    ["/app/parcelles", "/app/parcelles"],
    ["//evil.example", null],
    ["https://evil.example", null],
    ["/\\evil.example", null],
    ["javascript:alert(1)", null],
    [null, null],
  ])("%s → %s", (input, out) => {
    expect(safeNext(input)).toBe(out);
  });
});

describe("classes", () => {
  it("la dernière classe en conflit l'emporte", () => {
    expect(cn("inline-flex h-11", "hidden sm:inline-flex h-14")).toBe("hidden sm:inline-flex h-14");
  });
});
