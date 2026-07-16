import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { Email, USER_REPOSITORY, type UserRepository } from "../../user/domain";
import { EmailAlreadyUsedError } from "./errors";

export interface UpdateProfileInput {
  userId: string;
  displayName?: string;
  email?: string;
}

/**
 * Met à jour le profil de l'utilisateur (nom affiché et/ou e-mail). Vérifie l'unicité
 * de l'e-mail s'il change. Ne touche jamais au mot de passe.
 */
@Injectable()
export class UpdateProfileUseCase implements UseCase<UpdateProfileInput, AuthUser> {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute({ userId, displayName, email }: UpdateProfileInput): Promise<AuthUser> {
    const current = await this.users.findById(userId);
    if (!current) throw new NotFoundException("Utilisateur introuvable.");

    let nextEmail: Email | undefined;
    if (email !== undefined) {
      const candidate = Email.create(email);
      if (candidate.value !== current.email.value && (await this.users.existsByEmail(candidate))) {
        throw new EmailAlreadyUsedError();
      }
      nextEmail = candidate;
    }

    const updated = await this.users.updateProfile(userId, {
      ...(displayName !== undefined ? { displayName: displayName.trim() } : {}),
      ...(nextEmail !== undefined ? { email: nextEmail } : {}),
    });
    return { id: updated.id, email: updated.email.value, displayName: updated.displayName };
  }
}
