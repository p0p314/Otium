import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterInput } from "@otium/types";
import { Button } from "@otium/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useRegister } from "./api/use-auth";
import { Field } from "./components/field";

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInput),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate(values, { onSuccess: () => void navigate({ to: "/" }) });
  });

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted-foreground">Commencez à suivre vos films et séries.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
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
        <Field
          id="password"
          type="password"
          label="Mot de passe"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {registerMutation.isError ? (
          <p className="text-sm text-destructive">
            Inscription impossible. Cet e-mail est peut-être déjà utilisé.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Création…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
