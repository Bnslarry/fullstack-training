import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { USERS_REPOSITORY } from './repositories/users.repository';
import { UsersMemoryRepository } from './repositories/users.memory.repository';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: UsersMemoryRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
