import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';

let prisma: PrismaService;

describe('Users (e2e)', () => {
  let app: INestApplication;
  let testEmail: string;

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
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    testEmail = `${Date.now()}@bb.com`;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users creates user', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: testEmail, nickname: 'neo', password: 'password123' })
      .expect(201);

    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.id).toBeTruthy();
  });

  it('POST /users duplicate email -> 409 with formatted error', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: testEmail, nickname: 'n1', password: 'password123' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: testEmail, nickname: 'n2', password: 'password123' })
      .expect(409);

    expect(res.body.error).toBeTruthy();
    expect(res.body.error.status).toBe(409);
  });
});
