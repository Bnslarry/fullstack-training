import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { before } from 'node:test';

describe('Refresh Token Rotation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('refresh rotates token: old refresh becomes invalid', async () => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'a@b.com',
        nickName: 'neo',
        password: 'password123',
      })
      .expect(201);

    const r1 = reg.body.meta.refreshToken as string;

    const refresh1 = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: r1 })
      .expect(201);

    const r2 = refresh1.body.meta.refreshToken as string;
    expect(r2).toBeTruthy();
    expect(r2).not.toBe(r1);

    // old refresh should now fail
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: r1 })
      .expect(401);

    // new refresh should work
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: r2 })
      .expect(201);
  });

  it('logout revokes refresh token', async () => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@b.com', nickname: 'neo', password: 'password123' })
      .expect(201);

    const r1 = reg.body.meta.refreshToken as string;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: r1 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: r1 })
      .expect(401);
  });
});
