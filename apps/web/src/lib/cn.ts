export type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, boolean | undefined | null>;

/** Concatène des classes conditionnelles (équivalent léger de clsx). */
export function cn(...xs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (x: ClassValue) => {
    if (!x) return;
    if (typeof x === "string" || typeof x === "number") out.push(String(x));
    else if (Array.isArray(x)) x.forEach(walk);
    else for (const [k, v] of Object.entries(x)) if (v) out.push(k);
  };
  xs.forEach(walk);
  return out.join(" ");
}
