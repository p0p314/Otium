import { Button } from "@otium/ui";
import { useNavigate } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteAccount, useExportData } from "../../auth/api/use-auth";
import { Field } from "../../auth/components/field";

/**
 * Section « Mes données » (RGPD) : export (portabilité) et suppression de compte
 * (effacement, mot de passe exigé + confirmation explicite car irréversible).
 */
export function PrivacyData() {
  const exportData = useExportData();
  const remove = useDeleteAccount();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");

  const onDelete = () => {
    remove.mutate({ password }, { onSuccess: () => void navigate({ to: "/login" }) });
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Mes données</h2>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Téléchargez l'ensemble de vos données personnelles au format JSON (bibliothèque, listes,
          avis, progression).
        </p>
        <Button
          variant="outline"
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          <Download className="h-4 w-4" />{" "}
          {exportData.isPending ? "Préparation…" : "Exporter mes données"}
        </Button>
        {exportData.isError ? (
          <p className="text-sm text-destructive">Export impossible pour le moment.</p>
        ) : null}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-foreground">Supprimer mon compte</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Action <strong>irréversible</strong> : toutes vos données seront définitivement effacées.
        </p>

        {confirming ? (
          <div className="mt-3 space-y-3">
            <Field
              id="delete-password"
              type="password"
              label="Confirmez avec votre mot de passe"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={remove.isError ? "Mot de passe incorrect." : undefined}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={remove.isPending || !password}
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                {remove.isPending ? "Suppression…" : "Supprimer définitivement"}
              </Button>
              <Button
                variant="outline"
                disabled={remove.isPending}
                onClick={() => {
                  setConfirming(false);
                  setPassword("");
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="destructive" className="mt-3" onClick={() => setConfirming(true)}>
            <Trash2 className="h-4 w-4" /> Supprimer mon compte
          </Button>
        )}
      </div>
    </div>
  );
}
