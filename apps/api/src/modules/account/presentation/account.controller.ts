import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteAccountInput } from "@otium/types";
import type { Response } from "express";
import type { Env } from "../../../shared/infrastructure/config/env";
import { RateLimit } from "../../../shared/presentation/rate-limit.decorator";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { InvalidCredentialsError } from "../../authentication/application/errors";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { clearSessionCookie } from "../../authentication/presentation/session-cookie";
import { DeleteAccountUseCase } from "../application/delete-account.usecase";
import { ExportAccountUseCase } from "../application/export-account.usecase";
import type { AccountExport } from "../domain/account-gateway";

/** Cycle de vie du compte : export (portabilité) et suppression (effacement) — RGPD. */
@Controller("account")
@UseGuards(AuthGuard)
export class AccountController {
  constructor(
    private readonly exportAccount: ExportAccountUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Export JSON téléchargeable de toutes les données personnelles (RGPD Art. 20). */
  @Get("export")
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountExport> {
    const data = await this.exportAccount.execute(user.id);
    const date = new Date().toISOString().slice(0, 10);
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="otium-export-${date}.json"`);
    return data;
  }

  /** Suppression définitive du compte (RGPD Art. 17), mot de passe courant exigé. */
  @RateLimit({ limit: 5, windowSeconds: 3600 })
  @Delete()
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(DeleteAccountInput)) input: DeleteAccountInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    try {
      await this.deleteAccount.execute({ userId: user.id, password: input.password });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new BadRequestException("Mot de passe incorrect.");
      }
      throw error;
    }
    // Sessions supprimées en cascade ; on efface aussi le cookie côté client.
    clearSessionCookie(response, this.config.get("NODE_ENV", { infer: true }) === "production");
  }
}
