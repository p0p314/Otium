import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  type AuthSession,
  type AuthUser,
  LoginInput,
  RegisterInput,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import type { AuthResult } from "../application/auth-result";
import { EmailAlreadyUsedError, InvalidCredentialsError } from "../application/errors";
import { LoginUserUseCase } from "../application/login-user.usecase";
import { RegisterUserUseCase } from "../application/register-user.usecase";
import { SESSION_STORE, type SessionStore } from "../domain/ports/session-store";
import { AuthGuard, type AuthenticatedUser, type RequestWithUser } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
  ) {}

  @Post("register")
  async register(
    @Body(new ZodValidationPipe(RegisterInput)) input: RegisterInput,
  ): Promise<AuthSession> {
    try {
      return this.toSession(await this.registerUser.execute(input));
    } catch (error) {
      if (error instanceof EmailAlreadyUsedError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(LoginInput)) input: LoginInput): Promise<AuthSession> {
    try {
      return this.toSession(await this.loginUser.execute(input));
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

  @Post("logout")
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(@Req() request: RequestWithUser): Promise<void> {
    if (request.authToken) await this.sessions.revoke(request.authToken);
  }

  private toSession(result: AuthResult): AuthSession {
    return {
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
    };
  }
}
