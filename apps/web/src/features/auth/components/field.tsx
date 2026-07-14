import { Input, type InputProps } from "@otium/ui";
import { forwardRef } from "react";

interface FieldProps extends InputProps {
  label: string;
  error?: string | undefined;
}

/** Champ de formulaire : label + input + message d'erreur, accessible. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, id, ...props }, ref) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input id={id} ref={ref} aria-invalid={!!error} {...props} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  ),
);
Field.displayName = "Field";
