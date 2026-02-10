import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { JwtStrategy } from './jwt/jwt.strategy';
import { MeController } from './me.controller';

const resolveJwtExpiresIn = (): JwtSignOptions['expiresIn'] => {
  const value = process.env.JWT_EXPIRES_IN;
  if (value && isValidJwtDuration(value)) {
    return value;
  }
  return '15m';
};

const isValidJwtDuration = (
  value: string,
): value is Extract<NonNullable<JwtSignOptions['expiresIn']>, string> => {
  const durationPattern = /^\d+(?:\.\d+)?(?:\s?(?:ms|s|m|h|d|w|y))?$/;
  return durationPattern.test(value);
};

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      signOptions: { expiresIn: resolveJwtExpiresIn() },
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
