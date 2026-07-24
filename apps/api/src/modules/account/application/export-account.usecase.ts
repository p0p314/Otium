import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import {
  ACCOUNT_GATEWAY,
  type AccountExport,
  type AccountGateway,
} from "../domain/account-gateway";

/** Exporte toutes les données personnelles d'un utilisateur (portabilité — RGPD Art. 20). */
@Injectable()
export class ExportAccountUseCase implements UseCase<string, AccountExport> {
  constructor(@Inject(ACCOUNT_GATEWAY) private readonly gateway: AccountGateway) {}

  execute(userId: string): Promise<AccountExport> {
    return this.gateway.export(userId);
  }
}
