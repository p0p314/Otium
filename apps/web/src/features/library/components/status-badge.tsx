import type { MediaType, WatchStatus } from "@otium/types";
import { cn } from "@otium/ui";
import {
  CheckCircle2,
  Clock,
  type LucideIcon,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { statusLabel } from "../status";

/** Icône + teinte par statut — représentation visuelle (WCAG : couleur + icône + texte). */
const STYLES: Record<WatchStatus, { icon: LucideIcon; tone: string }> = {
  PLANNED: { icon: Clock, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  IN_PROGRESS: { icon: PlayCircle, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  COMPLETED: { icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  PAUSED: { icon: PauseCircle, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  DROPPED: { icon: XCircle, tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

interface StatusBadgeProps {
  status: WatchStatus;
  type: MediaType;
  /** N'affiche que l'icône (le libellé reste accessible aux lecteurs d'écran). */
  iconOnly?: boolean;
  className?: string;
}

/** Pastille de statut visuelle (icône colorée + libellé), réutilisable. */
export function StatusBadge({ status, type, iconOnly = false, className }: StatusBadgeProps) {
  const { icon: Icon, tone } = STYLES[status];
  const label = statusLabel(status, type);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
