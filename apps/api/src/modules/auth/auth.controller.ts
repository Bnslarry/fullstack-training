import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { user, accessToken } = await this.auth.register(dto);
    return { data: { user }, meta: { accessToken } };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { user, accessToken } = await this.auth.login(dto);
    return { data: { user }, meta: { accessToken } };
  }
}
