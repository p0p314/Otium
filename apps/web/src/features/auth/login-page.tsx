import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput } from "@otium/types";
import { Button } from "@otium/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useLogin } from "./api/use-auth";
import { Field } from "./components/field";

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInput),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, { onSuccess: () => void navigate({ to: "/" }) });
  });

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-bold tracking-tight">Connexion</h1>
      <p className="mt-1 text-sm text-muted-foreground">Content de vous revoir.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {loginMutation.isError ? (
          <p className="text-sm text-destructive">E-mail ou mot de passe incorrect.</p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
