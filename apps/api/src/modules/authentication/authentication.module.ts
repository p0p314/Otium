import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { LoginUserUseCase } from "./application/login-user.usecase";
import { RegisterUserUseCase } from "./application/register-user.usecase";
import { PASSWORD_HASHER } from "./domain/ports/password-hasher";
import { SESSION_STORE } from "./domain/ports/session-store";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { RedisSessionStore } from "./infrastructure/redis-session-store";
import { AuthController } from "./presentation/auth.controller";
import { AuthGuard } from "./presentation/auth.guard";

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    AuthGuard,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: SESSION_STORE, useClass: RedisSessionStore },
  ],
  // Exporté pour que d'autres modules (library…) puissent protéger leurs routes.
  // On ré-exporte UserModule pour que l'AuthGuard résolve USER_REPOSITORY chez l'importateur.
  exports: [AuthGuard, SESSION_STORE, UserModule],
})
export class AuthenticationModule {}
