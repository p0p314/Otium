import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { AddMediaToLibraryUseCase } from "./application/add-media-to-library.usecase";
import { GetLibraryUseCase } from "./application/get-library.usecase";
import { RemoveFromLibraryUseCase } from "./application/remove-from-library.usecase";
import { ToggleFavoriteUseCase } from "./application/toggle-favorite.usecase";
import { LIBRARY_REPOSITORY } from "./domain";
import { PrismaLibraryRepository } from "./infrastructure/prisma-library.repository";
import { LibraryController } from "./presentation/library.controller";

@Module({
  imports: [AuthenticationModule], // fournit AuthGuard
  controllers: [LibraryController],
  providers: [
    GetLibraryUseCase,
    AddMediaToLibraryUseCase,
    RemoveFromLibraryUseCase,
    ToggleFavoriteUseCase,
    { provide: LIBRARY_REPOSITORY, useClass: PrismaLibraryRepository },
  ],
})
export class LibraryModule {}
