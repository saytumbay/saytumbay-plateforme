import type { z } from "zod";

/** Erreur métier sérialisée au format du contrat : `{ error: { code, message, details? } }`. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (message = "Ressource introuvable.") => new HttpError(404, "introuvable", message);
export const forbidden = (message = "Votre rôle ne permet pas cette action. Demandez à un responsable de l’organisation.") => new HttpError(403, "interdit", message);
export const conflict = (code: string, message: string, fields?: Record<string, string>) => new HttpError(409, code, message, fields ? { fields } : undefined);

/** Valide une entrée ; en cas d'échec, 422 avec le premier message par champ (affiché sous le champ). */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] ??= i.message;
    throw new HttpError(422, "validation", "Certains champs sont à corriger.", { fields });
  }
  return r.data;
}
