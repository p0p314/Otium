import { z } from "zod";

/** Contraintes partagées front/back pour l'authentification. */
export const email = z.string().trim().toLowerCase().email().max(320);
export const password = z.string().min(8).max(128);
export const displayName = z.string().trim().min(2).max(50);

export const RegisterInput = z.object({
  email,
  password,
  displayName,
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email,
  password,
});
export type LoginInput = z.infer<typeof LoginInput>;

/** Représentation publique d'un utilisateur (jamais le mot de passe). */
export const AuthUser = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
});
export type AuthUser = z.infer<typeof AuthUser>;

/** Réponse d'authentification : l'utilisateur + un jeton de session opaque. */
export const AuthSession = z.object({
  user: AuthUser,
  token: z.string(),
  expiresAt: z.string().datetime(),
});
export type AuthSession = z.infer<typeof AuthSession>;
