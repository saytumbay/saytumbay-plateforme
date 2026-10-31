import { createContext, forwardRef, useContext, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Switch as RSwitch, Checkbox as RCheckbox } from "radix-ui";
import { Check, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface FieldCtx {
  id: string;
  hintId?: string;
  errorId?: string;
  invalid: boolean;
}
const Ctx = createContext<FieldCtx | null>(null);

/** Champ de formulaire : libellé visible, aide et erreur reliées au contrôle (aria-describedby). */
export function Field({ label, hint, error, children, className, required, optional }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string; required?: boolean; optional?: boolean }) {
  const id = useId();
  const hintId = hint ? `${id}-aide` : undefined;
  const errorId = error ? `${id}-erreur` : undefined;
  return (
    <Ctx.Provider value={{ id, hintId, errorId, invalid: !!error }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="font-display text-[13.5px] font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          {optional && <span className="ml-1.5 font-sans text-xs font-normal text-ink-3">facultatif</span>}
        </label>
        {children}
        {hint && !error && (
          <p id={hintId} className="text-[13px] text-ink-3">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-[13px] font-medium text-danger-ink" role="alert">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}

function useField() {
  const c = useContext(Ctx);
  return c
    ? { id: c.id, "aria-invalid": c.invalid || undefined, "aria-describedby": [c.hintId, c.errorId].filter(Boolean).join(" ") || undefined }
    : {};
}

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-3/80 transition-colors hover:border-ink-3 focus:border-[var(--focus)] focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_oklab,var(--focus)_25%,transparent)] aria-[invalid=true]:border-danger disabled:bg-surface-2 disabled:text-ink-3";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { suffix?: ReactNode }>(function Input({ className, suffix, ...rest }, ref) {
  const f = useField();
  if (suffix)
    return (
      <div className="relative">
        <input ref={ref} className={cn(control, "h-11 pr-14", className)} {...f} {...rest} />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-3">{suffix}</span>
      </div>
    );
  return <input ref={ref} className={cn(control, "h-11", className)} {...f} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  const f = useField();
  return <textarea ref={ref} className={cn(control, "min-h-24 py-2.5", className)} {...f} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  const f = useField();
  return (
    <select
      ref={ref}
      className={cn(
        control,
        "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235f7067%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')]",
        className,
      )}
      {...f}
      {...rest}
    >
      {children}
    </select>
  );
});

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput({ className, ...rest }, ref) {
  const f = useField();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} type={show ? "text" : "password"} className={cn(control, "h-11 pr-12", className)} {...f} {...rest} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-1 my-1 flex w-10 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
});

/** Indicateur de robustesse : longueur, variété, absence de motifs évidents. */
export function PasswordStrength({ value }: { value: string }) {
  const checks = [
    { ok: value.length >= 12, label: "12 caractères" },
    { ok: /[a-zà-ÿ]/.test(value) && /[A-ZÀ-Ý]/.test(value), label: "majuscules et minuscules" },
    { ok: /\d/.test(value), label: "un chiffre" },
  ];
  const weak = /(1234|azerty|qwerty|password|motdepasse|saytumbay)/i.test(value);
  const score = checks.filter((c) => c.ok).length - (weak ? 1 : 0) + (value.length >= 16 ? 1 : 0);
  const label = score >= 4 ? "Robuste" : score === 3 ? "Correct" : score === 2 ? "Faible" : "Trop faible";
  const tone = score >= 4 ? "bg-brand" : score === 3 ? "bg-water" : score === 2 ? "bg-sun" : "bg-danger";
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < Math.max(1, score) && value ? tone : "bg-surface-3")} />
        ))}
      </div>
      <p className="text-[13px] text-ink-3">
        {value ? <span className="font-semibold text-ink-2">{label}. </span> : null}
        {checks.map((c, i) => (
          <span key={c.label} className={c.ok ? "text-brand-strong dark:text-brand" : undefined}>
            {c.ok ? "✓ " : ""}
            {c.label}
            {i < checks.length - 1 ? ", " : "."}
          </span>
        ))}
        {weak && <span className="text-danger-ink"> Évitez les mots et suites trop connus.</span>}
      </p>
    </div>
  );
}

export function Switch({ checked, onCheckedChange, label, description, disabled, id: idProp }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean; id?: string }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-display text-sm font-semibold text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      <RSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-line-strong transition-colors data-[state=checked]:bg-brand disabled:opacity-50"
      >
        <RSwitch.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow-1 transition-transform duration-150 data-[state=checked]:translate-x-[22px]" />
      </RSwitch.Root>
    </div>
  );
}

export function Checkbox({ checked, onCheckedChange, label, id: idProp, invalid }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: ReactNode; id?: string; invalid?: boolean }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className="flex items-start gap-3">
      <RCheckbox.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-invalid={invalid || undefined}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-line-strong bg-surface data-[state=checked]:border-brand data-[state=checked]:bg-brand aria-[invalid=true]:border-danger"
      >
        <RCheckbox.Indicator>
          <Check className="size-3.5 text-brand-ink" strokeWidth={3} aria-hidden />
        </RCheckbox.Indicator>
      </RCheckbox.Root>
      <label htmlFor={id} className="text-sm text-ink-2">
        {label}
      </label>
    </div>
  );
}

/** Erreur globale de formulaire (réseau, identifiants). */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger-ink">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
