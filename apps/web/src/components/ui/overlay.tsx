import { useState, type ReactNode } from "react";
import { Dialog, DropdownMenu, Tooltip as RTooltip, AlertDialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/**
 * Panneau latéral (bureau) qui devient une feuille du bas (mobile).
 * Pour les créations et modifications courtes : on garde le contexte de la page.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#06110d]/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-surface shadow-3 focus:outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down",
            "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:rounded-none md:rounded-l-2xl md:data-[state=open]:animate-sheet-in md:data-[state=closed]:animate-sheet-out",
            width === "md" ? "md:w-[440px]" : "md:w-[620px]",
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-4 md:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-lg font-semibold">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-ink-3">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Panneau"}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button className="-mr-1 rounded-md p-2 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Fermer">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Modal({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (v: boolean) => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#06110d]/45 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-3 focus:outline-none data-[state=open]:animate-pop-in">
          <Dialog.Title className="font-display text-lg font-semibold">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-1.5 text-sm text-ink-3">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Fenêtre"}</Dialog.Description>}
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
          <Dialog.Close asChild>
            <button className="absolute right-3 top-3 rounded-md p-2 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Fermer">
              <X className="size-5" aria-hidden />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Confirmation d'une action destructive : le bouton nomme exactement l'action. */
export function Confirm({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "danger",
}: {
  trigger: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  tone?: "danger" | "primary";
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[#06110d]/45 data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-3 data-[state=open]:animate-pop-in">
          <AlertDialog.Title className="font-display text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-ink-2">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Annuler</Button>
            </AlertDialog.Cancel>
            <Button
              variant={tone}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <RTooltip.Root delayDuration={300}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content side={side} sideOffset={6} className="z-[60] max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] font-medium text-bg shadow-2 data-[state=delayed-open]:animate-fade-in">
          {content}
          <RTooltip.Arrow className="fill-ink" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

export const TooltipProvider = RTooltip.Provider;

export function Menu({ trigger, children, align = "end" }: { trigger: ReactNode; children: ReactNode; align?: "start" | "end" }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} className="z-50 min-w-56 rounded-xl border border-line bg-surface p-1.5 shadow-3 data-[state=open]:animate-pop-in">
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuItem({ children, onSelect, icon, tone, disabled }: { children: ReactNode; onSelect?: () => void; icon?: ReactNode; tone?: "danger"; disabled?: boolean }) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        tone === "danger" ? "text-danger-ink" : "text-ink",
      )}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}

export const MenuSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-line" />;
export const MenuLabel = ({ children }: { children: ReactNode }) => <DropdownMenu.Label className="px-2.5 pb-1 pt-2 text-xs font-semibold text-ink-3">{children}</DropdownMenu.Label>;
