import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { getAdminUser, getUserToken } from './helpers/auth-helper';

describe('Full Authentication Flow', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should be able to register, log in, and access a protected route', async () => {
    const newUser = getAdminUser();

    const response = await request(app.getHttpServer())
      .post('/users')
      .send(newUser);
    expect(response.status).toBe(201);

    const loginResponse = await getUserToken(
      app,
      newUser.email,
      newUser.password,
    );
    expect(loginResponse).toBeDefined();

    const token = loginResponse;
    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.sub).toBe(newUser.email);
    expect(profileResponse.body.role).toBe(newUser.role);
  });

  afterEach(async () => {
    await app.close();
  });
});
