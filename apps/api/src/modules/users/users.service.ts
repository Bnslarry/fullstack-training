import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly repo: UsersRepository,
  ) {}

  async getUser(id: string) {
    return this.repo.findById(id);
  }

  async createUser(input: {
    email: string;
    nickname: string;
    password: string;
  }) {
    const exists = await this.repo.findByEmail(input.email);
    if (exists) {
      throw new ConflictException('User with this email already exists');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.repo.create({
      email: input.email,
      nickname: input.nickname,
      passwordHash,
    });
  }
}
