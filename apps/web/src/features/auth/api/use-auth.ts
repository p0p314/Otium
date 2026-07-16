import type { LoginInput, RegisterInput, UpdateProfileInput } from "@otium/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";

/** État de session courant (lecture). */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  return { user, isAuthenticated: user !== null };
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterInput) => api.register(input),
    onSuccess: (session) => setSession(session.user),
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: (session) => setSession(session.user),
  });
}

/** Met à jour le profil et rafraîchit l'utilisateur en session (rendu immédiat). */
export function useUpdateProfile() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.updateProfile(input),
    onSuccess: (user) => setSession(user),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    // On nettoie la session localement même si l'appel réseau échoue.
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}
