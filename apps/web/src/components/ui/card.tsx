import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, as: As = "section", ...rest }: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "aside" }) {
  return <As className={cn("rounded-xl border border-line bg-surface", className)} {...rest} />;
}

export function CardHeader({ title, subtitle, actions, className, id, level = 2 }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string; id?: string; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5", className)}>
      <div className="min-w-0">
        <H id={id} className="text-[17px] font-semibold leading-tight">
          {title}
        </H>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t border-line px-5 py-3 text-sm text-ink-3", className)} {...rest} />;
}
