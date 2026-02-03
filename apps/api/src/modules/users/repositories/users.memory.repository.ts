import { randomUUID } from 'node:crypto';
import type { UsersRepository } from './users.repository';
import type { UserDTO } from '../dto/user.dto';

export class UsersMemoryRepository implements UsersRepository {
  private items = new Map<string, UserDTO>();

  async findById(id: string) {
    return this.items.get(id) ?? null;
  }

  async findByEmail(email: string) {
    for (const u of this.items.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  async create(input: { email: string; nickname: string }) {
    const user: UserDTO = {
      id: randomUUID(),
      email: input.email,
      nickname: input.nickname,
      createdAt: Date.now(),
    };
    this.items.set(user.id, user);
    return user;
  }
}
