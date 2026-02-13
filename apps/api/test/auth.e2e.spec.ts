import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: 'a@b.com' } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('register -> returns accessToken and user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@b.com', nickname: 'neo', password: 'password123' })
      .expect(201);

    expect(res.body.meta.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('a@b.com');
  });

  it('login -> me', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@b.com', nickname: 'neo', password: 'password123' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'password123' })
      .expect(201);

    const token = login.body.meta.accessToken;

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body.data.user.email).toBe('a@b.com');
  });

  it('me without token -> 401', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });
});
