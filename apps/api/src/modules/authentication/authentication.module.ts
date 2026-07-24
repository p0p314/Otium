import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { LoginUserUseCase } from "./application/login-user.usecase";
import { RegisterUserUseCase } from "./application/register-user.usecase";
import { UpdateProfileUseCase } from "./application/update-profile.usecase";
import { ChangePasswordUseCase } from "./application/change-password.usecase";
import { PASSWORD_HASHER } from "./domain/ports/password-hasher";
import { SESSION_STORE } from "./domain/ports/session-store";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { PrismaSessionStore } from "./infrastructure/prisma-session-store";
import { AuthController } from "./presentation/auth.controller";
import { AuthGuard } from "./presentation/auth.guard";

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    UpdateProfileUseCase,
    ChangePasswordUseCase,
    AuthGuard,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: SESSION_STORE, useClass: PrismaSessionStore },
  ],
  // Exporté pour que d'autres modules (library, account…) puissent protéger leurs routes
  // et réutiliser l'auth. On ré-exporte UserModule pour que l'AuthGuard (et le module
  // account) résolvent USER_REPOSITORY chez l'importateur.
  exports: [AuthGuard, SESSION_STORE, PASSWORD_HASHER, UserModule],
})
export class AuthenticationModule {}
