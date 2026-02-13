import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { readCookiePair } from './helpers/cookie';

describe('Auth refresh cookie (e2e)', () => {
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
    testEmail = `${Date.now()}@cookie.com`;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('register sets refresh_token cookie, refresh rotates cookie, logout clears cookie', async () => {
    const agent = request.agent(app.getHttpServer());

    const reg = await agent
      .post('/auth/register')
      .send({ email: testEmail, nickname: 'neo', password: 'password123' })
      .expect(201);

    const cookieFromRegister = readCookiePair(reg.headers['set-cookie']);
    expect(cookieFromRegister).toBeTruthy();
    expect(reg.body.meta.accessToken).toBeTruthy();

    const refresh = await agent.post('/auth/refresh').send({}).expect(201);
    const cookieFromRefresh = readCookiePair(refresh.headers['set-cookie']);
    expect(cookieFromRefresh).toBeTruthy();
    expect(cookieFromRefresh).not.toBe(cookieFromRegister);
    expect(refresh.body.meta.accessToken).toBeTruthy();

    const logout = await agent.post('/auth/logout').send({}).expect(201);
    expect(logout.body.data.ok).toBe(true);

    await agent.post('/auth/refresh').send({}).expect(401);
  });
});
