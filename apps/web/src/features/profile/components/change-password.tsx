import { zodResolver } from "@hookform/resolvers/zod";
import { ChangePasswordInput } from "@otium/types";
import { Button } from "@otium/ui";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useChangePassword } from "../../auth/api/use-auth";
import { Field } from "../../auth/components/field";

// On étend le contrat serveur d'un champ de confirmation (validé côté client).
const FormSchema = ChangePasswordInput.extend({ confirm: z.string() }).refine(
  (data) => data.confirm === data.newPassword,
  { path: ["confirm"], message: "Les mots de passe ne correspondent pas." },
);
type FormValues = z.infer<typeof FormSchema>;

/** Changement de mot de passe (l'actuel est vérifié côté serveur). */
export function ChangePassword() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) => {
    change.mutate({ currentPassword, newPassword }, { onSuccess: () => reset() });
  });

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Changer le mot de passe</h2>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          id="currentPassword"
          type="password"
          label="Mot de passe actuel"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <Field
          id="newPassword"
          type="password"
          label="Nouveau mot de passe"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Field
          id="confirm"
          type="password"
          label="Confirmer le nouveau mot de passe"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register("confirm")}
        />

        {change.isError ? (
          <p className="text-sm text-destructive">Mot de passe actuel incorrect.</p>
        ) : null}
        {change.isSuccess ? <p className="text-sm text-primary">Mot de passe modifié.</p> : null}

        <Button type="submit" disabled={change.isPending}>
          {change.isPending ? "Modification…" : "Modifier le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
