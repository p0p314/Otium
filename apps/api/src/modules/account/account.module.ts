import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { DeleteAccountUseCase } from "./application/delete-account.usecase";
import { ExportAccountUseCase } from "./application/export-account.usecase";
import { ACCOUNT_GATEWAY } from "./domain/account-gateway";
import { PrismaAccountGateway } from "./infrastructure/prisma-account.gateway";
import { AccountController } from "./presentation/account.controller";

/**
 * Cycle de vie du compte (RGPD) : export des données (portabilité) et suppression
 * (effacement). Concern cross-domain : il touche à toutes les données de l'utilisateur,
 * d'où un module dédié plutôt qu'un ajout dans authentication.
 */
@Module({
  imports: [AuthenticationModule], // AuthGuard + USER_REPOSITORY + PASSWORD_HASHER
  controllers: [AccountController],
  providers: [
    ExportAccountUseCase,
    DeleteAccountUseCase,
    { provide: ACCOUNT_GATEWAY, useClass: PrismaAccountGateway },
  ],
})
export class AccountModule {}
