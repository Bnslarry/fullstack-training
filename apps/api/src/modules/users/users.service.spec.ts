import { UsersService } from './users.service';
import type { UsersRepository } from './repositories/users.repository';

function makeRepo(): UsersRepository {
  const items: any[] = [];
  return {
    async findById(id) {
      return items.find((x) => x.id === id) ?? null;
    },
    async findByEmail(email) {
      return items.find((x) => x.email === email) ?? null;
    },
    async create(input) {
      const u = {
        id: 'u1',
        email: input.email,
        nickname: input.nickname,
        createdAt: 1,
      };
      items.push(u);
      return u;
    },
  };
}

describe('UsersService', () => {
  it('throws conflict when email already used', async () => {
    const repo = makeRepo();
    const svc = new UsersService(repo as any);

    await svc.createUser({
      email: 'a@b.com',
      nickname: 'neo',
      password: 'password123',
    });
    await expect(
      svc.createUser({
        email: 'a@b.com',
        nickname: 'neo2',
        password: 'password123',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
