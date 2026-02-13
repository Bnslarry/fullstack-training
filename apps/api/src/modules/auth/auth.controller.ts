import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.register(dto);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { data: { user }, meta: { accessToken } };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.login(dto);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { data: { user }, meta: { accessToken } };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = (
      req as Omit<Request, 'cookies'> & { cookies?: Record<string, unknown> }
    ).cookies;
    const rt = cookies?.refresh_token;

    if (typeof rt !== 'string' || !rt.trim()) {
      throw new UnauthorizedException('MISSING_REFRESH_COOKIE');
    }

    const { accessToken, refreshToken: newRt } = await this.auth.refresh({
      refreshToken: rt,
    });

    res.cookie('refresh_token', newRt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { meta: { accessToken } };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (
      req as Omit<Request, 'cookies'> & { cookies?: Record<string, unknown> }
    ).cookies;
    const rt = cookies?.refresh_token;

    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/auth',
    });

    if (rt) await this.auth.logout({ refreshToken: rt as string });

    return { data: { ok: true } };
  }
}
