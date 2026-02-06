import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';

let prisma: PrismaService;

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users creates user', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'a@b.com', nickname: 'neo' })
      .expect(201);

    expect(res.body.data.email).toBe('a@b.com');
    expect(res.body.data.id).toBeTruthy();
  });

  it('POST /users duplicate email -> 409 with formatted error', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'dup@b.com', nickname: 'n1' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'dup@b.com', nickname: 'n2' })
      .expect(409);

    expect(res.body.error).toBeTruthy();
    expect(res.body.error.status).toBe(409);
  });
});
