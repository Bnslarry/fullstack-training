import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { user, accessToken, refreshToken } = await this.auth.register(dto);
    return { data: { user }, meta: { accessToken, refreshToken } };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { user, accessToken, refreshToken } = await this.auth.login(dto);
    return { data: { user }, meta: { accessToken, refreshToken } };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const { accessToken, refreshToken } = await this.auth.refresh(dto);
    return { meta: { accessToken, refreshToken } };
  }

  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    const res = await this.auth.logout(dto);
    return { data: res };
  }
}
