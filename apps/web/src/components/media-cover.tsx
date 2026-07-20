import { cn } from "@otium/ui";
import { ImageOff } from "lucide-react";
import { useState } from "react";

/**
 * Couverture / affiche d'un média. **Source unique** du rendu d'image du catalogue :
 * cadrage, chargement, repli et accessibilité au même endroit — plutôt que huit `<img>`
 * aux réglages divergents.
 *
 * Trois choix qui pèsent sur la performance perçue :
 *
 * 1. **Ratio réservé** (`aspect-[2/3]`) : la place est occupée avant l'arrivée de l'image,
 *    donc aucun décalage de mise en page pendant le chargement.
 * 2. **Chargement paresseux par défaut, sauf `priority`** : les premières vignettes visibles
 *    sont chargées tout de suite et en priorité réseau ; les suivantes attendent d'approcher
 *    l'écran. Charger paresseusement ce qui est déjà visible retarde l'affichage utile.
 * 3. **`decoding="async"`** : le décodage JPEG ne bloque pas le rendu du reste.
 *
 * Le repli visuel couvre les deux cas réels : couverture absente du catalogue, et URL
 * présente mais cassée (fréquent côté Open Library).
 */
export function MediaCover({
  src,
  alt,
  priority = false,
  className,
  sizeClassName = "h-full w-full",
}: {
  src: string | null;
  /** Texte alternatif. Vide (`""`) si l'image est purement décorative à côté d'un titre. */
  alt: string;
  /** Vrai pour les images visibles d'emblée : chargement immédiat et priorité réseau. */
  priority?: boolean;
  className?: string;
  /** Permet à l'appelant de piloter les dimensions (grille, fiche…). */
  sizeClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          sizeClassName,
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
        aria-hidden
      >
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      // `fetchpriority` n'est pas encore typé dans les définitions React installées.
      {...({ fetchpriority: priority ? "high" : "auto" } as Record<string, string>)}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(sizeClassName, "object-cover", className)}
    />
  );
}

/**
 * Nombre de vignettes traitées comme « visibles d'emblée » dans une grille. Au-delà,
 * le chargement paresseux reprend la main. Calé sur la grille la plus dense (5 colonnes)
 * pour couvrir la première rangée sur grand écran et les trois premières sur mobile.
 */
export const ABOVE_THE_FOLD = 6;
