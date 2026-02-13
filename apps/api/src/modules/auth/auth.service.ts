import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import type { UserDTO } from '../users/dto/user.dto';
import { randomBytes, createHash } from 'node:crypto';

function makeRefreshToken() {
  const token = randomBytes(48).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

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

  private refreshExpiresAt() {
    const days = Number(process.env.REFRESH_EXPIRES_DAYS || 7);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
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

    const { token: refreshToken, tokenHash } = makeRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: u.id,
        expiresAt: this.refreshExpiresAt(),
      },
    });

    return {
      user: this.toUserDTO(u),
      accessToken: this.signAccessToken({ id: u.id, email: u.email }),
      refreshToken,
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

    const { token: refreshToken, tokenHash } = makeRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: u.id,
        expiresAt: this.refreshExpiresAt(),
      },
    });

    return {
      user: this.toUserDTO(u),
      accessToken: this.signAccessToken({ id: u.id, email: u.email }),
      refreshToken,
    };
  }

  async refresh(input: { refreshToken: string }) {
    const tokenHash = createHash('sha256')
      .update(input.refreshToken)
      .digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored) throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    if (stored.revokedAt)
      throw new UnauthorizedException('REFRESH_TOKEN_REVOKED');
    if (stored.expiresAt.getTime() < Date.now())
      throw new UnauthorizedException('REFRESH_TOKEN_EXPIRED');

    // 取用户
    const u = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!u) throw new UnauthorizedException('USER_NOT_FOUND');

    // 轮换：撤销旧 token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // 生成新 token
    const { token: newRefreshToken, tokenHash: newHash } = makeRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: newHash,
        userId: u.id,
        expiresAt: this.refreshExpiresAt(),
      },
    });

    return {
      accessToken: this.signAccessToken({ id: u.id, email: u.email }),
      refreshToken: newRefreshToken,
    };
  }

  async logout(input: { refreshToken: string }) {
    const tokenHash = createHash('sha256')
      .update(input.refreshToken)
      .digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored) return { ok: true }; // 不泄漏信息

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}
