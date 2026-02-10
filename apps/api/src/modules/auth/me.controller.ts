import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Controller()
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() u: { userId: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: u.userId },
    });
    return {
      data: {
        user: user
          ? {
              id: user.id,
              email: user.email,
              nickname: user.nickname,
              createdAt: user.createdAt.getTime(),
            }
          : null,
      },
    };
  }
}
