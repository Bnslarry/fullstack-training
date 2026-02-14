import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function register(app: INestApplication, email: string) {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, nickname: 'n', password: 'password123' })
    .expect(201);
  return res.body.meta.accessToken as string;
}

async function createArticle(
  app: INestApplication,
  token: string,
  title: string,
  body: string,
) {
  return await request(app.getHttpServer())
    .post('/articles')
    .set('Authorization', `Bearer ${token}`)
    .send({ title, body })
    .expect(201);
}

describe('Articles list (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testEmailA: string;
  let testEmailB: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    testEmailA = `${Date.now()}A@articles.com`;
    testEmailB = `${Date.now()}B@articles.com`;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: testEmailA } });
    await prisma.user.deleteMany({ where: { email: testEmailB } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports pagination, author filter, and q search; includes author info', async () => {
    const token1 = await register(app, testEmailA);
    const token2 = await register(app, testEmailB);

    await createArticle(app, token1, 'Hello One', 'body a1');
    await createArticle(app, token1, 'Hello Two', 'body a2');
    await createArticle(app, token1, 'Other', 'zzz');
    await createArticle(app, token2, 'B Title', 'hello in body');

    const page1 = await request(app.getHttpServer())
      .get('/articles?page=1&pageSize=2')
      .expect(200);

    expect(page1.body.data.items.length).toBe(2);
    expect(page1.body.data.total).toBe(4);
    expect(page1.body.data.items[0].author.email).toBeTruthy();

    const byA = await request(app.getHttpServer())
      .get(`/articles?author=${testEmailA}`)
      .expect(200);

    expect(byA.body.data.items.length).toBe(3);
    for (const it of byA.body.data.items) {
      expect(it.author.email).toBe(testEmailA);
      expect(it.author.nickname).toBe('n');
    }

    const q1 = await request(app.getHttpServer())
      .get('/articles?q=hello')
      .expect(200);

    expect(q1.body.data.total).toBeGreaterThanOrEqual(3);
    for (const it of q1.body.data.items) {
      expect(it.author).toBeTruthy();
      expect(it.author.email).toBeTruthy();
    }
  });
});
