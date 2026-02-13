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

describe('Articles (e2e)', () => {
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

  it('create -> get -> update -> delete (author only)', async () => {
    const token1 = await register(app, testEmailA);
    const token2 = await register(app, testEmailB);

    const created = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Hello World', description: 'd', body: 'content' })
      .expect(201);

    const slug = created.body.data.slug as string;
    expect(slug).toBeTruthy();

    await request(app.getHttpServer()).get(`/articles/${slug}`).expect(200);

    await request(app.getHttpServer())
      .patch(`/articles/${slug}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ body: 'hacked' })
      .expect(403);

    const updated = await request(app.getHttpServer())
      .patch(`/articles/${slug}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ body: 'updated' })
      .expect(200);

    expect(updated.body.data.body).toBe('updated');

    await request(app.getHttpServer())
      .delete(`/articles/${slug}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    await request(app.getHttpServer()).get(`/articles/${slug}`).expect(404);
  });

  it('create without auth -> 401', async () => {
    await request(app.getHttpServer())
      .post('/articles')
      .send({ title: 'No Auth', body: 'x' })
      .expect(401);
  });
});
