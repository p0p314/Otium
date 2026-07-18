import { Button, Modal } from "@otium/ui";
import { useNavigate } from "@tanstack/react-router";
import { useOnboardingStore } from "./onboarding-store";

/**
 * Invite proposée **juste après l'inscription** : importer ses données TV Time. Montée
 * globalement (coquille) ; s'ouvre quand `importPromptPending` est posé par l'inscription.
 * « Importer maintenant » amène directement sur l'onglet Import du profil.
 */
export function ImportOnboardingPrompt() {
  const pending = useOnboardingStore((s) => s.importPromptPending);
  const dismiss = useOnboardingStore((s) => s.dismissImportPrompt);
  const navigate = useNavigate();

  const goToImport = (): void => {
    dismiss();
    void navigate({ to: "/profile", search: { tab: "import" } });
  };

  return (
    <Modal
      open={pending}
      onClose={dismiss}
      title="Importer vos données TV Time ?"
      description="Reconstruisez votre bibliothèque à partir de votre export de données TV Time."
      footer={
        <>
          <Button variant="ghost" onClick={dismiss}>
            Plus tard
          </Button>
          <Button onClick={goToImport}>Importer maintenant</Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Vous pourrez aussi le faire à tout moment depuis <strong>Profil → Importer</strong>.
      </p>
    </Modal>
  );
}
