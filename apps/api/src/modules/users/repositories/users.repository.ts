import type { UserDTO } from '../dto/user.dto';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepository {
  findById(id: string): Promise<UserDTO | null>;
  findByEmail(email: string): Promise<UserDTO | null>;
  create(input: {
    email: string;
    nickname: string;
    passwordHash: string;
  }): Promise<UserDTO>;
}
