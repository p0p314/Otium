import { type HTMLAttributes } from "react";
import { cn } from "../lib/cn";

/** Placeholder de chargement (voir CLAUDE.md — skeleton loaders). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
