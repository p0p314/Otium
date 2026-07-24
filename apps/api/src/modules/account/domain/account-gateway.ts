/**
 * Port de cycle de vie du compte (RGPD). Cross-domain par nature : il touche à **toutes**
 * les données personnelles de l'utilisateur (bibliothèque, listes, avis, progression,
 * journal d'événements). Implémenté en infrastructure (Prisma).
 */

/** Export complet des données personnelles d'un utilisateur (portabilité — Art. 20). */
export interface AccountExport {
  readonly exportedAt: string;
  readonly account: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
    readonly createdAt: string;
  };
  readonly library: readonly AccountExportLibraryItem[];
  readonly lists: readonly AccountExportList[];
  readonly reviews: readonly AccountExportReview[];
  readonly episodeReviews: readonly AccountExportEpisodeReview[];
}

export interface AccountExportLibraryItem {
  readonly media: {
    readonly title: string;
    readonly type: string;
    readonly provider: string;
    readonly externalId: string;
  };
  readonly status: string;
  readonly rating: number | null;
  readonly isFavorite: boolean;
  readonly addedAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly progress: readonly {
    readonly unit: string;
    readonly fromValue: number;
    readonly toValue: number;
    readonly occurredAt: string;
  }[];
}

export interface AccountExportList {
  readonly name: string;
  readonly createdAt: string;
  readonly items: readonly { readonly title: string; readonly position: number }[];
}

export interface AccountExportReview {
  readonly mediaTitle: string;
  readonly body: string;
  readonly rating: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccountExportEpisodeReview {
  readonly rating: number | null;
  readonly body: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccountGateway {
  /** Rassemble toutes les données personnelles de l'utilisateur (portabilité RGPD). */
  export(userId: string): Promise<AccountExport>;
  /**
   * Efface définitivement le compte et **toutes** les données rattachées (effacement RGPD),
   * y compris le journal d'événements (qui n'a pas de cascade FK).
   */
  delete(userId: string): Promise<void>;
}

export const ACCOUNT_GATEWAY = Symbol("ACCOUNT_GATEWAY");
