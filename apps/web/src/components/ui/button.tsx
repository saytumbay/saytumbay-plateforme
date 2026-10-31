import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet" | "onion";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out select-none active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-strong shadow-1",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-white hover:brightness-95 dark:text-[#2a0a04]",
  quiet: "bg-surface-2 text-ink hover:bg-surface-3",
  onion: "bg-onion text-white hover:brightness-95 dark:text-[#2b0a19]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-md px-3 text-[13px]",
  md: "h-11 rounded-lg px-4 text-sm",
  lg: "h-12 rounded-lg px-5 text-[15px]",
  icon: "h-10 w-10 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ variant = "primary", size = "md", className, icon, children, ...rest }: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** Bouton carré à icône : libellé obligatoire (infobulle + lecteur d'écran). */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(function IconButton({ label, variant = "ghost", className, children, ...rest }, ref) {
  return (
    <Button ref={ref} variant={variant} size="icon" aria-label={label} title={label} className={className} {...rest}>
      {children}
    </Button>
  );
});
