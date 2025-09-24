// E2E User Management Tests
// Testing user registration, authentication, CRUD operations, and validation
// Covers the complete user lifecycle from registration to deletion

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

    // Setup test users for operations that require existing users
    adminUser = getAdminUser();
    normalUser = getNormalUser();

    // Create admin user for admin operations
    const adminResult = await createUserAndGetToken(app, adminUser);
    adminToken = adminResult.token;
    createdUserIds.push(adminResult.user._id);

    // Create normal user for regular operations
    const userResult = await createUserAndGetToken(app, normalUser);
    userToken = userResult.token;
    createdUserIds.push(userResult.user._id);
  });

  afterAll(async () => {
    // Cleanup created users
    for (const userId of createdUserIds) {
      try {
        await request(app.getHttpServer()).delete(`/users/${userId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
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
      expect(response.body.password).toBeUndefined(); // Password should not be returned

      createdUserIds.push(response.body._id);
    });

    it('should login and access protected profile route', async () => {
      // Create a fresh user for this test
      const testUser = {
        name: 'Login Test User',
        email: `login-test-${Date.now()}@example.com`,
        password: 'LoginTest123!',
        role: 'user',
      };

      // Register user
      const regResponse = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      createdUserIds.push(regResponse.body._id);

      // Login and get token
      const token = await getUserToken(app, testUser.email, testUser.password);
      expect(token).toBeDefined();

      // Access protected profile route
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.sub).toBe(testUser.email);
      expect(profileResponse.body.role).toBe(testUser.role);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
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
      // Create a user for CRUD operations
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

    it('should get user count', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThan(0);
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
      // Create a user specifically for deletion
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

      // Delete the user
      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .expect(200);

      // Verify user is deleted
      await request(app.getHttpServer())
        .get(`/users/${deleteUserId}`)
        .expect(404);
    });
  });

  describe('Validation Tests', () => {
    it('should reject registration with duplicate email', async () => {
      const duplicateUser = {
        name: 'Duplicate User',
        email: adminUser.email, // Use existing email
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

    it('should reject registration with invalid password', async () => {
      const invalidPasswordUser = {
        name: 'Invalid Password User',
        email: `invalid-pwd-${Date.now()}@example.com`,
        password: 'weak', // Doesn't meet complexity requirements
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidPasswordUser)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Password must contain at least one uppercase letter',
          ),
        ]),
      );
    });

    it('should reject registration with invalid email format', async () => {
      const invalidEmailUser = {
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'ValidPass123!',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidEmailUser)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('email must be an email'),
        ]),
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
      const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist

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
      // Create two users
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

      // Try to update user2 with user1's email
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

      // Password should not be returned in response
      expect(response.body.password).toBeUndefined();

      // Should be able to login with original password
      const token = await getUserToken(app, testUser.email, testUser.password);
      expect(token).toBeDefined();
    });

    it('should update password securely', async () => {
      // Create user
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

      // Update password
      const newPassword = 'NewPassword123!';
      await request(app.getHttpServer())
        .put(`/users/${createResponse.body._id}`)
        .send({ password: newPassword })
        .expect(200);

      // Should not be able to login with old password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // Should be able to login with new password
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
        // role not specified
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(userWithoutRole)
        .expect(201);

      expect(response.body.role).toBe('user');
      createdUserIds.push(response.body._id);
    });

    it('should update user role', async () => {
      // Create regular user
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

      // Update to admin role
      const updateResponse = await request(app.getHttpServer())
        .put(`/users/${createResponse.body._id}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(updateResponse.body.role).toBe('admin');
    });
  });
});
