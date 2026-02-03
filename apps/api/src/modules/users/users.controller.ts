import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.users.createUser(dto);
    return { data: user };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const user = await this.users.getUser(id);
    return { data: user };
  }
}
