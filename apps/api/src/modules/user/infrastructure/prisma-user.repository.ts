import { Injectable } from "@nestjs/common";
import type { User as PrismaUser } from "@prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { Email, User, type UserRepository } from "../domain";

/** Adapter Prisma du port `UserRepository`. Convertit lignes SQL ↔ entité domaine. */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.value } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email: email.value } });
    return count > 0;
  }

  async create(user: User): Promise<User> {
    const row = await this.prisma.user.create({
      data: {
        email: user.email.value,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: PrismaUser): User {
    return User.rehydrate(row.id, {
      email: Email.create(row.email),
      passwordHash: row.passwordHash,
      displayName: row.displayName,
    });
  }
}
