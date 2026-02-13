import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArticlesModule } from './modules/articles/articles.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ArticlesModule],
})
export class AppModule {}
