import { Button, Modal } from "@otium/ui";
import { MoreVertical, Share, SquarePlus } from "lucide-react";
import type { ReactNode } from "react";
import type { InstallPlatform } from "./use-install-context";

function Step({ children }: { children: ReactNode }) {
  return <li className="flex items-start gap-2 text-sm">{children}</li>;
}

/** Instructions iOS (Safari) — partage puis « Sur l'écran d'accueil ». */
function IosSteps() {
  return (
    <ol className="space-y-2">
      <Step>
        <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Appuyez sur le bouton <strong>Partager</strong> (le carré avec une flèche vers le haut),
          en bas de Safari.
        </span>
      </Step>
      <Step>
        <SquarePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Faites défiler puis choisissez <strong>« Sur l'écran d'accueil »</strong>, et confirmez
          avec <strong>Ajouter</strong>.
        </span>
      </Step>
    </ol>
  );
}

/** Instructions Android (Chrome) — menu puis « Ajouter à l'écran d'accueil ». */
function AndroidSteps() {
  return (
    <ol className="space-y-2">
      <Step>
        <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Ouvrez le menu <strong>⋮</strong> en haut à droite de Chrome.
        </span>
      </Step>
      <Step>
        <SquarePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Choisissez <strong>« Ajouter à l'écran d'accueil »</strong> (ou{" "}
          <strong>« Installer l'application »</strong>), puis confirmez.
        </span>
      </Step>
    </ol>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Explique comment ajouter Otium à l'écran d'accueil. On met en avant la plateforme
 * détectée, tout en gardant les deux jeux d'instructions (iOS + Android) disponibles.
 */
export function AddToHomeModal({
  open,
  platform,
  onClose,
}: {
  open: boolean;
  platform: InstallPlatform;
  onClose: () => void;
}) {
  const ios = <Section title="iPhone / iPad (Safari)">{<IosSteps />}</Section>;
  const android = <Section title="Android (Chrome)">{<AndroidSteps />}</Section>;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Installer Otium sur votre téléphone"
      description="Ajoutez le site à votre écran d'accueil pour l'ouvrir en plein écran, comme une application."
      footer={<Button onClick={onClose}>J'ai compris</Button>}
    >
      <div className="space-y-3">
        {/* La plateforme détectée en premier ; l'autre reste consultable. */}
        {platform === "android" ? (
          <>
            {android}
            {ios}
          </>
        ) : (
          <>
            {ios}
            {android}
          </>
        )}
      </div>
    </Modal>
  );
}
