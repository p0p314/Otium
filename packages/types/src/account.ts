import { z } from "zod";

/**
 * Suppression de compte (droit à l'effacement — RGPD Art. 17). Le mot de passe courant est
 * exigé : action **irréversible**, on prouve l'identité avant de détruire les données.
 */
export const DeleteAccountInput = z.object({
  password: z.string().min(1),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountInput>;
