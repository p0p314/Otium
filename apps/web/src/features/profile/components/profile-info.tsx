import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateProfileInput } from "@otium/types";
import { Button } from "@otium/ui";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth, useLogout, useUpdateProfile } from "../../auth/api/use-auth";
import { Field } from "../../auth/components/field";

/** Onglet « Profil » : édition du nom affiché et de l'e-mail + déconnexion. */
export function ProfileInfo() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const logout = useLogout();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileInput),
    defaultValues: { displayName: user?.displayName ?? "", email: user?.email ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    update.mutate(values, {
      // On recale le formulaire sur les valeurs enregistrées (isDirty repasse à false).
      onSuccess: (saved) => reset({ displayName: saved.displayName, email: saved.email }),
    });
  });

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          id="displayName"
          label="Nom affiché"
          autoComplete="nickname"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <Field
          id="email"
          type="email"
          label="E-mail"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        {update.isError ? (
          <p className="text-sm text-destructive">
            Impossible d'enregistrer. Cet e-mail est peut-être déjà utilisé.
          </p>
        ) : null}
        {update.isSuccess && !isDirty ? (
          <p className="text-sm text-primary">Profil enregistré.</p>
        ) : null}

        <Button type="submit" disabled={update.isPending || !isDirty}>
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>

      <div className="border-t pt-4">
        <Button
          variant="outline"
          disabled={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: "/" }) })}
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Button>
      </div>
    </div>
  );
}
