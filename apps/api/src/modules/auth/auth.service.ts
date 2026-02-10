import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import type { UserDTO } from '../users/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private signAccessToken(user: { id: string; email: string }) {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  private toUserDTO(u: any): UserDTO {
    return {
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      createdAt: u.createdAt.getTime(),
    };
  }

  async register(input: { email: string; nickname: string; password: string }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (exists) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const u = await this.prisma.user.create({
      data: { email: input.email, nickname: input.nickname, passwordHash },
    });
    return {
      user: this.toUserDTO(u),
      accessToken: this.signAccessToken({ id: u.id, email: u.email }),
    };
  }

  async login(input: { email: string; password: string }) {
    const u = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!u) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const ok = await bcrypt.compare(input.password, u.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return {
      user: this.toUserDTO(u),
      accessToken: this.signAccessToken({ id: u.id, email: u.email }),
    };
  }
}
