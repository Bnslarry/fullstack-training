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
  input: { title: string; body: string; tagList?: string[] },
) {
  const res = await request(app.getHttpServer())
    .post('/articles')
    .set('Authorization', `Bearer ${token}`)
    .send(input)
    .expect(201);
  return res.body.data as { slug: string; tagList: string[] };
}

describe('Tags (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testEmail: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    testEmail = `${Date.now()}@tags.com`;
  });

  afterEach(async () => {
    await prisma.articleTag.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('创建文章时 tagList 会规范化，GET /articles/:slug 返回规范化后的 tagList', async () => {
    const token = await register(app, testEmail);
    const created = await createArticle(app, token, {
      title: `tag-create-${Date.now()}`,
      body: 'body',
      tagList: ['JavaScript', ' node '],
    });

    expect(created.tagList).toEqual(['javascript', 'node']);

    const res = await request(app.getHttpServer())
      .get(`/articles/${created.slug}`)
      .expect(200);

    expect(res.body.data.tagList).toEqual(['javascript', 'node']);
  });

  it('PATCH /articles/:slug 传新 tagList 覆盖更新', async () => {
    const token = await register(app, testEmail);
    const created = await createArticle(app, token, {
      title: `tag-update-${Date.now()}`,
      body: 'body',
      tagList: ['javascript', 'node'],
    });

    const patchRes = await request(app.getHttpServer())
      .patch(`/articles/${created.slug}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagList: [' DB ', 'db'] })
      .expect(200);

    expect(patchRes.body.data.tagList).toEqual(['db']);
    expect(patchRes.body.data.tagList).not.toContain('javascript');
    expect(patchRes.body.data.tagList).not.toContain('node');

    const getRes = await request(app.getHttpServer())
      .get(`/articles/${created.slug}`)
      .expect(200);

    expect(getRes.body.data.tagList).toEqual(['db']);
    expect(getRes.body.data.tagList).not.toContain('javascript');
    expect(getRes.body.data.tagList).not.toContain('node');
  });

  it('GET /articles?tag=db 只返回该 tag 文章，且 total=1', async () => {
    const token = await register(app, testEmail);

    await createArticle(app, token, {
      title: `tag-filter-hit-${Date.now()}`,
      body: 'body',
      tagList: ['db', 'misc'],
    });
    await createArticle(app, token, {
      title: `tag-filter-miss-${Date.now()}`,
      body: 'body',
      tagList: ['other'],
    });

    const res = await request(app.getHttpServer())
      .get('/articles?tag=db')
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].tagList).toContain('db');
    expect(res.body.data.items[0].title).toContain('tag-filter-hit');
  });

  it('GET /tags 返回已出现过的标签集合（至少包含新建标签）', async () => {
    const token = await register(app, testEmail);
    const tagA = `all-${Date.now()}-a`;
    const tagB = `all-${Date.now()}-b`;

    await createArticle(app, token, {
      title: `tags-list-${Date.now()}`,
      body: 'body',
      tagList: [tagA, tagB],
    });

    const res = await request(app.getHttpServer()).get('/tags').expect(200);

    expect(res.body.data.tags).toEqual(expect.arrayContaining([tagA, tagB]));
  });
});
