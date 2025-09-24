import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

const timestamp = Date.now();

export const getAdminUser = () => {
  return {
    email: `admin-${timestamp}@example.com`,
    password: 'TestPass123!',
    name: `Admin ${timestamp}`,
    role: 'admin',
  };
};

export const getNormalUser = () => {
  return {
    email: `user-${timestamp}@example.com`,
    password: 'User123!',
    name: `User ${timestamp}`,
    role: 'user',
  };
};

export const getUserToken = async (
  app: INestApplication<App>,
  email: string,
  password: string,
) => {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });
  return response.body.access_token;
};
