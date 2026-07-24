import type {
  ChangePasswordInput,
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "@otium/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useOnboardingStore } from "../../onboarding/onboarding-store";
import { useAuthStore } from "../../../stores/auth-store";

/** État de session courant (lecture). */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  return { user, isAuthenticated: user !== null };
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const openImportPrompt = useOnboardingStore((s) => s.openImportPrompt);
  return useMutation({
    mutationFn: (input: RegisterInput) => api.register(input),
    onSuccess: (session) => {
      setSession(session.user);
      // Nouvel utilisateur : on propose d'importer ses données TV Time.
      openImportPrompt();
    },
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

/** Change le mot de passe (le serveur vérifie l'actuel). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.changePassword(input),
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

/** Exporte les données personnelles (RGPD Art. 20) et déclenche le téléchargement. */
export function useExportData() {
  return useMutation({
    mutationFn: () => api.exportMyData(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `otium-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
}

/** Supprime définitivement le compte (RGPD Art. 17), puis purge l'état local. */
export function useDeleteAccount() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteAccountInput) => api.deleteAccount(input),
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}
