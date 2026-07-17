import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

export interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  /** Description optionnelle (liée via aria-describedby). */
  readonly description?: ReactNode;
  readonly children?: ReactNode;
  /** Zone d'actions (boutons) en pied de modale. */
  readonly footer?: ReactNode;
  readonly className?: string;
}

/**
 * Modale accessible (design system) : rendue en portail, centrée, avec voile.
 * `role="dialog"` + `aria-modal`, titre lié via `aria-labelledby`. Se ferme au clic sur le
 * voile ou avec Échap ; verrouille le défilement du corps pendant l'ouverture. Le focus est
 * amené sur le panneau à l'ouverture. Mobile-first : pleine largeur en bas de seuil, centrée au-delà.
 */
export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "w-full max-w-md rounded-t-2xl border bg-background p-5 shadow-xl outline-none sm:rounded-2xl",
          className,
        )}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
