import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { readCookiePair } from './helpers/cookie';

describe('Refresh Token Rotation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testEmail: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    testEmail = `${Date.now()}@bb.com`;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('refresh rotates token: old refresh becomes invalid', async () => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        nickname: 'neo',
        password: 'password123',
      })
      .expect(201);

    const oldCookie = readCookiePair(reg.headers['set-cookie']);
    expect(oldCookie).toBeTruthy();

    const refresh1 = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldCookie)
      .send({})
      .expect(201);

    const newCookie = readCookiePair(refresh1.headers['set-cookie']);
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(oldCookie);

    // old refresh should now fail
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldCookie)
      .send({})
      .expect(401);

    // new refresh should work
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', newCookie)
      .send({})
      .expect(201);
  });

  it('logout revokes refresh token', async () => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, nickname: 'neo', password: 'password123' })
      .expect(201);

    const cookie = readCookiePair(reg.headers['set-cookie']);
    expect(cookie).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .send({})
      .expect(401);
  });
});
