import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type AuthSession,
  type AuthUser,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "@otium/types";
import type { Response } from "express";
import type { Env } from "../../../shared/infrastructure/config/env";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import type { AuthResult } from "../application/auth-result";
import { EmailAlreadyUsedError, InvalidCredentialsError } from "../application/errors";
import { LoginUserUseCase } from "../application/login-user.usecase";
import { RegisterUserUseCase } from "../application/register-user.usecase";
import { UpdateProfileUseCase } from "../application/update-profile.usecase";
import { ChangePasswordUseCase } from "../application/change-password.usecase";
import { SESSION_STORE, type SessionStore } from "../domain/ports/session-store";
import { AuthGuard, type AuthenticatedUser, type RequestWithUser } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { clearSessionCookie, setSessionCookie } from "./session-cookie";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get isProduction(): boolean {
    return this.config.get("NODE_ENV", { infer: true }) === "production";
  }

  @Post("register")
  async register(
    @Body(new ZodValidationPipe(RegisterInput)) input: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSession> {
    try {
      return this.toSession(await this.registerUser.execute(input), response);
    } catch (error) {
      if (error instanceof EmailAlreadyUsedError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginInput)) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSession> {
    try {
      return this.toSession(await this.loginUser.execute(input), response);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) throw new UnauthorizedException(error.message);
      throw error;
    }
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthUser {
    return user;
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateProfileInput)) input: UpdateProfileInput,
  ): Promise<AuthUser> {
    try {
      return await this.updateProfile.execute({ userId: user.id, ...input });
    } catch (error) {
      if (error instanceof EmailAlreadyUsedError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Put("password")
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async changeMyPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(ChangePasswordInput)) input: ChangePasswordInput,
  ): Promise<void> {
    try {
      await this.changePassword.execute({ userId: user.id, ...input });
    } catch (error) {
      // Mauvais mot de passe actuel → 400 (jamais 401 : ne pas déconnecter la session).
      if (error instanceof InvalidCredentialsError) {
        throw new BadRequestException("Mot de passe actuel incorrect.");
      }
      throw error;
    }
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    if (request.authToken) await this.sessions.revoke(request.authToken);
    clearSessionCookie(response, this.isProduction);
  }

  private toSession(result: AuthResult, response: Response): AuthSession {
    setSessionCookie(response, result.token, result.expiresAt, this.isProduction);
    return {
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
    };
  }
}
