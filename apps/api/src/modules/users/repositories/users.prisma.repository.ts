import { Injectable } from '@nestjs/common';
import type { UsersRepository } from './users.repository';
import type { UserDTO } from '../dto/user.dto';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class UsersPrismaRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDTO(u: {
    id: string;
    email: string;
    nickname: string;
    createdAt: Date;
  }): UserDTO {
    return {
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      createdAt: u.createdAt.getTime(),
    };
  }

  async findById(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    return u ? this.toDTO(u) : null;
  }

  async findByEmail(email: string) {
    const u = await this.prisma.user.findUnique({ where: { email } });
    return u ? this.toDTO(u) : null;
  }

  async create(input: { email: string; nickname: string }) {
    const u = await this.prisma.user.create({ data: input });
    return this.toDTO(u);
  }
}
