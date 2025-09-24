// For E2E tests, you'll use a library like supertest to make real HTTP requests to your running application, which should be connected to a separate test database.

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';

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
    const timestamp = Date.now();
    const newUser = {
      email: `test-user-${timestamp}@example.com`,
      password: 'TestPass123!',
      name: `Test User ${timestamp}`,
      role: 'admin',
    };

    const response = await request(app.getHttpServer())
      .post('/users')
      .send(newUser);
    expect(response.status).toBe(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: newUser.email,
        password: newUser.password,
      });
    expect(loginResponse.status).toBe(201);

    const token = loginResponse.body.access_token;
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
