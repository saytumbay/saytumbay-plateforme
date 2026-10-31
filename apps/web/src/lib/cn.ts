import { twMerge } from "tailwind-merge";

export type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, boolean | undefined | null>;

function flatten(xs: ClassValue[], out: string[] = []): string[] {
  for (const x of xs) {
    if (!x) continue;
    if (typeof x === "string" || typeof x === "number") out.push(String(x));
    else if (Array.isArray(x)) flatten(x, out);
    else for (const [k, v] of Object.entries(x)) if (v) out.push(k);
  }
  return out;
}

/**
 * Concatène des classes conditionnelles et résout les conflits Tailwind : la dernière classe gagne
 * (`cn("inline-flex", "hidden sm:inline-flex")` donne bien un élément masqué sur mobile).
 */
export function cn(...xs: ClassValue[]): string {
  return twMerge(flatten(xs).join(" "));
}
