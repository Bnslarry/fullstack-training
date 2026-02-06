import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { USERS_REPOSITORY } from './repositories/users.repository';
import { UsersPrismaRepository } from './repositories/users.prisma.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersPrismaRepository,
    {
      provide: USERS_REPOSITORY,
      useClass: UsersPrismaRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
