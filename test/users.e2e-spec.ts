import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  getAdminUser,
  getNormalUser,
  getUserToken,
  createUserAndGetToken,
} from './helpers/auth-helper';

describe('User Management E2E', () => {
  let app: INestApplication<App>;
  let adminUser: any;
  let normalUser: any;
  let adminToken: string;
  let userToken: string;
  let createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    adminUser = getAdminUser();
    normalUser = getNormalUser();

    const adminResult = await createUserAndGetToken(app, adminUser);
    adminToken = adminResult.token;
    createdUserIds.push(adminResult.user._id);

    const userResult = await createUserAndGetToken(app, normalUser);
    userToken = userResult.token;
    createdUserIds.push(userResult.user._id);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      try {
        await request(app.getHttpServer()).delete(`/users/${userId}`);
      } catch (error) {}
    }

    await app.close();
  });

  describe('Authentication Flow', () => {
    it('should register new user successfully', async () => {
      const testUser = {
        name: 'Test User Registration',
        email: `test-reg-${Date.now()}@example.com`,
        password: 'TestPass123!',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.name).toBe(testUser.name);
      expect(response.body.role).toBe(testUser.role);
      expect(response.body.password).toBeUndefined();

      createdUserIds.push(response.body._id);
    });

    it('should login and access protected profile route', async () => {
      const testUser = {
        name: 'Login Test User',
        email: `login-test-${Date.now()}@example.com`,
        password: 'LoginTest123!',
        role: 'user',
      };

      const regResponse = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      createdUserIds.push(regResponse.body._id);

      const token = await getUserToken(app, testUser.email, testUser.password);
      expect(token).toBeDefined();

      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.sub).toBe(testUser.email);
      expect(profileResponse.body.role).toBe(testUser.role);
    });

    it('should reject login with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        })
        .expect(404);
    });

    it('should reject access to protected route without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('User CRUD Operations', () => {
    let testUserId: string;

    beforeAll(async () => {
      const testUser = {
        name: 'CRUD Test User',
        email: `crud-test-${Date.now()}@example.com`,
        password: 'CrudTest123!',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      testUserId = response.body._id;
      createdUserIds.push(testUserId);
    });

    it('should get user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .expect(200);

      expect(response.body._id).toBe(testUserId);
      expect(response.body.password).toBeUndefined();
    });

    it('should get user by email', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/email/${normalUser.email}`)
        .expect(200);

      expect(response.body.email).toBe(normalUser.email);
      expect(response.body.password).toBeUndefined();
    });

    it('should get all users with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should update user information', async () => {
      const updateData = {
        name: 'Updated Name',
        email: `updated-${Date.now()}@example.com`,
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
      expect(response.body.password).toBeUndefined();
    });

    it('should delete user', async () => {
      const deleteUser = {
        name: 'Delete Test User',
        email: `delete-test-${Date.now()}@example.com`,
        password: 'DeleteTest123!',
        role: 'user',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(deleteUser)
        .expect(201);

      const deleteUserId = createResponse.body._id;

      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/users/${deleteUserId}`)
        .expect(404);
    });
  });

  describe('Validation Tests', () => {
    it('should reject registration with duplicate email', async () => {
      const duplicateUser = {
        name: 'Duplicate User',
        email: adminUser.email,
        password: 'DuplicateTest123!',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(duplicateUser)
        .expect(409);

      expect(response.body.message).toContain(
        'User with this email already exists',
      );
    });

    it('should reject operations with invalid user ID format', async () => {
      const invalidId = 'invalid-id-format';

      await request(app.getHttpServer()).get(`/users/${invalidId}`).expect(400);

      await request(app.getHttpServer())
        .put(`/users/${invalidId}`)
        .send({ name: 'Test' })
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/users/${invalidId}`)
        .expect(400);
    });

    it('should reject operations on non-existent user', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .expect(404);

      await request(app.getHttpServer())
        .put(`/users/${nonExistentId}`)
        .send({ name: 'Test' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/users/${nonExistentId}`)
        .expect(404);
    });

    it('should reject update with duplicate email', async () => {
      const user1 = {
        name: 'User One',
        email: `user1-${Date.now()}@example.com`,
        password: 'UserOne123!',
        role: 'user',
      };

      const user2 = {
        name: 'User Two',
        email: `user2-${Date.now()}@example.com`,
        password: 'UserTwo123!',
        role: 'user',
      };

      const response1 = await request(app.getHttpServer())
        .post('/users')
        .send(user1)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/users')
        .send(user2)
        .expect(201);

      createdUserIds.push(response1.body._id, response2.body._id);

      const updateResponse = await request(app.getHttpServer())
        .put(`/users/${response2.body._id}`)
        .send({ email: user1.email })
        .expect(409);

      expect(updateResponse.body.message).toContain(
        'User with this email already exists',
      );
    });
  });

  describe('Password Security', () => {
    it('should hash passwords before storing', async () => {
      const testUser = {
        name: 'Password Test User',
        email: `pwd-test-${Date.now()}@example.com`,
        password: 'PlainTextPassword123!',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      createdUserIds.push(response.body._id);

      expect(response.body.password).toBeUndefined();

      const token = await getUserToken(app, testUser.email, testUser.password);
      expect(token).toBeDefined();
    });

    it('should update password securely', async () => {
      const testUser = {
        name: 'Password Update User',
        email: `pwd-update-${Date.now()}@example.com`,
        password: 'OldPassword123!',
        role: 'user',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      createdUserIds.push(createResponse.body._id);

      const newPassword = 'NewPassword123!';
      await request(app.getHttpServer())
        .put(`/users/${createResponse.body._id}`)
        .send({ password: newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      const token = await getUserToken(app, testUser.email, newPassword);
      expect(token).toBeDefined();
    });
  });

  describe('Role Management', () => {
    it('should create users with different roles', async () => {
      const adminUser = {
        name: 'Role Test Admin',
        email: `role-admin-${Date.now()}@example.com`,
        password: 'AdminRole123!',
        role: 'admin',
      };

      const regularUser = {
        name: 'Role Test User',
        email: `role-user-${Date.now()}@example.com`,
        password: 'UserRole123!',
        role: 'user',
      };

      const adminResponse = await request(app.getHttpServer())
        .post('/users')
        .send(adminUser)
        .expect(201);

      const userResponse = await request(app.getHttpServer())
        .post('/users')
        .send(regularUser)
        .expect(201);

      expect(adminResponse.body.role).toBe('admin');
      expect(userResponse.body.role).toBe('user');

      createdUserIds.push(adminResponse.body._id, userResponse.body._id);
    });

    it('should default to user role when not specified', async () => {
      const userWithoutRole = {
        name: 'Default Role User',
        email: `default-role-${Date.now()}@example.com`,
        password: 'DefaultRole123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(userWithoutRole)
        .expect(201);

      expect(response.body.role).toBe('user');
      createdUserIds.push(response.body._id);
    });

    it('should update user role', async () => {
      const testUser = {
        name: 'Role Update User',
        email: `role-update-${Date.now()}@example.com`,
        password: 'RoleUpdate123!',
        role: 'user',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      createdUserIds.push(createResponse.body._id);

      const updateResponse = await request(app.getHttpServer())
        .put(`/users/${createResponse.body._id}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(updateResponse.body.role).toBe('admin');
    });
  });
});
